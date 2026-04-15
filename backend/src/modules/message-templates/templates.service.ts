import prisma from '../../config/database';
import { buildScope } from '../../lib/scope';

export const list = async (user: any, channel?: string) => {
  const scope = await buildScope(user);
  const locationId = (scope as any).locationId ?? user.locationId;
  const where: any = {};
  if (locationId) where.locationId = locationId;
  else if (user.agencyId) where.agencyId = user.agencyId;
  if (channel && channel !== 'ALL') {
    where.OR = [{ channel }, { channel: 'ALL' }];
  }
  return prisma.messageTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const create = async (data: any, user: any) => {
  return prisma.messageTemplate.create({
    data: {
      locationId: user.locationId ?? '',
      agencyId: user.agencyId ?? null,
      name: data.name,
      channel: data.channel ?? 'ALL',
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables ?? [],
    },
  });
};

export const update = async (id: string, data: any, user: any) => {
  const tpl = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!tpl) throw Object.assign(new Error('Template não encontrado'), { status: 404 });
  if (tpl.locationId !== user.locationId && tpl.agencyId !== user.agencyId) {
    throw Object.assign(new Error('Acesso negado'), { status: 403 });
  }
  return prisma.messageTemplate.update({
    where: { id },
    data: {
      name: data.name,
      channel: data.channel,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables ?? [],
    },
  });
};

export const remove = async (id: string, user: any) => {
  const tpl = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!tpl) throw Object.assign(new Error('Template não encontrado'), { status: 404 });
  if (tpl.locationId !== user.locationId && tpl.agencyId !== user.agencyId) {
    throw Object.assign(new Error('Acesso negado'), { status: 403 });
  }
  await prisma.messageTemplate.delete({ where: { id } });
};
