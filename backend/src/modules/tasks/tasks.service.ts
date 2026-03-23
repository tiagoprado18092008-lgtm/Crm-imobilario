import prisma from '../../config/database';

export const list = async (filters: {
  status?: string;
  priority?: string;
  assignedToId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  contactId?: string;
  opportunityId?: string;
  page?: number;
  limit?: number;
}) => {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.opportunityId) where.opportunityId = filters.opportunityId;
  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {};
    if (filters.dueDateFrom) where.dueDate.gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo) where.dueDate.lte = new Date(filters.dueDateTo);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
      },
    }),
  ]);

  return { data: tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (dto: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  contactId?: string;
  opportunityId?: string;
  assignedToId: string;
}) => {
  return prisma.task.create({
    data: {
      title: dto.title,
      description: dto.description,
      status: (dto.status as any) ?? 'PENDING',
      priority: (dto.priority as any) ?? 'MEDIUM',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      contactId: dto.contactId,
      opportunityId: dto.opportunityId,
      assignedToId: dto.assignedToId,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
    },
  });
};

export const getById = async (id: string) => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
    },
  });
  if (!task) {
    const err: any = new Error('Task not found');
    err.status = 404;
    throw err;
  }
  return task;
};

export const update = async (
  id: string,
  dto: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    completedAt?: string;
    contactId?: string;
    opportunityId?: string;
    assignedToId?: string;
  }
) => {
  const updateData: any = {};
  if (dto.title !== undefined) updateData.title = dto.title;
  if (dto.description !== undefined) updateData.description = dto.description;
  if (dto.priority !== undefined) updateData.priority = dto.priority;
  if (dto.contactId !== undefined) updateData.contactId = dto.contactId;
  if (dto.opportunityId !== undefined) updateData.opportunityId = dto.opportunityId;
  if (dto.assignedToId !== undefined) updateData.assignedToId = dto.assignedToId;
  if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
  if (dto.completedAt !== undefined) updateData.completedAt = dto.completedAt ? new Date(dto.completedAt) : null;

  if (dto.status !== undefined) {
    updateData.status = dto.status;
    if (dto.status === 'COMPLETED' && !dto.completedAt) {
      updateData.completedAt = new Date();
    }
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
    },
  });
};

export const remove = async (id: string) => {
  return prisma.task.delete({ where: { id } });
};
