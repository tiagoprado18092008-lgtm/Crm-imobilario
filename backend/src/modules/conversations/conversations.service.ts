import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../../utils/whatsapp.service';
import { sendEmail } from '../../utils/email.service';
import { sendInstagramDM } from '../../utils/instagram.service';
import { sendSMS } from '../../utils/twilio.service';
import { qualifyLeadFromMessage } from '../../utils/ai.service';
import { eventBus } from '../../utils/event-bus';
import { buildScope } from '../../lib/scope';

// ─── Phone normalisation ──────────────────────────────────────────────────────

function normalizeExternalId(externalId: string): string {
  const digits = externalId.replace(/\D/g, '');
  if (!digits) return externalId;
  return `+${digits}`;
}

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
  // Build phone variants so we match regardless of +351 prefix format
  const digits = externalId.replace(/\D/g, '')
  const externalIdVariants = digits
    ? [externalId, digits, `+${digits}`]
    : [externalId]
  if (digits.startsWith('351') && digits.length === 12) {
    const local = digits.slice(3)
    externalIdVariants.push(local, `+${local}`)
  }

  // Look for an open conversation with the same channel + externalId (scoped to location if provided)
  const existing = await prisma.conversation.findFirst({
    where: {
      channel,
      externalId: { in: externalIdVariants },
      status: 'OPEN',
      ...(locationId ? { locationId } : {}),
    },
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
      externalId: normalizeExternalId(externalId),
      status: 'OPEN',
      isRead: false,
      contactId: contactId || null,
      assignedToId: userId || null,
      locationId: resolvedLocationId,
      lastMessageAt: new Date(),
    },
  });
};

// ─── findOrReopenForInbound ───────────────────────────────────────────────────

export const findOrReopenForInbound = async (
  channel: string,
  externalId: string,
  contactId: string | undefined,
  locationId: string,
  assignedToId?: string,
) => {
  const canonical = normalizeExternalId(externalId);
  const digits = canonical.replace(/\D/g, '');
  const variants: string[] = digits ? [canonical, digits, externalId] : [externalId];
  if (digits.startsWith('351') && digits.length === 12) {
    const local = digits.slice(3);
    variants.push(local, `+${local}`);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.conversation.findFirst({
      where: {
        channel,
        externalId: { in: variants },
        locationId,
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (existing) {
      const needsUpdate = existing.status !== 'OPEN' || existing.externalId !== canonical || (contactId && !existing.contactId);
      if (needsUpdate) {
        console.log(`[Inbound] Reopened ${existing.status} conversation ${existing.id} for ${canonical}`);
        return tx.conversation.update({
          where: { id: existing.id },
          data: {
            status: 'OPEN',
            externalId: canonical,
            ...(contactId && !existing.contactId ? { contactId } : {}),
            ...(assignedToId && !existing.assignedToId ? { assignedToId } : {}),
          },
        });
      }
      return existing;
    }

    console.log(`[Inbound] Created new conversation for ${canonical} (channel: ${channel}, location: ${locationId})`);
    return tx.conversation.create({
      data: {
        channel,
        externalId: canonical,
        status: 'OPEN',
        isRead: false,
        contactId: contactId || null,
        locationId,
        lastMessageAt: new Date(),
        ...(assignedToId ? { assignedToId } : {}),
      },
    });
  }, { isolationLevel: 'Serializable' });
};

// ─── sendMessage ──────────────────────────────────────────────────────────────

export const sendMessage = async (
  conversationId: string,
  content: string,
  channel: string,
  userId: string,
  subject?: string,
  senderAgencyId?: string
) => {
  // Verify conversation exists AND belongs to sender's agency
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

  // Tenant check: sender must belong to same agency as the conversation
  if (senderAgencyId && conversation.location?.agencyId && conversation.location.agencyId !== senderAgencyId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  // Dispatch message via appropriate channel
  let sendResult: { success: boolean; messageId?: string; error?: string } = {
    success: false,
    error: 'Unknown channel',
  };

  const destination = conversation.externalId || '';

  const agencyId = senderAgencyId || (conversation as any).location?.agencyId;

  if (channel === 'WHATSAPP') {
    sendResult = await sendWhatsAppMessage(destination, content, agencyId, userId);
  } else if (channel === 'EMAIL') {
    const emailTo = conversation.contact?.email || '';
    if (!emailTo) {
      sendResult = { success: false, error: 'Contacto sem endereço de e-mail' };
    } else {
      try {
        sendResult = await sendEmail({
          to: emailTo,
          subject: subject || '(sem assunto)',
          html: `<p>${content.replace(/\n/g, '<br>')}</p>`,
          text: content,
        });
      } catch (emailErr: any) {
        console.error('[Email send error]', emailErr?.message);
        sendResult = { success: false, error: emailErr?.message || 'Erro ao enviar email' };
      }
    }
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
  agencyId?: string,
  assignedToId?: string,
) => {
  // Multi-tenant integrations (like per-agency WhatsApp sockets) MUST supply agencyId.
  // Without it, we cannot safely route the message — dropping it prevents cross-tenant leaks.
  if (!agencyId) {
    console.warn(`[Inbound] Ignored ${channel} message — no agencyId supplied (externalId=${externalId})`);
    return null;
  }

  const loc = await prisma.location.findFirst({ where: { agencyId }, select: { id: true } });
  const resolvedLocationId: string | null = loc?.id || null;
  if (!resolvedLocationId) {
    console.warn(`[Inbound] Ignored ${channel} message — agency ${agencyId} has no locations`);
    return null;
  }

  // Only process messages from existing contacts of THIS agency — unknown numbers ignored
  let resolvedContactId: string | undefined;
  try {
    if (channel === 'WHATSAPP' || channel === 'SMS') {
      const digits = externalId.replace(/\D/g, '')
      const withPlus = `+${digits}`
      const withoutPT = digits.startsWith('351') && digits.length === 12 ? digits.slice(3) : null
      const phoneVariants: string[] = [digits, withPlus, externalId]
      if (withoutPT) phoneVariants.push(withoutPT, `+${withoutPT}`)

      const contact = await prisma.contact.findFirst({
        where: {
          AND: [
            { OR: phoneVariants.flatMap(v => [{ phone: v }, { whatsapp: v }]) },
            { location: { agencyId } },
          ],
        },
      });
      if (!contact) {
        // Allow reply if there's already an outbound conversation with this number
        // on a location owned by this agency.
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            channel,
            externalId: { in: phoneVariants },
            location: { agencyId },
          },
        });
        if (!existingConversation) {
          console.log(`[Inbound] Ignored message from unknown number: ${externalId} (agency=${agencyId})`);
          return null;
        }
      } else {
        resolvedContactId = contact.id;
      }
    }
  } catch { /* non-critical */ }

  const conversation = await findOrReopenForInbound(channel, externalId, resolvedContactId, resolvedLocationId, assignedToId);

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

export const updateStatus = async (id: string, status: string, currentUser?: any) => {
  const allowed = ['OPEN', 'RESOLVED', 'ARCHIVED'];
  if (!allowed.includes(status)) {
    throw Object.assign(
      new Error(`Invalid status. Allowed: ${allowed.join(', ')}`),
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { location: { select: { agencyId: true } } },
  });
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  if (currentUser?.agencyId && conversation.location?.agencyId && conversation.location.agencyId !== currentUser.agencyId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  return prisma.conversation.update({ where: { id }, data: { status } });
};

// ─── assign ───────────────────────────────────────────────────────────────────

export const assign = async (id: string, assignedToId: string, currentUser?: any) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { location: { select: { agencyId: true } } },
  });
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { status: 404 });
  }

  if (currentUser?.agencyId && conversation.location?.agencyId && conversation.location.agencyId !== currentUser.agencyId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // Ensure assignee belongs to same agency
  if (currentUser?.agencyId && user.agencyId && user.agencyId !== currentUser.agencyId) {
    throw Object.assign(new Error('Cannot assign to user from another agency'), { status: 403 });
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
