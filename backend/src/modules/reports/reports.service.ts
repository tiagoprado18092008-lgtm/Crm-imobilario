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

  const [
    totalContacts,
    totalLeads,
    totalClients,
    openOpportunities,
    pipelineAgg,
    tasksDueToday,
    closedWonThisMonth,
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
  ]);

  return {
    totalContacts,
    totalLeads,
    totalClients,
    openOpportunities,
    pipelineValue: pipelineAgg._sum.value ?? 0,
    tasksDueToday,
    closedWonThisMonth,
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

export const getAgentPerformance = async () => {
  const agents = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['TEAM_LEADER', 'CONSULTANT'] as any[] } },
    select: { id: true, name: true, email: true, role: true },
  });

  const performance = await Promise.all(
    agents.map(async (agent) => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      const [contacts, openOpportunities, closedWon] = await Promise.all([
        prisma.contact.count({ where: { assignedToId: agent.id } }),
        prisma.opportunity.count({
          where: {
            assignedToId: agent.id,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
        }),
        prisma.opportunity.count({
          where: {
            assignedToId: agent.id,
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
  let baseWhere: any = {};

  if (user.role !== 'AGENCY_OWNER' && user.role !== 'AGENCY_ADMIN') {
    if (user.role === 'TEAM_LEADER') {
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
