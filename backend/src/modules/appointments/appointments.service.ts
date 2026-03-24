import prisma from '../../config/database';

const select = {
  id: true, title: true, description: true, startAt: true, endAt: true,
  status: true, type: true, notes: true, location: true, reminderSent: true,
  contactId: true, opportunityId: true, assignedToId: true,
  contact: { select: { id: true, name: true, phone: true, email: true } },
  assignedTo: { select: { id: true, name: true, avatarUrl: true } },
  createdAt: true, updatedAt: true,
};

export const list = async (userId: string, role: string, filters: any = {}) => {
  const where: any = {};
  if (role !== 'ADMIN' && role !== 'PRINCIPAL_CONSULTANT') where.assignedToId = userId;
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

export const getById = async (id: string) => {
  const a = await prisma.appointment.findUnique({ where: { id }, select });
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
      contactId: dto.contactId,
      opportunityId: dto.opportunityId,
      assignedToId: dto.assignedToId || userId,
    },
    select,
  });
};

export const update = async (id: string, dto: any) => {
  const data: any = {};
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.startAt) data.startAt = new Date(dto.startAt);
  if (dto.endAt) data.endAt = new Date(dto.endAt);
  if (dto.status) data.status = dto.status;
  if (dto.type) data.type = dto.type;
  if (dto.notes !== undefined) data.notes = dto.notes;
  if (dto.location !== undefined) data.location = dto.location;
  if (dto.contactId !== undefined) data.contactId = dto.contactId;
  if (dto.assignedToId) data.assignedToId = dto.assignedToId;
  return prisma.appointment.update({ where: { id }, data, select });
};

export const remove = async (id: string) => {
  await prisma.appointment.delete({ where: { id } });
};

export const getUpcoming = async (userId: string, role: string) => {
  const where: any = {
    startAt: { gte: new Date() },
    status: { in: ['SCHEDULED', 'CONFIRMED'] },
  };
  if (role !== 'ADMIN' && role !== 'PRINCIPAL_CONSULTANT') where.assignedToId = userId;
  return prisma.appointment.findMany({ where, select, orderBy: { startAt: 'asc' }, take: 10 });
};
