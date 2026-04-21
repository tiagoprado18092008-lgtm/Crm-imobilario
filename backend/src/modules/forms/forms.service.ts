import prisma from '../../config/database';
import { eventBus } from '../../utils/event-bus';

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) return { assignedTo: { agencyId: user.agencyId } };
    return { assignedToId: user.id };
  }
  if (user.role === 'TEAM_LEADER') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    return { assignedToId: { in: [user.id, ...subAgents.map((a: any) => a.id)] } };
  }
  return { assignedToId: user.id };
};

export const list = async (user: any) => {
  const where = await buildWhereClause(user);
  return prisma.form.findMany({
    where,
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const f = await prisma.form.findFirst({
    where,
    include: { submissions: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  if (!f) throw Object.assign(new Error('Formulário não encontrado'), { status: 404 });
  return f;
};

export const getPublic = async (id: string) => {
  const f = await prisma.form.findUnique({ where: { id, isActive: true } });
  if (!f) throw Object.assign(new Error('Formulário não encontrado'), { status: 404 });
  return { id: f.id, name: f.name, description: f.description, fields: f.fields, thankYouMessage: f.thankYouMessage };
};

export const create = async (dto: any, userId: string) => prisma.form.create({
  data: {
    name: dto.name,
    description: dto.description,
    fields: JSON.stringify(dto.fields || []),
    submitAction: dto.submitAction || 'CREATE_CONTACT',
    thankYouMessage: dto.thankYouMessage || 'Obrigado! Entraremos em contacto em breve.',
    assignedToId: dto.assignedToId || userId,
  },
});

export const update = async (id: string, dto: any, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.form.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Formulário não encontrado ou acesso negado'), { status: 404 });

  const data: any = {};
  if (dto.name) data.name = dto.name;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.fields) data.fields = JSON.stringify(dto.fields);
  if (dto.isActive !== undefined) data.isActive = dto.isActive;
  if (dto.thankYouMessage) data.thankYouMessage = dto.thankYouMessage;
  if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
  return prisma.form.update({ where: { id }, data });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.form.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Formulário não encontrado ou acesso negado'), { status: 404 });

  await prisma.formSubmission.deleteMany({ where: { formId: id } });
  await prisma.form.delete({ where: { id } });
};

export const submit = async (id: string, data: Record<string, any>, ipAddress?: string) => {
  const form = await prisma.form.findUnique({ where: { id, isActive: true } });
  if (!form) throw Object.assign(new Error('Formulário não encontrado'), { status: 404 });

  // Auto-create contact from submission
  let contactId: string | undefined;
  if (form.submitAction === 'CREATE_CONTACT' || form.submitAction === 'CREATE_LEAD') {
    const assignedToId = form.assignedToId;
    if (assignedToId && (data.name || data.email || data.phone)) {
      const contact = await prisma.contact.create({
        data: {
          name: data.name || 'Sem nome',
          email: data.email,
          phone: data.phone,
          type: form.submitAction === 'CREATE_LEAD' ? 'LEAD' : 'LEAD',
          status: 'NEW',
          source: 'FORM',
          notes: `Submetido via formulário: ${form.name}`,
          assignedToId,
        },
      });
      contactId = contact.id;
      // Fire automation trigger asynchronously — do not block form submission
      setImmediate(() => eventBus.emit('trigger:NEW_LEAD', contact.id));
    }
  }

  return prisma.formSubmission.create({
    data: {
      formId: id,
      data: JSON.stringify(data),
      contactId,
      ipAddress,
    },
  });
};
