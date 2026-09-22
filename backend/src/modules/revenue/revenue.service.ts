import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import {
  mrrByCompany,
  mrrMovement,
  arr,
  agingBuckets,
  clientHealth,
  nextBillingDate,
} from '../../lib/revenue';

/**
 * Revenue.
 *
 * Half the business lives here: one-off websites pay for a month, retainers
 * pay for the year. Before this the CRM reported "Total Clientes: 0" while the
 * agency had paying clients, because nothing recorded them.
 */

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const listSubscriptions = async (
  filters: { state?: string; companyId?: string },
  user: any,
) => {
  const where: any = withWorkspace(user, {});
  if (filters.state) where.state = filters.state;
  if (filters.companyId) where.companyId = filters.companyId;

  return prisma.subscription.findMany({
    where,
    orderBy: [{ state: 'asc' }, { renewsAt: 'asc' }],
    include: { company: { select: { id: true, name: true, sector: true } } },
    take: 200,
  });
};

export const createSubscription = async (dto: any, user: any) => {
  const agencyId = workspaceIdFor(user);
  const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
  const billingDay = dto.billingDay ?? startDate.getDate();

  return prisma.subscription.create({
    data: {
      agencyId,
      companyId: dto.companyId,
      productId: dto.productId ?? null,
      dealId: dto.dealId ?? null,
      name: dto.name,
      monthlyValue: Number(dto.monthlyValue ?? 0),
      billingDay: Math.min(28, Math.max(1, billingDay)),
      startDate,
      renewsAt: nextBillingDate(billingDay, startDate),
      state: 'ATIVA',
    },
  });
};

export const updateSubscription = async (id: string, dto: any, user: any) => {
  const existing = await prisma.subscription.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Avença não encontrada'), { status: 404 });

  // Cancelling is a date and a reason, not just a state: "why" is what makes
  // churn analysable later.
  const cancelling = dto.state === 'CANCELADA' && existing.state !== 'CANCELADA';

  return prisma.subscription.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.monthlyValue !== undefined && { monthlyValue: Number(dto.monthlyValue) }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.billingDay !== undefined && {
        billingDay: Math.min(28, Math.max(1, Number(dto.billingDay))),
        renewsAt: nextBillingDate(Number(dto.billingDay)),
      }),
      ...(cancelling && {
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason ?? null,
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
      }),
    },
  });
};

/**
 * Opens retainers for the recurring lines of a won deal.
 *
 * Idempotent on the deal, so winning twice does not bill the client twice.
 */
export const createFromWonDeal = async (dealId: string, user: any) => {
  const agencyId = workspaceIdFor(user);

  const deal = await prisma.opportunity.findFirst({
    where: withWorkspace(user, { id: dealId }),
    include: { lineItems: true },
  });
  if (!deal?.companyId) return { created: 0 };

  const existing = await prisma.subscription.count({ where: { dealId } });
  if (existing > 0) return { created: 0 };

  const recurring = deal.lineItems.filter((i) => i.revenueType === 'RECORRENTE');
  if (recurring.length === 0) return { created: 0 };

  const startDate = new Date();
  const billingDay = Math.min(28, startDate.getDate());

  await prisma.subscription.createMany({
    data: recurring.map((item) => ({
      agencyId,
      companyId: deal.companyId!,
      productId: item.productId,
      dealId: deal.id,
      name: item.name,
      // Net of discount, which is what is actually billed.
      monthlyValue: item.unitPrice * item.quantity * (1 - item.discount / 100),
      billingDay,
      startDate,
      renewsAt: nextBillingDate(billingDay, startDate),
      state: 'ATIVA' as const,
    })),
  });

  return { created: recurring.length };
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const listInvoices = async (filters: { state?: string; companyId?: string }, user: any) => {
  const where: any = withWorkspace(user, {});
  if (filters.state) where.state = filters.state;
  if (filters.companyId) where.companyId = filters.companyId;

  return prisma.invoice.findMany({
    where,
    orderBy: [{ issuedAt: 'desc' }, { number: 'desc' }],
    include: { company: { select: { id: true, name: true } } },
    take: 200,
  });
};

export const createInvoice = async (dto: any, user: any) => {
  const agencyId = workspaceIdFor(user);

  const last = await prisma.invoice.findFirst({
    where: { agencyId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  const amount = Number(dto.amount ?? 0);
  const vatAmount = dto.vatAmount != null ? Number(dto.vatAmount) : amount * 0.23;

  return prisma.invoice.create({
    data: {
      agencyId,
      companyId: dto.companyId,
      subscriptionId: dto.subscriptionId ?? null,
      dealId: dto.dealId ?? null,
      number: (last?.number ?? 0) + 1,
      amount,
      vatAmount,
      total: amount + vatAmount,
      state: dto.state ?? 'RASCUNHO',
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      notes: dto.notes ?? null,
    },
  });
};

export const updateInvoice = async (id: string, dto: any, user: any) => {
  const existing = await prisma.invoice.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Fatura não encontrada'), { status: 404 });

  const stamps: any = {};
  if (dto.state === 'EMITIDA' && !existing.issuedAt) stamps.issuedAt = new Date();
  if (dto.state === 'PAGA') stamps.paidAt = new Date();

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.externalRef !== undefined && { externalRef: dto.externalRef }),
      ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...stamps,
    },
  });
};

/** Marks issued invoices past their due date as overdue. */
export const markOverdue = async (): Promise<number> => {
  const result = await prisma.invoice.updateMany({
    where: { state: 'EMITIDA', dueAt: { lt: new Date() } },
    data: { state: 'VENCIDA' },
  });
  return result.count;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * The revenue picture: MRR as a movement, the aging of what is owed, and the
 * retainers coming up for renewal.
 */
export const overview = async (user: any) => {
  const where = withWorkspace(user, {});

  const [subs, invoices, lastSnapshot] = await Promise.all([
    prisma.subscription.findMany({
      where,
      select: { companyId: true, monthlyValue: true, state: true },
    }),
    prisma.invoice.findMany({
      where,
      select: { total: true, dueAt: true, state: true },
    }),
    prisma.revenueSnapshot.findFirst({
      where,
      orderBy: { month: 'desc' },
    }),
  ]);

  const current = mrrByCompany(subs as any);
  const mrr = [...current.values()].reduce((s, v) => s + v, 0);

  // Month-on-month movement needs last month's per-company figures, which only
  // a snapshot has. Without one the change is reported as unknown rather than
  // computed against an empty map, which would label every client as new.
  const movement = lastSnapshot
    ? {
        mrr: Math.round(mrr * 100) / 100,
        newMrr: lastSnapshot.newMrr,
        expansion: lastSnapshot.expansion,
        contraction: lastSnapshot.contraction,
        churn: lastSnapshot.churn,
        netNew: Math.round((mrr - lastSnapshot.mrr) * 100) / 100,
        activeClients: [...current.values()].filter((v) => v > 0).length,
      }
    : null;

  const aging = agingBuckets(invoices as any);

  const renewals = await prisma.subscription.findMany({
    where: {
      ...where,
      state: 'ATIVA',
      renewsAt: { lte: new Date(Date.now() + 30 * 86_400_000) },
    },
    orderBy: { renewsAt: 'asc' },
    include: { company: { select: { id: true, name: true } } },
    take: 20,
  });

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: arr(mrr),
    activeClients: [...current.values()].filter((v) => v > 0).length,
    /** Null until there is a prior month to compare against. */
    movement,
    /** Null when there is no prior month to compare against. */
    previousMonth: lastSnapshot ? { mrr: lastSnapshot.mrr, month: lastSnapshot.month } : null,
    aging,
    renewals,
  };
};

/**
 * Records this month's MRR.
 *
 * Snapshotting means the revenue chart is a read rather than a recomputation
 * over every subscription's history, and it is what makes month-on-month
 * movement reportable at all.
 */
export const snapshotMonth = async (user: any) => {
  const agencyId = workspaceIdFor(user);
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const subs = await prisma.subscription.findMany({
    where: { agencyId },
    select: { companyId: true, monthlyValue: true, state: true },
  });

  const current = mrrByCompany(subs as any);

  const prior = await prisma.revenueSnapshot.findFirst({
    where: { agencyId, month: previousMonth },
  });

  // Last month's per-company figures come from the subscriptions that were
  // active then: anything started this month, and anything cancelled during
  // it, is excluded.
  const priorSubs = await prisma.subscription.findMany({
    where: {
      agencyId,
      startDate: { lt: month },
      OR: [{ endDate: null }, { endDate: { gte: month } }],
    },
    select: { companyId: true, monthlyValue: true, state: true },
  });

  // A subscription cancelled this month was active last month, so it counts
  // towards the previous total even though its state now says cancelled.
  const previous = mrrByCompany(
    priorSubs.map((s) => ({ ...s, state: 'ATIVA' as const })),
  );

  const movement = mrrMovement(previous, current);

  return prisma.revenueSnapshot.upsert({
    where: { agencyId_month: { agencyId, month } },
    create: {
      agencyId,
      month,
      mrr: movement.mrr,
      newMrr: movement.newMrr,
      expansion: movement.expansion,
      contraction: movement.contraction,
      churn: movement.churn,
      activeClients: movement.activeClients,
    },
    update: {
      mrr: movement.mrr,
      activeClients: movement.activeClients,
    },
  });
};

// ─── Client health ────────────────────────────────────────────────────────────

/** Recomputes the traffic light for every client with a retainer or invoices. */
export const refreshHealth = async (user: any) => {
  const agencyId = workspaceIdFor(user);

  const companies = await prisma.company.findMany({
    where: { agencyId, type: 'CLIENTE', deletedAt: null },
    select: { id: true },
  });

  let updated = 0;

  for (const company of companies) {
    const [subs, overdueInvoices, overdueTasks, lastContact, lastDelivery] = await Promise.all([
      prisma.subscription.count({ where: { companyId: company.id, agencyId, state: 'ATIVA' } }),
      prisma.invoice.count({ where: { companyId: company.id, agencyId, state: 'VENCIDA' } }),
      prisma.projectTask.count({
        where: { agencyId, project: { companyId: company.id }, isDone: false, dueDate: { lt: new Date() } },
      }),
      prisma.contact.findFirst({
        where: { companyId: company.id, agencyId },
        orderBy: { lastContactedAt: 'desc' },
        select: { lastContactedAt: true },
      }),
      prisma.project.findFirst({
        where: { companyId: company.id, agencyId, deliveredAt: { not: null } },
        orderBy: { deliveredAt: 'desc' },
        select: { deliveredAt: true },
      }),
    ]);

    const daysSince = (d: Date | null | undefined) =>
      d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;

    const health = clientHealth({
      daysSinceContact: daysSince(lastContact?.lastContactedAt),
      overdueInvoices,
      overdueTasks,
      daysSinceDelivery: daysSince(lastDelivery?.deliveredAt),
      hasActiveSubscription: subs > 0,
    });

    await prisma.clientHealth.upsert({
      where: { companyId: company.id },
      create: {
        agencyId,
        companyId: company.id,
        status: health.status,
        reasons: health.reasons,
        renewalRisk: health.renewalRisk,
        overdueInvoices,
        overdueTasks,
        daysSinceContact: daysSince(lastContact?.lastContactedAt),
        daysSinceDelivery: daysSince(lastDelivery?.deliveredAt),
      },
      update: {
        status: health.status,
        reasons: health.reasons,
        renewalRisk: health.renewalRisk,
        overdueInvoices,
        overdueTasks,
        daysSinceContact: daysSince(lastContact?.lastContactedAt),
        daysSinceDelivery: daysSince(lastDelivery?.deliveredAt),
        computedAt: new Date(),
      },
    });

    updated++;
  }

  return { updated };
};

/** Clients with their health, for the client list. */
export const listClients = async (user: any) => {
  return prisma.company.findMany({
    where: withWorkspace(user, { type: 'CLIENTE', deletedAt: null }) as any,
    orderBy: { name: 'asc' },
    include: {
      health: true,
      subscriptions: { where: { state: 'ATIVA' }, select: { id: true, name: true, monthlyValue: true } },
      _count: { select: { projects: true } },
    },
    take: 200,
  });
};

/** CSV for the accountant. Certified invoicing stays out of scope. */
export const exportInvoicesCsv = async (user: any): Promise<string> => {
  const invoices = await prisma.invoice.findMany({
    where: withWorkspace(user, { state: { in: ['EMITIDA', 'PAGA', 'VENCIDA'] } }) as any,
    orderBy: { number: 'asc' },
    include: { company: { select: { name: true, nif: true } } },
  }) as Array<any>;

  const header = 'Numero;Cliente;NIF;Base;IVA;Total;Estado;Emitida;Vencimento;Paga;Referencia';
  const rows = invoices.map((i) =>
    [
      i.number,
      (i.company?.name ?? '').replace(/;/g, ','),
      i.company?.nif ?? '',
      i.amount.toFixed(2),
      i.vatAmount.toFixed(2),
      i.total.toFixed(2),
      i.state,
      i.issuedAt?.toISOString().slice(0, 10) ?? '',
      i.dueAt?.toISOString().slice(0, 10) ?? '',
      i.paidAt?.toISOString().slice(0, 10) ?? '',
      i.externalRef ?? '',
    ].join(';'),
  );

  return [header, ...rows].join('\n');
};
