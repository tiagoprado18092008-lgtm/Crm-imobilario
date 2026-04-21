import prisma from '../../config/database';
import { buildScope } from '../../lib/scope';

const buildContactWhere = async (user: any): Promise<any> => buildScope(user);

const buildOpportunityWhere = async (user: any): Promise<any> => buildScope(user);

export const getSummary = async (user: any) => {
  const contactWhere = await buildContactWhere(user);
  const oppWhere = await buildOpportunityWhere(user);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    totalLeads,
    totalClients,
    openOpportunities,
    pipelineAgg,
    tasksDueToday,
    closedWonThisMonth,
    newContactsThisMonth,
    closedWonWithDates,
  ] = await Promise.all([
    prisma.contact.count({ where: contactWhere }),
    prisma.contact.count({ where: { ...contactWhere, type: 'LEAD' } }),
    prisma.contact.count({ where: { ...contactWhere, type: 'CLIENT' } }),
    prisma.opportunity.count({
      where: {
        ...oppWhere,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
    }),
    prisma.opportunity.aggregate({
      where: {
        ...oppWhere,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      _sum: { value: true },
    }),
    prisma.task.count({
      where: {
        ...contactWhere,
        dueDate: { gte: startOfToday, lt: endOfToday },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.opportunity.count({
      where: {
        ...oppWhere,
        stage: 'CLOSED_WON',
        updatedAt: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
    prisma.contact.count({
      where: { ...contactWhere, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.opportunity.findMany({
      where: { ...oppWhere, stage: 'CLOSED_WON' },
      select: { createdAt: true, updatedAt: true },
      take: 100,
    }),
  ]);

  const avgDaysToClose =
    closedWonWithDates.length > 0
      ? Math.round(
          closedWonWithDates.reduce((sum: number, opp: any) => {
            const days =
              (new Date(opp.updatedAt).getTime() - new Date(opp.createdAt).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / closedWonWithDates.length
        )
      : 0;

  return {
    totalContacts,
    totalLeads,
    totalClients,
    openOpportunities,
    pipelineValue: pipelineAgg._sum.value ?? 0,
    tasksDueToday,
    closedWonThisMonth,
    newContactsThisMonth,
    avgDaysToClose,
  };
};

export const getPipeline = async (user: any) => {
  const oppWhere = await buildOpportunityWhere(user);

  const stages = [
    'LEAD_IN',
    'QUALIFYING',
    'VISIT_SCHEDULED',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST',
  ];

  const results = await Promise.all(
    stages.map(async (stage) => {
      const [count, agg] = await Promise.all([
        prisma.opportunity.count({ where: { ...oppWhere, stage: stage as any } }),
        prisma.opportunity.aggregate({
          where: { ...oppWhere, stage: stage as any },
          _sum: { value: true },
        }),
      ]);
      return {
        stage,
        count,
        totalValue: agg._sum.value ?? 0,
      };
    })
  );

  return results;
};

export const getAgentPerformance = async (user?: any) => {
  if (!user) return [];
  // Strict tenant filter — no fallback to empty
  let agentFilter: any;
  if (user.agencyId) agentFilter = { agencyId: user.agencyId };
  else if (user.locationId) agentFilter = { locationId: user.locationId };
  else agentFilter = { id: user.id };

  const agents = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['TEAM_LEADER', 'CONSULTANT'] as any[] }, ...agentFilter },
    select: { id: true, name: true, email: true, role: true },
  });

  const performance = await Promise.all(
    agents.map(async (agent) => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Cross-check: contacts/opps must also belong to the same agency (agent.assignedTo.agencyId)
      const contactScope = user.agencyId ? { assignedTo: { agencyId: user.agencyId } } : user.locationId ? { assignedTo: { locationId: user.locationId } } : {};

      const [contacts, openOpportunities, closedWon] = await Promise.all([
        prisma.contact.count({ where: { assignedToId: agent.id, ...contactScope } }),
        prisma.opportunity.count({
          where: {
            assignedToId: agent.id,
            ...contactScope,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
        }),
        prisma.opportunity.count({
          where: {
            assignedToId: agent.id,
            ...contactScope,
            stage: 'CLOSED_WON',
            updatedAt: { gte: startOfMonth, lt: endOfMonth },
          },
        }),
      ]);

      return { agent, contacts, openOpportunities, closedWon };
    })
  );

  return performance;
};

export const getConversationStats = async (user: any) => {
  let baseWhere: any;

  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) baseWhere = { assignedTo: { agencyId: user.agencyId } };
    else baseWhere = { assignedToId: user.id };
  } else if (user.role === 'LOCATION_ADMIN') {
    baseWhere = user.locationId ? { assignedTo: { locationId: user.locationId } } : { assignedToId: user.id };
  } else if (user.role === 'TEAM_LEADER') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    baseWhere = {
      assignedToId: { in: [user.id, ...subAgents.map((a: any) => a.id)] },
    };
  } else {
    baseWhere = { assignedToId: user.id };
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [totalConversations, openConversations, resolvedToday, channelGroups] = await Promise.all([
    prisma.conversation.count({ where: baseWhere }),
    prisma.conversation.count({ where: { ...baseWhere, status: 'OPEN' } }),
    prisma.conversation.count({
      where: {
        ...baseWhere,
        status: 'RESOLVED',
        updatedAt: { gte: startOfToday, lt: endOfToday },
      },
    }),
    prisma.conversation.groupBy({
      by: ['channel'],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const byChannel = channelGroups.map((c: any) => ({
    channel: c.channel,
    count: c._count._all,
  }));

  return { totalConversations, openConversations, resolvedToday, byChannel };
};
