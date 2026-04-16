import prisma from '../../config/database';

const DEFAULT_STAGES = [
  { name: 'Lead Novo',         color: '#6366f1', position: 0 },
  { name: 'Primeiro Contacto', color: '#8b5cf6', position: 1 },
  { name: 'Visita Agendada',   color: '#f59e0b', position: 2 },
  { name: 'Visita Realizada',  color: '#10b981', position: 3 },
  { name: 'Proposta Enviada',  color: '#3b82f6', position: 4 },
  { name: 'Negociação',        color: '#f97316', position: 5 },
  { name: 'Negócio Fechado',   color: '#22c55e', position: 6 },
  { name: 'Perdido',           color: '#ef4444', position: 7 },
];

const userScope = (user: any) => {
  if (user.agencyId) return { agencyId: user.agencyId };
  if (user.locationId) return { locationId: user.locationId };
  return {};
};

export const list = async (user: any) => {
  const where = userScope(user);

  return prisma.pipeline.findMany({
    where,
    orderBy: { position: 'asc' },
    include: {
      stages: { orderBy: { position: 'asc' } },
      _count: { select: { opportunities: true } },
    },
  });
};

export const getById = async (id: string, user: any) => {
  const where: any = { id, ...userScope(user) };

  const pipeline = await prisma.pipeline.findFirst({
    where,
    include: { stages: { orderBy: { position: 'asc' } } },
  });
  if (!pipeline) throw Object.assign(new Error('Pipeline não encontrada'), { status: 404 });
  return pipeline;
};

export const create = async (name: string, user: any) => {
  const scope = userScope(user);
  const count = await prisma.pipeline.count({ where: scope });

  return prisma.pipeline.create({
    data: {
      name,
      position: count,
      agencyId: user.agencyId || null,
      locationId: !user.agencyId ? user.locationId || null : null,
      stages: { create: DEFAULT_STAGES },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  });
};

export const update = async (id: string, data: { name?: string; position?: number }, user: any) => {
  await getById(id, user);
  return prisma.pipeline.update({ where: { id }, data });
};

export const remove = async (id: string, user: any) => {
  await getById(id, user);
  const count = await prisma.opportunity.count({ where: { pipelineId: id } });
  if (count > 0) {
    throw Object.assign(
      new Error(`Não é possível eliminar: a pipeline tem ${count} oportunidade(s).`),
      { status: 400 }
    );
  }
  return prisma.pipeline.delete({ where: { id } });
};

export const createStage = async (pipelineId: string, data: { name: string; color?: string }, user: any) => {
  await getById(pipelineId, user);
  const count = await prisma.pipelineStage.count({ where: { pipelineId } });
  return prisma.pipelineStage.create({
    data: { pipelineId, name: data.name, color: data.color || '#6366f1', position: count },
  });
};

export const updateStage = async (pipelineId: string, stageId: string, data: { name?: string; color?: string; position?: number }, user: any) => {
  await getById(pipelineId, user);
  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId } });
  if (!stage) throw Object.assign(new Error('Etapa não encontrada'), { status: 404 });
  return prisma.pipelineStage.update({ where: { id: stageId }, data });
};

export const removeStage = async (pipelineId: string, stageId: string, user: any) => {
  await getById(pipelineId, user);
  const count = await prisma.opportunity.count({ where: { stageId } });
  if (count > 0) {
    throw Object.assign(
      new Error(`Não é possível eliminar: a etapa tem ${count} oportunidade(s).`),
      { status: 400 }
    );
  }
  return prisma.pipelineStage.delete({ where: { id: stageId } });
};

export const ensureDefaultPipelines = async () => {
  const agencies = await prisma.agency.findMany({ select: { id: true } });
  for (const agency of agencies) {
    const existing = await prisma.pipeline.count({ where: { agencyId: agency.id } });
    if (existing === 0) {
      await prisma.pipeline.create({
        data: {
          name: 'Geral',
          position: 0,
          agencyId: agency.id,
          stages: { create: DEFAULT_STAGES },
        },
      });
      console.log(`[Pipelines] Created default pipeline for agency ${agency.id}`);
    }
  }
};
