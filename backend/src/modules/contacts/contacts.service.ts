import prisma from '../../config/database';
import { fireTrigger } from '../../utils/automation.engine';

const calculateLeadScore = (contact: any, interactionCount: number): number => {
  let score = 0;
  if (contact.email) score += 20;
  if (contact.phone || contact.whatsapp) score += 20;
  if (contact.source === 'Indicação') score += 15;
  score += Math.min(interactionCount * 10, 30);
  if (contact.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(contact.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
};

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'ADMIN') {
    return {};
  }
  if (user.role === 'PRINCIPAL_CONSULTANT') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    const subAgentIds = subAgents.map((a) => a.id);
    return {
      assignedToId: { in: [user.id, ...subAgentIds] },
    };
  }
  // SUB_AGENT
  return { assignedToId: user.id };
};

export const list = async (
  filters: {
    search?: string;
    type?: string;
    status?: string;
    source?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { opportunities: true, interactions: true, tasks: true } },
      },
    }),
  ]);

  const contactsWithScore = contacts.map((c: any) => ({
    ...c,
    leadScore: calculateLeadScore(c, c._count?.interactions ?? 0),
  }));

  return { data: contactsWithScore, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (
  dto: {
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    status?: string;
    source?: string;
    notes?: string;
    preferences?: string;
    assignedToId?: string;
    city?: string;
    postalCode?: string;
    budget_min?: number;
    budget_max?: number;
    interest_type?: string;
    timeline?: string;
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
  },
  userId: string
) => {
  const contact = await prisma.contact.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      type: (dto.type as any) ?? 'LEAD',
      status: (dto.status as any) ?? 'NEW',
      source: dto.source,
      notes: dto.notes,
      preferences: dto.preferences,
      assignedToId: dto.assignedToId || userId,
      city: dto.city,
      postalCode: dto.postalCode,
      budget_min: dto.budget_min,
      budget_max: dto.budget_max,
      interest_type: dto.interest_type,
      timeline: dto.timeline,
      gdprConsent: dto.gdprConsent ?? false,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent ? new Date() : undefined,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Fire NEW_LEAD automation trigger (non-blocking)
  fireTrigger('NEW_LEAD', contact.id).catch(err =>
    console.error('[Automation] NEW_LEAD trigger error:', err)
  );

  return contact;
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const contact = await prisma.contact.findFirst({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      interactions: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      opportunities: {
        include: {
          property: { select: { id: true, title: true, price: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!contact) {
    const err: any = new Error('Contact not found');
    err.status = 404;
    throw err;
  }
  return {
    ...contact,
    leadScore: calculateLeadScore(contact, contact.interactions?.length ?? 0),
  };
};

export const update = async (
  id: string,
  dto: {
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    status?: string;
    source?: string;
    notes?: string;
    preferences?: string;
    assignedToId?: string;
    city?: string;
    postalCode?: string;
    budget_min?: number;
    budget_max?: number;
    interest_type?: string;
    timeline?: string;
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.contact.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Contact not found or access denied');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      type: dto.type as any,
      status: dto.status as any,
      source: dto.source,
      notes: dto.notes,
      preferences: dto.preferences,
      assignedToId: dto.assignedToId,
      city: dto.city,
      postalCode: dto.postalCode,
      budget_min: dto.budget_min,
      budget_max: dto.budget_max,
      interest_type: dto.interest_type,
      timeline: dto.timeline,
      gdprConsent: dto.gdprConsent,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent === true ? new Date() : undefined,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  return updated;
};

export const archive = async (id: string) => {
  return prisma.contact.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.contact.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Contact not found or access denied');
    err.status = 404;
    throw err;
  }
  return prisma.contact.delete({ where: { id } });
};
