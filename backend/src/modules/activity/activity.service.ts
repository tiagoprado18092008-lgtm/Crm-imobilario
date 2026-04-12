import prisma from '../../config/database';

export const list = async (filters: any, user: any) => {
  const where: any = {};

  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) where.agencyId = user.agencyId;
    if (filters.locationId) where.locationId = filters.locationId;
  } else if (user.role === 'LOCATION_ADMIN') {
    where.locationId = user.locationId;
  } else {
    where.userId = user.id;
  }

  if (filters.userId) where.userId = filters.userId;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }

  const page = parseInt(filters.page ?? '1');
  const limit = parseInt(filters.limit ?? '50');

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { data: logs, total, page, limit, totalPages: Math.ceil(total / limit) };
};
