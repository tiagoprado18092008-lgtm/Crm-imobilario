import prisma from '../../config/database';
import { buildPropertyScope } from '../../lib/scope';
import { logActivity } from '../../lib/activity-logger';

const buildWhereClause = async (user: any): Promise<any> => {
  return buildPropertyScope(user);
};

export const list = async (
  filters: {
    type?: string;
    status?: string;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = {};
    if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
    if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { address: { contains: filters.search, mode: 'insensitive' } },
      { reference: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { opportunities: true } },
      },
    }),
  ]);

  return { data: properties, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (
  dto: {
    title: string;
    description?: string;
    type: string;
    status?: string;
    price: number;
    address: string;
    area?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    reference?: string;
    imageUrls?: string;
  },
  user: any
) => {
  return prisma.property.create({
    data: {
      title: dto.title,
      description: dto.description,
      type: dto.type as any,
      status: (dto.status as any) ?? 'AVAILABLE',
      price: dto.price,
      address: dto.address,
      area: dto.area,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      parking: dto.parking,
      reference: dto.reference,
      imageUrls: dto.imageUrls ?? '[]',
      createdById: user.id,
      locationId: user.locationId ?? null,
    },
  });
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const property = await prisma.property.findFirst({
    where,
    include: {
      opportunities: {
        include: {
          contact: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!property) {
    const err: any = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  return property;
};

export const update = async (
  id: string,
  dto: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number;
    address?: string;
    area?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    reference?: string;
    imageUrls?: string;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.property.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Property not found or access denied');
    err.status = 404;
    throw err;
  }

  return prisma.property.update({
    where: { id },
    data: {
      title: dto.title,
      description: dto.description,
      type: dto.type as any,
      status: dto.status as any,
      price: dto.price,
      address: dto.address,
      area: dto.area,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      parking: dto.parking,
      reference: dto.reference,
      imageUrls: dto.imageUrls,
    },
  });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.property.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Property not found or access denied');
    err.status = 404;
    throw err;
  }

  logActivity({
    userId: user.id,
    agencyId: user.agencyId ?? undefined,
    locationId: user.locationId ?? undefined,
    action: 'property.delete',
    entityType: 'Property',
    entityId: id,
  });
  return prisma.property.delete({ where: { id } });
};
