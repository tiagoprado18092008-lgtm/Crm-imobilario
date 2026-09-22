import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import {
  templatesForLineItems,
  scheduleTasks,
  projectDueDate,
  type ProjectTemplateDef,
} from '../../lib/project-templates';

/**
 * Delivery.
 *
 * Projects exist so that work sold does not fall into the gap between closing
 * and doing. Winning a deal opens them automatically: leaving someone to
 * remember is how onboarding gets skipped and a retainer is lost in month two.
 */

const LIST_SELECT = {
  id: true,
  name: true,
  type: true,
  state: true,
  startDate: true,
  dueDate: true,
  deliveredAt: true,
  createdAt: true,
  company: { select: { id: true, name: true, sector: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { tasks: true, deliverables: true } },
} as const;

export const list = async (
  filters: { state?: string; companyId?: string; ownerId?: string },
  user: any,
) => {
  const where: any = withWorkspace(user, { deletedAt: null });
  if (filters.state) where.state = filters.state;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.ownerId) where.ownerId = filters.ownerId;

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    select: LIST_SELECT,
    take: 200,
  });

  // How much of the checklist is done, computed here so the board does not
  // count tasks per card on every render.
  const withProgress = await Promise.all(
    projects.map(async (p) => {
      const done = await prisma.projectTask.count({ where: { projectId: p.id, isDone: true } });
      return { ...p, tasksDone: done, tasksTotal: p._count.tasks };
    }),
  );

  return withProgress;
};

export const getById = async (id: string, user: any) => {
  const project = await prisma.project.findFirst({
    where: withWorkspace(user, { id, deletedAt: null }),
    include: {
      company: { select: { id: true, name: true, sector: true, email: true, phone: true } },
      owner: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true, value: true } },
      tasks: {
        orderBy: { position: 'asc' },
        include: { assignee: { select: { id: true, name: true } } },
      },
      deliverables: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!project) throw Object.assign(new Error('Projeto não encontrado'), { status: 404 });
  return project;
};

export const create = async (dto: any, user: any) => {
  const agencyId = workspaceIdFor(user);
  const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

  return prisma.project.create({
    data: {
      agencyId,
      name: dto.name,
      type: dto.type ?? 'OUTRO',
      companyId: dto.companyId,
      dealId: dto.dealId ?? null,
      ownerId: dto.ownerId ?? user.id,
      startDate,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      notes: dto.notes ?? null,
    },
  });
};

export const update = async (id: string, dto: any, user: any) => {
  await getById(id, user);

  // Stamp the delivery date on the transition, not on every later edit, or
  // cycle-time reporting measures the last time somebody touched the record.
  const deliveredAt =
    dto.state === 'ENTREGUE' ? { deliveredAt: new Date() } : dto.state ? { deliveredAt: null } : {};

  return prisma.project.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...deliveredAt,
    },
  });
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const toggleTask = async (taskId: string, user: any) => {
  const task = await prisma.projectTask.findFirst({ where: withWorkspace(user, { id: taskId }) });
  if (!task) throw Object.assign(new Error('Tarefa não encontrada'), { status: 404 });

  const isDone = !task.isDone;
  return prisma.projectTask.update({
    where: { id: taskId },
    data: { isDone, doneAt: isDone ? new Date() : null },
  });
};

export const addTask = async (projectId: string, dto: any, user: any) => {
  await getById(projectId, user);
  const count = await prisma.projectTask.count({ where: { projectId } });

  return prisma.projectTask.create({
    data: {
      agencyId: workspaceIdFor(user),
      projectId,
      title: dto.title,
      description: dto.description ?? null,
      assigneeId: dto.assigneeId ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      position: count,
    },
  });
};

// ─── Deliverables ─────────────────────────────────────────────────────────────

export const addDeliverable = async (projectId: string, dto: any, user: any) => {
  await getById(projectId, user);
  return prisma.deliverable.create({
    data: {
      agencyId: workspaceIdFor(user),
      projectId,
      name: dto.name,
      url: dto.url ?? null,
      state: 'RASCUNHO',
    },
  });
};

export const updateDeliverable = async (id: string, dto: any, user: any) => {
  const existing = await prisma.deliverable.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Entregável não encontrado'), { status: 404 });

  const timestamps: any = {};
  if (dto.state === 'SUBMETIDO' && !existing.submittedAt) timestamps.submittedAt = new Date();
  if (dto.state === 'APROVADO') timestamps.approvedAt = new Date();

  return prisma.deliverable.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.url !== undefined && { url: dto.url }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.clientFeedback !== undefined && { clientFeedback: dto.clientFeedback }),
      ...timestamps,
    },
  });
};

// ─── Won deal → project ───────────────────────────────────────────────────────

/**
 * Opens the projects a won deal owes.
 *
 * Idempotent: winning a deal twice, or a webhook arriving twice, must not
 * produce two copies of the same checklist. The company is promoted to client
 * here too, since that is what winning means.
 */
export const createFromWonDeal = async (
  dealId: string,
  user: any,
): Promise<{ created: number; projects: Array<{ id: string; name: string }> }> => {
  const agencyId = workspaceIdFor(user);

  const deal = await prisma.opportunity.findFirst({
    where: withWorkspace(user, { id: dealId }),
    include: { lineItems: { orderBy: { position: 'asc' } }, company: true },
  });
  if (!deal) throw Object.assign(new Error('Negócio não encontrado'), { status: 404 });

  if (!deal.companyId) {
    throw Object.assign(
      new Error('O negócio não tem empresa associada — não é possível abrir o projeto'),
      { status: 422 },
    );
  }

  const existing = await prisma.project.findMany({
    where: { dealId, deletedAt: null },
    select: { type: true },
  });
  const alreadyOpen = new Set(existing.map((p) => p.type));

  const templates = templatesForLineItems(deal.lineItems as any).filter(
    (t) => !alreadyOpen.has(t.type as any),
  );

  if (templates.length === 0) {
    return { created: 0, projects: [] };
  }

  const startDate = new Date();
  const created: Array<{ id: string; name: string }> = [];

  for (const template of templates) {
    const project = await instantiate(template, {
      agencyId,
      companyId: deal.companyId,
      dealId: deal.id,
      // The deal's owner delivers it, falling back to whoever triggered this.
      // On the public-acceptance path there is no acting user at all.
      ownerId: deal.assignedToId ?? user?.id ?? null,
      companyName: deal.company?.name ?? 'Cliente',
      startDate,
    });
    created.push({ id: project.id, name: project.name });
  }

  // Winning is what makes a prospect a client.
  await prisma.company.update({
    where: { id: deal.companyId },
    data: { type: 'CLIENTE' },
  });

  return { created: created.length, projects: created };
};

async function instantiate(
  template: ProjectTemplateDef,
  ctx: {
    agencyId: string;
    companyId: string;
    dealId: string;
    ownerId: string | null;
    companyName: string;
    startDate: Date;
  },
) {
  const scheduled = scheduleTasks(template.tasks, ctx.startDate);

  return prisma.project.create({
    data: {
      agencyId: ctx.agencyId,
      companyId: ctx.companyId,
      dealId: ctx.dealId,
      ownerId: ctx.ownerId,
      name: `${template.name} — ${ctx.companyName}`,
      type: template.type as any,
      state: 'ONBOARDING',
      startDate: ctx.startDate,
      dueDate: projectDueDate(template.tasks, ctx.startDate),
      tasks: {
        create: scheduled.map((task, position) => ({
          agencyId: ctx.agencyId,
          title: task.title,
          description: task.description ?? null,
          dueDate: task.dueDate,
          position,
        })),
      },
    },
  });
}
