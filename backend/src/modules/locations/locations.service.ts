import prisma from '../../config/database';
import { logActivity } from '../../lib/activity-logger';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const list = async (user: any) => {
  const where: any = {};
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) where.agencyId = user.agencyId;
  } else if (user.role === 'LOCATION_ADMIN') {
    if (user.locationId) where.id = user.locationId;
  }
  return prisma.location.findMany({
    where,
    include: {
      settings: true,
      _count: { select: { users: true, contacts: true, opportunities: true } },
    },
    orderBy: { name: 'asc' },
  });
};

export const getById = async (id: string, user: any) => {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      settings: true,
      _count: { select: { users: true, contacts: true, opportunities: true } },
    },
  });
  if (!location) throw Object.assign(new Error('Escritório não encontrado'), { status: 404 });
  if (user.role !== 'AGENCY_OWNER' && user.role !== 'AGENCY_ADMIN') {
    if (user.locationId !== id) throw Object.assign(new Error('Acesso negado'), { status: 403 });
  } else if (user.agencyId && location.agencyId !== user.agencyId) {
    throw Object.assign(new Error('Acesso negado'), { status: 403 });
  }
  return location;
};

export const create = async (data: any, user: any) => {
  const slug = generateSlug(data.name);
  const location = await prisma.location.create({
    data: {
      agencyId: user.agencyId,
      name: data.name,
      slug,
      email: data.email,
      phone: data.phone,
      address: data.address,
      logoUrl: data.logoUrl,
      settings: {
        create: {
          timezone: 'Europe/Lisbon',
          locale: 'pt-PT',
          currency: 'EUR',
          workingHours: {},
          bookingPage: {},
        },
      },
    },
    include: { settings: true },
  });
  logActivity({
    userId: user.id,
    agencyId: user.agencyId,
    locationId: location.id,
    action: 'location.created',
    entityType: 'Location',
    entityId: location.id,
    metadata: { name: location.name },
  });
  return location;
};

export const update = async (id: string, data: any, user: any) => {
  await getById(id, user);
  const location = await prisma.location.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      logoUrl: data.logoUrl,
      isActive: data.isActive,
    },
  });
  logActivity({
    userId: user.id,
    agencyId: user.agencyId,
    locationId: id,
    action: 'location.updated',
    entityType: 'Location',
    entityId: id,
  });
  return location;
};

export const remove = async (id: string, user: any) => {
  if (user.role !== 'AGENCY_OWNER') throw Object.assign(new Error('Apenas o dono da agência pode eliminar escritórios'), { status: 403 });
  if (!user.agencyId) throw Object.assign(new Error('Sem agência'), { status: 400 });
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location || location.agencyId !== user.agencyId) throw Object.assign(new Error('Escritório não encontrado'), { status: 404 });
  await prisma.location.update({ where: { id }, data: { isActive: false } });
  logActivity({
    userId: user.id,
    agencyId: user.agencyId,
    locationId: id,
    action: 'location.deleted',
    entityType: 'Location',
    entityId: id,
  });
};

export const getMembers = async (id: string, user: any) => {
  await getById(id, user);
  return prisma.user.findMany({
    where: { locationId: id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      permissions: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
};

export const addMember = async (locationId: string, userId: string, user: any) => {
  await getById(locationId, user);
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) throw Object.assign(new Error('Utilizador não encontrado'), { status: 404 });
  if (member.agencyId !== user.agencyId) throw Object.assign(new Error('Utilizador de outra agência'), { status: 403 });
  return prisma.user.update({ where: { id: userId }, data: { locationId } });
};

export const getSettings = async (id: string, user: any) => {
  await getById(id, user);
  return prisma.locationSettings.findUnique({ where: { locationId: id } });
};

export const updateSettings = async (id: string, data: any, user: any) => {
  await getById(id, user);
  return prisma.locationSettings.upsert({
    where: { locationId: id },
    update: {
      timezone: data.timezone,
      locale: data.locale,
      currency: data.currency,
      workingHours: data.workingHours,
      bookingPage: data.bookingPage,
    },
    create: {
      locationId: id,
      timezone: data.timezone ?? 'Europe/Lisbon',
      locale: data.locale ?? 'pt-PT',
      currency: data.currency ?? 'EUR',
      workingHours: data.workingHours ?? {},
      bookingPage: data.bookingPage ?? {},
    },
  });
};
