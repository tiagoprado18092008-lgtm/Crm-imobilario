import prisma from '../../config/database';
import { AutomationAction, automationEngine } from '../../utils/automation.engine';
import type { Step, AutomationTriggerConfig } from '../../types/automation.types';

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

// ═══════════════════════════════════════════════════════════════════════════
// V2 SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const listV2 = async (agencyId: string) => {
  return prisma.automation.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true, runs: true } },
    },
  });
};

export const getV2ById = async (id: string, agencyId: string) => {
  const automation = await prisma.automation.findFirst({
    where: { id, agencyId },
    include: {
      _count: { select: { enrollments: true, runs: true } },
      enrollments: {
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!automation) throw Object.assign(new Error('Automação não encontrada'), { status: 404 });
  return automation;
};

export const createV2 = async (
  agencyId: string,
  dto: {
    name: string;
    description?: string;
    trigger: AutomationTriggerConfig;
    steps: Step[];
  }
) => {
  return prisma.automation.create({
    data: {
      agencyId,
      name: dto.name,
      description: dto.description,
      trigger: dto.trigger as any,
      steps: (dto.steps || []) as any,
      isActive: true,
    },
  });
};

export const updateV2 = async (
  id: string,
  agencyId: string,
  dto: {
    name?: string;
    description?: string;
    isActive?: boolean;
    trigger?: AutomationTriggerConfig;
    steps?: Step[];
  }
) => {
  const existing = await prisma.automation.findFirst({ where: { id, agencyId } });
  if (!existing) throw Object.assign(new Error('Automação não encontrada'), { status: 404 });

  return prisma.automation.update({
    where: { id },
    data: {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      trigger: dto.trigger as any,
      steps: dto.steps as any,
    },
  });
};

export const deleteV2 = async (id: string, agencyId: string) => {
  const existing = await prisma.automation.findFirst({ where: { id, agencyId } });
  if (!existing) throw Object.assign(new Error('Automação não encontrada'), { status: 404 });
  await prisma.automation.delete({ where: { id } });
};

export const toggleV2 = async (id: string, agencyId: string) => {
  const automation = await prisma.automation.findFirst({ where: { id, agencyId } });
  if (!automation) throw Object.assign(new Error('Automação não encontrada'), { status: 404 });
  return prisma.automation.update({
    where: { id },
    data: { isActive: !automation.isActive },
  });
};

export const listEnrollments = async (automationId: string, agencyId: string) => {
  const automation = await prisma.automation.findFirst({ where: { id: automationId, agencyId } });
  if (!automation) throw Object.assign(new Error('Automação não encontrada'), { status: 404 });

  return prisma.automationEnrollment.findMany({
    where: { automationId },
    orderBy: { startedAt: 'desc' },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
};

export const triggerEnrollment = async (
  dto: { type: string; contactId: string; data?: Record<string, any> },
  agencyId: string
) => {
  const automations = await prisma.automation.findMany({
    where: { agencyId, isActive: true },
  });

  const matching = automations.filter((a: any) => {
    const trigger = a.trigger as any;
    return trigger?.type === dto.type;
  });

  await Promise.allSettled(
    matching.map((a: any) =>
      automationEngine.enrollContact(a.id, dto.contactId, dto.data)
    )
  );

  return { enrolled: matching.length };
};

export const fireEvent = async (dto: { event: string; contactId: string }) => {
  await automationEngine.resumeOnEvent(dto.event, dto.contactId);
};
