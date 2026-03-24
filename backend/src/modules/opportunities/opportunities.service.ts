import prisma from '../../config/database';
import { fireTrigger } from '../../utils/automation.engine';

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PRINCIPAL_CONSULTANT') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    return { assignedToId: { in: [user.id, ...subAgents.map((a) => a.id)] } };
  }
  return { assignedToId: user.id };
};

export const list = async (
  filters: {
    stage?: string;
    assignedToId?: string;
    contactId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  if (filters.stage) where.stage = filters.stage;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.contactId) where.contactId = filters.contactId;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  const [total, opportunities] = await Promise.all([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ stage: 'asc' }, { position: 'asc' }],
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, title: true, price: true, type: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { interactions: true, tasks: true } },
      },
    }),
  ]);

  return { data: opportunities, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (
  dto: {
    title: string;
    stage?: string;
    value?: number;
    source?: string;
    expectedCloseDate?: string;
    lostReason?: string;
    notes?: string;
    position?: number;
    contactId: string;
    propertyId?: string;
    assignedToId?: string;
  },
  user: any
) => {
  return prisma.opportunity.create({
    data: {
      title: dto.title,
      stage: (dto.stage as any) ?? 'LEAD_IN',
      value: dto.value,
      source: dto.source,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      lostReason: dto.lostReason,
      notes: dto.notes,
      position: dto.position ?? 0,
      contactId: dto.contactId,
      propertyId: dto.propertyId,
      assignedToId: dto.assignedToId ?? user.id,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, price: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const opportunity = await prisma.opportunity.findFirst({
    where,
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
      property: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      interactions: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });

  if (!opportunity) {
    const err: any = new Error('Opportunity not found');
    err.status = 404;
    throw err;
  }
  return opportunity;
};

export const update = async (
  id: string,
  dto: {
    title?: string;
    stage?: string;
    value?: number;
    source?: string;
    expectedCloseDate?: string;
    lostReason?: string;
    notes?: string;
    position?: number;
    contactId?: string;
    propertyId?: string;
    assignedToId?: string;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.opportunity.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Opportunity not found or access denied');
    err.status = 404;
    throw err;
  }

  const updated = await prisma.opportunity.update({
    where: { id },
    data: {
      title: dto.title,
      stage: dto.stage as any,
      value: dto.value,
      source: dto.source,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      lostReason: dto.lostReason,
      notes: dto.notes,
      position: dto.position,
      contactId: dto.contactId,
      propertyId: dto.propertyId,
      assignedToId: dto.assignedToId,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, price: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // Fire automation triggers based on stage change
  if (dto.stage && dto.stage !== existing.stage) {
    const contactId = updated.contactId;
    if (dto.stage === 'VISIT_SCHEDULED') {
      fireTrigger('VISIT_SCHEDULED', contactId).catch(() => {});
    } else if (dto.stage === 'PROPOSAL_SENT') {
      fireTrigger('PROPOSAL_SENT', contactId).catch(() => {});
    } else if (dto.stage === 'QUALIFIED') {
      fireTrigger('LEAD_QUALIFIED', contactId).catch(() => {});
    }
  }

  return updated;
};

export const moveStage = async (
  id: string,
  newStage: string,
  newPosition: number,
  user: any
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.opportunity.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Opportunity not found or access denied');
    err.status = 404;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Reorder siblings in the target stage: push items at >= newPosition down by 1
    await tx.opportunity.updateMany({
      where: {
        stage: newStage as any,
        position: { gte: newPosition },
        id: { not: id },
      },
      data: { position: { increment: 1 } },
    });

    // Move the opportunity
    const updated = await tx.opportunity.update({
      where: { id },
      data: { stage: newStage as any, position: newPosition },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, price: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return updated;
  });

  // Fire automation triggers on stage change
  if (newStage !== existing.stage) {
    if (newStage === 'VISIT_SCHEDULED') {
      fireTrigger('VISIT_SCHEDULED', result.contactId).catch(() => {});
    } else if (newStage === 'PROPOSAL_SENT') {
      fireTrigger('PROPOSAL_SENT', result.contactId).catch(() => {});
    } else if (newStage === 'QUALIFIED') {
      fireTrigger('LEAD_QUALIFIED', result.contactId).catch(() => {});
    }
  }

  return result;
};

export const remove = async (id: string) => {
  return prisma.opportunity.delete({ where: { id } });
};
