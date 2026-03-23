import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../../utils/whatsapp.service';
import { sendEmail } from '../../utils/email.service';
import { sendInstagramDM } from '../../utils/instagram.service';

// ─── RBAC helpers ────────────────────────────────────────────────────────────

const buildConversationWhere = async (user: any): Promise<any> => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PRINCIPAL_CONSULTANT') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    return {
      assignedToId: { in: [user.id, ...subAgents.map((a: any) => a.id)] },
    };
  }
  return { assignedToId: user.id };
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
  userId?: string
) => {
  // Look for an open conversation with the same channel + externalId
  const existing = await prisma.conversation.findFirst({
    where: { channel, externalId, status: 'OPEN' },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      channel,
      externalId,
      status: 'OPEN',
      contactId: contactId || null,
      assignedToId: userId || null,
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

  if (channel === 'WHATSAPP') {
    sendResult = await sendWhatsAppMessage(destination, content);
  } else if (channel === 'EMAIL') {
    sendResult = await sendEmail({
      to: destination,
      subject: subject || '(sem assunto)',
      html: `<p>${content.replace(/\n/g, '<br>')}</p>`,
      text: content,
    });
  } else if (channel === 'INSTAGRAM') {
    sendResult = await sendInstagramDM(destination, content);
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

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return { message, sendResult };
};

// ─── receiveInbound ───────────────────────────────────────────────────────────

export const receiveInbound = async (
  channel: string,
  externalId: string,
  content: string,
  metadata?: string
) => {
  const conversation = await createOrFind(channel, externalId);

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
    data: { lastMessageAt: new Date() },
  });

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
