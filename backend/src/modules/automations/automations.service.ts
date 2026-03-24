import prisma from '../../config/database';
import { AutomationAction } from '../../utils/automation.engine';

export const list = async () => {
  return prisma.automationRule.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { logs: true } } },
  });
};

export const getById = async (id: string) => {
  const rule = await prisma.automationRule.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { executedAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!rule) {
    throw Object.assign(new Error('Automation rule not found'), { status: 404 });
  }
  return rule;
};

export const create = async (dto: {
  name: string;
  trigger: string;
  isActive?: boolean;
  actions: AutomationAction[];
}) => {
  return prisma.automationRule.create({
    data: {
      name: dto.name,
      trigger: dto.trigger,
      isActive: dto.isActive ?? true,
      actions: JSON.stringify(dto.actions),
    },
  });
};

export const update = async (
  id: string,
  dto: {
    name?: string;
    trigger?: string;
    isActive?: boolean;
    actions?: AutomationAction[];
  }
) => {
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw Object.assign(new Error('Automation rule not found'), { status: 404 });

  return prisma.automationRule.update({
    where: { id },
    data: {
      name: dto.name,
      trigger: dto.trigger,
      isActive: dto.isActive,
      actions: dto.actions !== undefined ? JSON.stringify(dto.actions) : undefined,
    },
  });
};

export const remove = async (id: string) => {
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw Object.assign(new Error('Automation rule not found'), { status: 404 });
  await prisma.automationRule.delete({ where: { id } });
};

export const getLogs = async (filters: { ruleId?: string; contactId?: string; limit?: number }) => {
  return prisma.automationLog.findMany({
    where: {
      ruleId: filters.ruleId,
      contactId: filters.contactId,
    },
    orderBy: { executedAt: 'desc' },
    take: filters.limit ?? 50,
    include: {
      rule: { select: { id: true, name: true, trigger: true } },
    },
  });
};
