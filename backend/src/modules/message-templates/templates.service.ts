import prisma from '../../config/database';
import { buildScope } from '../../lib/scope';

export const list = async (user: any, channel?: string) => {
  // Templates are workspace-wide. The locationId branch that used to sit here
  // filtered on a column dropped with the Location model.
  const where: any = user.agencyId ? { agencyId: user.agencyId } : { id: '__no_match__' };
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
  if (!user.agencyId || tpl.agencyId !== user.agencyId) {
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
  if (!user.agencyId || tpl.agencyId !== user.agencyId) {
    throw Object.assign(new Error('Acesso negado'), { status: 403 });
  }
  await prisma.messageTemplate.delete({ where: { id } });
};
