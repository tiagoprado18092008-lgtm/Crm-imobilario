import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../../utils/whatsapp.service';
import { sendEmail } from '../../utils/email.service';
import { sendInstagramDM } from '../../utils/instagram.service';
import { sendSMS } from '../../utils/twilio.service';
import { qualifyLeadFromMessage } from '../../utils/ai.service';
import { eventBus } from '../../utils/event-bus';
import { buildScope } from '../../lib/scope';

// ─── RBAC helpers ────────────────────────────────────────────────────────────

const buildConversationWhere = async (user: any): Promise<any> => {
  const scope = await buildScope(user);
  // For conversations: also include unassigned ones for non-admin roles
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN' || user.role === 'LOCATION_ADMIN') {
    return scope;
  }
  // TEAM_LEADER / CONSULTANT / USER: include nulls
  if (scope.assignedToId) {
    return { OR: [scope, { assignedToId: null }] };
  }
  return scope;
};

// ─── list ─────────────────────────────────────────────────────────────────────

export const list = async (
  filters: {
    channel?: string;
    status?: string;
    contactId?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const baseWhere: any = await buildConversationWhere(user);

  if (filters.channel) baseWhere.channel = filters.channel;
  if (filters.status) baseWhere.status = filters.status;
  if (filters.contactId) baseWhere.contactId = filters.contactId;
  if (filters.assignedToId) baseWhere.assignedToId = filters.assignedToId;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, conversations] = await Promise.all([
    prisma.conversation.count({ where: baseWhere }),
    prisma.conversation.findMany({
      where: baseWhere,
      skip,
      take: limit,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            direction: true,
            content: true,
            createdAt: true,
            status: true,
          },
        },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  return { total, page, limit, data: conversations };
};

// ─── getById ──────────────────────────────────────────────────────────────────

export const getById = async (id: string, user: any) => {
  const baseWhere: any = await buildConversationWhere(user);

  const conversation = await prisma.conversation.findFirst({
    where: { id, ...baseWhere },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true, whatsapp: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sentBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  return conversation;
};

// ─── createOrFind ─────────────────────────────────────────────────────────────

export const createOrFind = async (
  channel: string,
  externalId: string,
  contactId?: string,
  userId?: string,
  locationId?: string
) => {
  // Look for an open conversation with the same channel + externalId (scoped to location if provided)
  const existing = await prisma.conversation.findFirst({
    where: { channel, externalId, status: 'OPEN', ...(locationId ? { locationId } : {}) },
  });

  if (existing) return existing;

  // Resolve locationId: use provided or fall back to first active location
  let resolvedLocationId = locationId || null;
  if (!resolvedLocationId) {
    const firstLocation = await prisma.location.findFirst({ select: { id: true } });
    resolvedLocationId = firstLocation?.id || null;
  }

  return prisma.conversation.create({
    data: {
      channel,
      externalId,
      status: 'OPEN',
      isRead: false,
      contactId: contactId || null,
      assignedToId: userId || null,
      locationId: resolvedLocationId,
      lastMessageAt: new Date(),
    },
  });
};

// ─── sendMessage ──────────────────────────────────────────────────────────────

export const sendMessage = async (
  conversationId: string,
  content: string,
  channel: string,
  userId: string,
  subject?: string
) => {
  // Verify conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contact: { select: { email: true, whatsapp: true, phone: true } },
      location: { select: { agencyId: true } },
    },
  });

  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  // Dispatch message via appropriate channel
  let sendResult: { success: boolean; messageId?: string; error?: string } = {
    success: false,
    error: 'Unknown channel',
  };

  const destination = conversation.externalId || '';

  const agencyId = (conversation as any).location?.agencyId;

  if (channel === 'WHATSAPP') {
    sendResult = await sendWhatsAppMessage(destination, content, agencyId);
  } else if (channel === 'EMAIL') {
    sendResult = await sendEmail({
      to: destination,
      subject: subject || '(sem assunto)',
      html: `<p>${content.replace(/\n/g, '<br>')}</p>`,
      text: content,
    });
  } else if (channel === 'INSTAGRAM') {
    sendResult = await sendInstagramDM(destination, content);
  } else if (channel === 'SMS') {
    try {
      const r = await sendSMS(destination, content);
      sendResult = { success: true, messageId: r.sid };
    } catch (e: any) {
      sendResult = { success: false, error: e.message };
    }
  } else if (channel === 'INTERNAL') {
    // Internal notes always succeed
    sendResult = { success: true, messageId: `internal_${Date.now()}` };
  }

  const messageStatus = sendResult.success ? 'SENT' : 'FAILED';

  // Persist message record
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: 'OUTBOUND',
      channel,
      content,
      subject: subject || null,
      status: messageStatus,
      externalId: sendResult.messageId || null,
      sentById: userId,
      metadata: sendResult.error
        ? JSON.stringify({ error: sendResult.error })
        : null,
    },
    include: {
      sentBy: { select: { id: true, name: true } },
    },
  });

  // Update conversation's lastMessageAt + lastMessageText
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), lastMessageText: content.substring(0, 100) },
  });

  // Broadcast real-time event
  eventBus.emit('new_message', { conversationId, message });

  return { message, sendResult };
};

// ─── receiveInbound ───────────────────────────────────────────────────────────

export const receiveInbound = async (
  channel: string,
  externalId: string,
  content: string,
  metadata?: string,
  agencyId?: string
) => {
  // Resolve locationId from agencyId
  let resolvedLocationId: string | null = null;
  if (agencyId) {
    const loc = await prisma.location.findFirst({ where: { agencyId }, select: { id: true } });
    resolvedLocationId = loc?.id || null;
  }
  if (!resolvedLocationId) {
    const loc = await prisma.location.findFirst({ select: { id: true } });
    resolvedLocationId = loc?.id || null;
  }

  // Auto-create or find a contact matching the sender, using profileName if available
  let resolvedContactId: string | undefined;
  try {
    const meta = metadata ? JSON.parse(metadata) : {};
    const profileName: string | undefined = meta.profileName;

    if (channel === 'WHATSAPP' || channel === 'SMS') {
      // externalId is the phone number
      const phone = externalId.startsWith('+') ? externalId : `+${externalId}`;
      let contact = await prisma.contact.findFirst({
        where: { OR: [{ phone }, { whatsapp: phone }, { phone: externalId }, { whatsapp: externalId }] },
      });
      if (!contact) {
        // Create a new contact automatically — use profileName or fall back to phone number
        const contactName = profileName || phone;
        const defaultUser = await prisma.user.findFirst({
          where: resolvedLocationId
            ? { locationId: resolvedLocationId }
            : { role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (defaultUser) {
          contact = await prisma.contact.create({
            data: {
              name: contactName,
              phone,
              whatsapp: phone,
              source: 'WHATSAPP_INBOUND',
              locationId: resolvedLocationId,
              assignedToId: defaultUser.id,
            },
          });
          console.log(`[Inbound] Auto-created contact: ${contactName} (${phone})`);
        }
      }
      if (contact) resolvedContactId = contact.id;
    }
  } catch { /* non-critical */ }

  const conversation = await createOrFind(channel, externalId, resolvedContactId, undefined, resolvedLocationId || undefined);

  // If we found/created a contact and the conversation didn't have one, link it
  if (resolvedContactId && !conversation.contactId) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { contactId: resolvedContactId },
    });
    conversation.contactId = resolvedContactId;
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      channel,
      content,
      status: 'DELIVERED',
      metadata: metadata || null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), lastMessageText: content.substring(0, 100), isRead: false },
  });

  // Broadcast real-time event
  eventBus.emit('new_message', { conversationId: conversation.id, message });

  // IA de Qualificação — extrai dados automaticamente de mensagens inbound
  if (conversation.contactId && content.length > 10) {
    qualifyLeadFromMessage(content, conversation.contactId).catch(err =>
      console.error('[AI Qualify] Error:', err)
    );
  }

  return { conversation, message };
};

// ─── updateStatus ─────────────────────────────────────────────────────────────

export const updateStatus = async (id: string, status: string) => {
  const allowed = ['OPEN', 'RESOLVED', 'ARCHIVED'];
  if (!allowed.includes(status)) {
    throw Object.assign(
      new Error(`Invalid status. Allowed: ${allowed.join(', ')}`),
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  return prisma.conversation.update({ where: { id }, data: { status } });
};

// ─── assign ───────────────────────────────────────────────────────────────────

export const assign = async (id: string, assignedToId: string) => {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return prisma.conversation.update({ where: { id }, data: { assignedToId } });
};

// ─── getStats ─────────────────────────────────────────────────────────────────

export const getStats = async (user: any) => {
  const baseWhere: any = await buildConversationWhere(user);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [total, open, resolved, channels] = await Promise.all([
    prisma.conversation.count({ where: baseWhere }),
    prisma.conversation.count({ where: { ...baseWhere, status: 'OPEN' } }),
    prisma.conversation.count({
      where: {
        ...baseWhere,
        status: 'RESOLVED',
        updatedAt: { gte: startOfToday, lt: endOfToday },
      },
    }),
    prisma.conversation.groupBy({
      by: ['channel'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const byChannel = channels.map((c: any) => ({
    channel: c.channel,
    count: c._count._all,
  }));

  return { total, open, resolved, resolvedToday: resolved, byChannel };
};

// ─── markAsRead ───────────────────────────────────────────────────────────────

export const markAsRead = async (id: string, user: any) => {
  const baseWhere: any = await buildConversationWhere(user);
  const conv = await prisma.conversation.findFirst({ where: { id, ...baseWhere } });
  if (!conv) throw Object.assign(new Error('Conversation not found'), { status: 404 });
  return prisma.conversation.update({ where: { id }, data: { isRead: true } });
};

// ─── toggleStar ───────────────────────────────────────────────────────────────

export const toggleStar = async (id: string, user: any) => {
  const baseWhere: any = await buildConversationWhere(user);
  const conv = await prisma.conversation.findFirst({ where: { id, ...baseWhere } });
  if (!conv) throw Object.assign(new Error('Conversation not found'), { status: 404 });
  return prisma.conversation.update({ where: { id }, data: { isStarred: !conv.isStarred } });
};

// ─── deleteConversation ───────────────────────────────────────────────────────

export const deleteConversation = async (id: string, user: any) => {
  const baseWhere: any = await buildConversationWhere(user);
  const conv = await prisma.conversation.findFirst({ where: { id, ...baseWhere } });
  if (!conv) throw Object.assign(new Error('Conversation not found'), { status: 404 });
  await prisma.message.deleteMany({ where: { conversationId: id } });
  await prisma.conversation.delete({ where: { id } });
};

// ─── getUnreadCount ───────────────────────────────────────────────────────────

export const getUnreadCount = async (user: any) => {
  const baseWhere: any = await buildConversationWhere(user);
  const count = await prisma.conversation.count({
    where: { ...baseWhere, isRead: false, status: 'OPEN' },
  });
  return { count };
};
