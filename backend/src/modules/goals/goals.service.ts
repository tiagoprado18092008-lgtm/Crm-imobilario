import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { periodBounds, goalProgress, rankLeaderboard, type LeaderboardEntry } from '../../lib/goals';

/**
 * Goals and the leaderboard.
 *
 * Both read only what the caller is allowed to see: a BDR sees their own
 * numbers, an admin sees the team. The scoping is applied here rather than in
 * the interface, so hiding a column cannot be mistaken for enforcing a rule.
 */

/** Roles that may see the whole workspace rather than only their own work. */
const MANAGER_ROLES = ['SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'];

export const canSeeEveryone = (user: any): boolean => MANAGER_ROLES.includes(user?.role);

export const list = async (user: any) => {
  const where: any = withWorkspace(user, { isActive: true });

  // A BDR sees their own goals and the workspace-wide ones; a manager sees
  // everybody's.
  if (!canSeeEveryone(user)) {
    where.OR = [{ userId: user.id }, { userId: null }];
  }

  const goals = await prisma.goal.findMany({
    where,
    orderBy: [{ period: 'asc' }, { metric: 'asc' }],
    include: { user: { select: { id: true, name: true } } },
  });

  return Promise.all(goals.map(async (goal) => ({
    ...goal,
    progress: goalProgress(
      goal.target,
      await actualFor(goal.metric, goal.userId, goal.period as any, user),
      goal.period as any,
    ),
  })));
};

export const create = async (dto: any, user: any) => {
  if (!canSeeEveryone(user) && dto.userId && dto.userId !== user.id) {
    throw Object.assign(new Error('Só podes definir metas para ti'), { status: 403 });
  }

  const period = dto.period ?? 'MENSAL';
  const { start, end } = periodBounds(period);

  return prisma.goal.create({
    data: {
      agencyId: workspaceIdFor(user),
      metric: dto.metric,
      period,
      target: Number(dto.target ?? 0),
      userId: dto.userId ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : start,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : end,
    },
  });
};

export const update = async (id: string, dto: any, user: any) => {
  const goal = await prisma.goal.findFirst({ where: withWorkspace(user, { id }) });
  if (!goal) throw Object.assign(new Error('Meta não encontrada'), { status: 404 });

  if (!canSeeEveryone(user) && goal.userId !== user.id) {
    throw Object.assign(new Error('Só podes alterar as tuas metas'), { status: 403 });
  }

  return prisma.goal.update({
    where: { id },
    data: {
      ...(dto.target !== undefined && { target: Number(dto.target) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
  });
};

export const remove = async (id: string, user: any) => {
  const goal = await prisma.goal.findFirst({ where: withWorkspace(user, { id }) });
  if (!goal) throw Object.assign(new Error('Meta não encontrada'), { status: 404 });

  if (!canSeeEveryone(user) && goal.userId !== user.id) {
    throw Object.assign(new Error('Só podes eliminar as tuas metas'), { status: 403 });
  }

  await prisma.goal.delete({ where: { id } });
};

/** The figure a goal is measured against, for the current period. */
async function actualFor(
  metric: string,
  userId: string | null,
  period: 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL',
  user: any,
): Promise<number> {
  const { start, end } = periodBounds(period);
  const scope = withWorkspace(user, {});
  const owner = userId ? { userId } : {};

  switch (metric) {
    case 'CHAMADAS':
      return prisma.call.count({
        where: { ...scope, ...owner, startedAt: { gte: start, lt: end } },
      });

    case 'REUNIOES':
      // What counts is a meeting booked, which is the disposition, not an
      // appointment somebody typed into a calendar.
      return prisma.call.count({
        where: {
          ...scope,
          ...owner,
          disposition: 'REUNIAO_MARCADA',
          startedAt: { gte: start, lt: end },
        },
      });

    case 'CONVERSAS':
      return prisma.conversation.count({
        where: {
          ...scope,
          ...(userId ? { assignedToId: userId } : {}),
          lastMessageAt: { gte: start, lt: end },
        },
      });

    case 'NEGOCIOS_CRIADOS':
      return prisma.opportunity.count({
        where: {
          ...scope,
          ...(userId ? { assignedToId: userId } : {}),
          createdAt: { gte: start, lt: end },
        },
      });

    case 'VALOR_FECHADO': {
      const won = await prisma.opportunity.aggregate({
        where: {
          ...scope,
          ...(userId ? { assignedToId: userId } : {}),
          stage: 'CLOSED_WON',
          updatedAt: { gte: start, lt: end },
        },
        _sum: { value: true },
      });
      return won._sum.value ?? 0;
    }

    case 'MRR_NOVO': {
      const subs = await prisma.subscription.aggregate({
        where: { ...scope, state: 'ATIVA', startDate: { gte: start, lt: end } },
        _sum: { monthlyValue: true },
      });
      return subs._sum.monthlyValue ?? 0;
    }

    default:
      return 0;
  }
}

/**
 * The team's numbers for the period.
 *
 * A BDR sees only their own row. Returning everybody's and letting the
 * interface hide the rest would leave the data one request away.
 */
export const leaderboard = async (
  period: 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL',
  user: any,
): Promise<LeaderboardEntry[]> => {
  const { start, end } = periodBounds(period);
  const scope = withWorkspace(user, {});

  const users = canSeeEveryone(user)
    ? await prisma.user.findMany({
        where: { agencyId: user.agencyId, isActive: true },
        select: { id: true, name: true },
      })
    : [{ id: user.id, name: user.name ?? 'Eu' }];

  const entries = await Promise.all(
    users.map(async (u) => {
      const [calls, meetings, dealsCreated, won] = await Promise.all([
        prisma.call.count({
          where: { ...scope, userId: u.id, startedAt: { gte: start, lt: end } },
        }),
        prisma.call.count({
          where: {
            ...scope,
            userId: u.id,
            disposition: 'REUNIAO_MARCADA',
            startedAt: { gte: start, lt: end },
          },
        }),
        prisma.opportunity.count({
          where: { ...scope, assignedToId: u.id, createdAt: { gte: start, lt: end } },
        }),
        prisma.opportunity.aggregate({
          where: {
            ...scope,
            assignedToId: u.id,
            stage: 'CLOSED_WON',
            updatedAt: { gte: start, lt: end },
          },
          _sum: { value: true },
          _count: true,
        }),
      ]);

      return {
        userId: u.id,
        name: u.name,
        calls,
        meetings,
        dealsCreated,
        dealsWon: won._count,
        valueWon: won._sum.value ?? 0,
      };
    }),
  );

  return rankLeaderboard(entries);
};
