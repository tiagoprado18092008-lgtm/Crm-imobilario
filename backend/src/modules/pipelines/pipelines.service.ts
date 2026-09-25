import prisma from '../../config/database';
import { withWorkspace } from '../../lib/workspace';
import { mapStagesByName } from '../../lib/pipeline-rules';
import { logActivity } from '../../lib/activity-logger';
import { AGENCY_MANAGERS, ROLES } from '../../middleware/rbac.middleware';

const DEFAULT_STAGES = [
  { name: 'Lead Novo',         color: '#6366f1', position: 0 },
  { name: 'Primeiro Contacto', color: '#8b5cf6', position: 1 },
  { name: 'Reunião Marcada',   color: '#f59e0b', position: 2 },
  { name: 'Reunião Feita',     color: '#10b981', position: 3 },
  { name: 'Proposta Enviada',  color: '#3b82f6', position: 4 },
  { name: 'Negociação',        color: '#f97316', position: 5 },
  { name: 'Negócio Fechado',   color: '#22c55e', position: 6 },
  { name: 'Perdido',           color: '#ef4444', position: 7 },
];

const userScope = (user: any) => {
  if (user.agencyId) return { agencyId: user.agencyId };
  // Never return empty scope — return impossible match to prevent data leakage
  return { id: '__no_match__' };
};

export const list = async (user: any) => {
  const where = userScope(user);

  let pipelines = await prisma.pipeline.findMany({
    where,
    orderBy: { position: 'asc' },
    include: {
      stages: { orderBy: { position: 'asc' } },
      _count: { select: { opportunities: true } },
    },
  });

  // Auto-create default pipeline if agency has none yet
  if (pipelines.length === 0 && user.agencyId) {
    const created = await prisma.pipeline.create({
      data: {
        name: 'Geral',
        position: 0,
        agencyId: user.agencyId || null,
        stages: { create: DEFAULT_STAGES },
      },
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { opportunities: true } },
      },
    });
    pipelines = [created];
  }

  return pipelines;
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
      stages: { create: DEFAULT_STAGES },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  });
};

export const update = async (id: string, data: { name?: string; position?: number }, user: any) => {
  await getById(id, user);
  return prisma.pipeline.update({ where: { id }, data });
};

/**
 * Deletes a pipeline. One that still holds deals needs to be told what happens
 * to them: `moveTo` folds them into another pipeline, `deleteOpportunities`
 * removes them with it. Without either the request is refused with the count,
 * so nothing is lost by a stray click.
 */
export const remove = async (
  id: string,
  user: any,
  opts: { moveTo?: string; deleteOpportunities?: boolean } = {},
) => {
  const pipeline = await getById(id, user);
  const oppWhere = withWorkspace(user, { pipelineId: id });
  const count = await prisma.opportunity.count({ where: oppWhere });

  if (count === 0) {
    await prisma.pipeline.delete({ where: { id } });
    return { moved: 0, deleted: 0 };
  }

  if (opts.moveTo) {
    if (opts.moveTo === id) {
      throw Object.assign(new Error('Escolhe outra pipeline para receber as oportunidades.'), { status: 400 });
    }
    const target = await getById(opts.moveTo, user);
    const stageMap = mapStagesByName(pipeline.stages, target.stages);

    await prisma.$transaction([
      ...pipeline.stages.map((stage) =>
        prisma.opportunity.updateMany({
          where: withWorkspace(user, { pipelineId: id, stageId: stage.id }),
          data: { pipelineId: target.id, stageId: stageMap.get(stage.id) },
        }),
      ),
      // Whatever is left has no stage of this pipeline, so it had no column on
      // the board either; the first stage makes it visible again.
      prisma.opportunity.updateMany({
        where: oppWhere,
        data: { pipelineId: target.id, stageId: target.stages[0].id },
      }),
      prisma.pipeline.delete({ where: { id } }),
    ]);
    return { moved: count, deleted: 0 };
  }

  if (opts.deleteOpportunities) {
    if (!AGENCY_MANAGERS.includes(user.role) && user.role !== ROLES.SUPER_ADMIN) {
      throw Object.assign(
        new Error('Só o dono ou um administrador da agência pode eliminar oportunidades em massa.'),
        { status: 403 },
      );
    }
    await prisma.$transaction([
      prisma.opportunity.deleteMany({ where: oppWhere }),
      prisma.pipeline.delete({ where: { id } }),
    ]);
    logActivity({
      userId: user.id,
      agencyId: user.agencyId ?? undefined,
      action: 'pipeline.delete',
      entityType: 'Pipeline',
      entityId: id,
      metadata: { name: pipeline.name, deletedOpportunities: count },
    });
    return { moved: 0, deleted: count };
  }

  throw Object.assign(
    new Error(`Não é possível eliminar: a pipeline tem ${count} oportunidade(s).`),
    { status: 409, count },
  );
};

export const createStage = async (pipelineId: string, data: { name: string; color?: string }, user: any) => {
  const pipeline = await getById(pipelineId, user);
  const count = await prisma.pipelineStage.count({ where: { pipelineId } });
  return prisma.pipelineStage.create({
    data: {
      pipelineId,
      agencyId: (pipeline as any)?.agencyId ?? user?.agencyId ?? null,
      name: data.name,
      color: data.color || '#6366f1',
      position: count,
    },
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
  const count = await prisma.opportunity.count({ where: withWorkspace(user, { stageId }) });
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
