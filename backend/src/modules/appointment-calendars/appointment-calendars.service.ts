import prisma from '../../config/database';

const userScope = (user: any) => {
  if (user.agencyId) return { agencyId: user.agencyId };
  if (user.locationId) return { locationId: user.locationId };
  return {};
};

export const list = async (user: any) => {
  return prisma.appointmentCalendar.findMany({
    where: userScope(user),
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { appointments: true } } },
  });
};

export const create = async (data: { name: string; color?: string; description?: string }, user: any) => {
  const scope = userScope(user);
  return prisma.appointmentCalendar.create({
    data: {
      name: data.name,
      color: data.color || '#6366f1',
      description: data.description,
      agencyId: (scope as any).agencyId || null,
      locationId: (scope as any).locationId || null,
    },
    include: { _count: { select: { appointments: true } } },
  });
};

export const update = async (id: string, data: { name?: string; color?: string; description?: string }, user: any) => {
  const cal = await prisma.appointmentCalendar.findFirst({ where: { id, ...userScope(user) } });
  if (!cal) throw Object.assign(new Error('Calendário não encontrado'), { status: 404 });
  return prisma.appointmentCalendar.update({
    where: { id },
    data,
    include: { _count: { select: { appointments: true } } },
  });
};

export const remove = async (id: string, user: any) => {
  const cal = await prisma.appointmentCalendar.findFirst({ where: { id, ...userScope(user) } });
  if (!cal) throw Object.assign(new Error('Calendário não encontrado'), { status: 404 });
  // Unlink appointments before deleting
  await prisma.appointment.updateMany({ where: { calendarId: id }, data: { calendarId: null } });
  return prisma.appointmentCalendar.delete({ where: { id } });
};
