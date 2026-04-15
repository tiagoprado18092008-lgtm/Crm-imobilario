import prisma from '../../config/database';

export const getById = async (id: string) => {
  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      users: {
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      },
    },
  });
  if (!agency) {
    const err: any = new Error('Agency not found');
    err.status = 404;
    throw err;
  }
  return agency;
};

export const create = async (dto: { name: string; slug: string; logoUrl?: string }) => {
  const existing = await prisma.agency.findUnique({ where: { slug: dto.slug } });
  if (existing) {
    const err: any = new Error('Slug already in use');
    err.status = 409;
    throw err;
  }
  return prisma.agency.create({ data: dto });
};

export const update = async (
  id: string,
  dto: {
    name?: string; legalName?: string; slug?: string; logoUrl?: string; coverUrl?: string;
    description?: string; phone?: string; email?: string; website?: string;
    address?: string; city?: string; country?: string; niche?: string; currency?: string; isActive?: boolean
  }
) => {
  return prisma.agency.update({ where: { id }, data: dto });
};

export const regenerateApiKey = async (id: string) => {
  const { randomBytes } = await import('crypto');
  const apiKey = `ck_${randomBytes(24).toString('hex')}`;
  return prisma.agency.update({ where: { id }, data: { apiKey } });
};

export const listMembers = async (agencyId: string) => {
  return prisma.user.findMany({
    where: { agencyId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      supervisorId: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
};

export const assignUserToAgency = async (userId: string, agencyId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { agencyId },
    select: { id: true, name: true, email: true, role: true, agencyId: true },
  });
};
