import prisma from '../../config/database';

const select = {
  id: true, title: true, description: true, startAt: true, endAt: true,
  status: true, type: true, notes: true, location: true, reminderSent: true,
  contactId: true, opportunityId: true, assignedToId: true,
  contact: { select: { id: true, name: true, phone: true, email: true } },
  assignedTo: { select: { id: true, name: true, avatarUrl: true } },
  createdAt: true, updatedAt: true,
};

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PRINCIPAL_CONSULTANT') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    return { assignedToId: { in: [user.id, ...subAgents.map((a: any) => a.id)] } };
  }
  return { assignedToId: user.id };
};

export const list = async (user: any, filters: any = {}) => {
  const where: any = await buildWhereClause(user);
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.from || filters.to) {
    where.startAt = {};
    if (filters.from) where.startAt.gte = new Date(filters.from);
    if (filters.to) where.startAt.lte = new Date(filters.to);
  }
  return prisma.appointment.findMany({ where, select, orderBy: { startAt: 'asc' } });
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const a = await prisma.appointment.findFirst({ where, select });
  if (!a) throw Object.assign(new Error('Agendamento não encontrado'), { status: 404 });
  return a;
};

export const create = async (userId: string, dto: any) => {
  return prisma.appointment.create({
    data: {
      title: dto.title,
      description: dto.description,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      status: dto.status || 'SCHEDULED',
      type: dto.type || 'VISIT',
      notes: dto.notes,
      location: dto.location,
      contactId: dto.contactId || undefined,
      opportunityId: dto.opportunityId || undefined,
      assignedToId: dto.assignedToId || userId,
    },
    select,
  });
};

export const update = async (id: string, dto: any, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.appointment.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Agendamento não encontrado ou acesso negado'), { status: 404 });

  const data: any = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.startAt) data.startAt = new Date(dto.startAt);
  if (dto.endAt) data.endAt = new Date(dto.endAt);
  if (dto.status) data.status = dto.status;
  if (dto.type) data.type = dto.type;
  if (dto.notes !== undefined) data.notes = dto.notes;
  if (dto.location !== undefined) data.location = dto.location;
  if (dto.contactId !== undefined) data.contactId = dto.contactId || null;
  if (dto.assignedToId) data.assignedToId = dto.assignedToId;
  return prisma.appointment.update({ where: { id }, data, select });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.appointment.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Agendamento não encontrado ou acesso negado'), { status: 404 });
  await prisma.appointment.delete({ where: { id } });
};

export const getUpcoming = async (user: any) => {
  const where: any = await buildWhereClause(user);
  where.startAt = { gte: new Date() };
  where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
  return prisma.appointment.findMany({ where, select, orderBy: { startAt: 'asc' }, take: 10 });
};
