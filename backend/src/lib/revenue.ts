/**
 * MRR and client health.
 *
 * MRR is reported as a movement, not a level. "€2,400 this month" says nothing
 * about whether the business is growing: the same number can mean four new
 * clients and four churned, or a quiet month where nothing happened. The
 * decomposition is what makes it actionable.
 */

export type SubscriptionSnapshot = {
  companyId: string;
  monthlyValue: number;
  state: 'ATIVA' | 'EM_PAUSA' | 'CANCELADA';
};

export type MrrMovement = {
  /** Total at the end of the period. */
  mrr: number;
  /** From clients who had none last month. */
  newMrr: number;
  /** Existing clients paying more. */
  expansion: number;
  /** Existing clients paying less, still paying. */
  contraction: number;
  /** Clients who stopped paying entirely. Reported positive. */
  churn: number;
  /** newMrr + expansion − contraction − churn. */
  netNew: number;
  activeClients: number;
};

const toCents = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** MRR per company, counting only what is actually being billed. */
export function mrrByCompany(subs: SubscriptionSnapshot[]): Map<string, number> {
  const byCompany = new Map<string, number>();
  for (const sub of subs) {
    // Paused and cancelled retainers bill nothing. Counting a paused client
    // as revenue is how a forecast quietly becomes fiction.
    if (sub.state !== 'ATIVA') continue;
    byCompany.set(sub.companyId, toCents((byCompany.get(sub.companyId) ?? 0) + sub.monthlyValue));
  }
  return byCompany;
}

/**
 * Compares two months and reports the movement between them.
 *
 * Each company lands in exactly one bucket, so the parts always reconcile
 * against the totals — a decomposition that does not add up is worse than none.
 */
export function mrrMovement(
  previous: Map<string, number>,
  current: Map<string, number>,
): MrrMovement {
  let newMrr = 0;
  let expansion = 0;
  let contraction = 0;
  let churn = 0;

  for (const [companyId, now] of current) {
    const before = previous.get(companyId) ?? 0;
    if (before === 0) newMrr += now;
    else if (now > before) expansion += now - before;
    else if (now < before) contraction += before - now;
  }

  for (const [companyId, before] of previous) {
    if (!current.has(companyId) || current.get(companyId) === 0) churn += before;
  }

  const mrr = toCents([...current.values()].reduce((s, v) => s + v, 0));

  return {
    mrr,
    newMrr: toCents(newMrr),
    expansion: toCents(expansion),
    contraction: toCents(contraction),
    churn: toCents(churn),
    netNew: toCents(newMrr + expansion - contraction - churn),
    activeClients: [...current.values()].filter((v) => v > 0).length,
  };
}

/** Annual run rate. A projection of today's MRR, not a forecast. */
export function arr(mrr: number): number {
  return toCents(mrr * 12);
}

/**
 * Invoices grouped by how overdue they are.
 *
 * The buckets are the ones that change what you do: a week late is a reminder,
 * ninety days is a decision about the relationship.
 */
export type AgingBuckets = {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
};

export function agingBuckets(
  invoices: Array<{ total: number; dueAt: Date | null; state: string }>,
  now = new Date(),
): AgingBuckets {
  const buckets: AgingBuckets = {
    current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0,
  };

  for (const invoice of invoices) {
    // Only what is actually owed. Paid, draft and cancelled are not debt.
    if (invoice.state !== 'EMITIDA' && invoice.state !== 'VENCIDA') continue;

    const amount = invoice.total;
    buckets.total = toCents(buckets.total + amount);

    if (!invoice.dueAt || invoice.dueAt >= now) {
      buckets.current = toCents(buckets.current + amount);
      continue;
    }

    const daysLate = Math.floor((now.getTime() - invoice.dueAt.getTime()) / 86_400_000);
    if (daysLate <= 30) buckets.days1to30 = toCents(buckets.days1to30 + amount);
    else if (daysLate <= 60) buckets.days31to60 = toCents(buckets.days31to60 + amount);
    else if (daysLate <= 90) buckets.days61to90 = toCents(buckets.days61to90 + amount);
    else buckets.over90 = toCents(buckets.over90 + amount);
  }

  return buckets;
}

// ─── Client health ────────────────────────────────────────────────────────────

export type HealthInputs = {
  daysSinceContact: number | null;
  overdueInvoices: number;
  overdueTasks: number;
  daysSinceDelivery: number | null;
  hasActiveSubscription: boolean;
};

export type HealthResult = {
  status: 'VERDE' | 'AMARELO' | 'VERMELHO';
  /** Plain reasons, so the light can be argued with rather than obeyed. */
  reasons: string[];
  renewalRisk: boolean;
};

/**
 * A client's traffic light.
 *
 * Red is reserved for things that end relationships — money owed a long time,
 * or silence. Amber is for things worth a call this week. Anything that cannot
 * be explained in a sentence does not belong here.
 */
export function clientHealth(inputs: HealthInputs): HealthResult {
  const reasons: string[] = [];
  let red = false;
  let amber = false;

  if (inputs.overdueInvoices > 0) {
    reasons.push(
      `${inputs.overdueInvoices} fatura${inputs.overdueInvoices === 1 ? '' : 's'} por pagar`,
    );
    if (inputs.overdueInvoices >= 2) red = true;
    else amber = true;
  }

  if (inputs.daysSinceContact != null) {
    if (inputs.daysSinceContact > 60) {
      reasons.push(`Sem contacto há ${inputs.daysSinceContact} dias`);
      red = true;
    } else if (inputs.daysSinceContact > 30) {
      reasons.push(`Sem contacto há ${inputs.daysSinceContact} dias`);
      amber = true;
    }
  }

  if (inputs.overdueTasks > 0) {
    reasons.push(
      `${inputs.overdueTasks} tarefa${inputs.overdueTasks === 1 ? '' : 's'} em atraso`,
    );
    amber = true;
  }

  // Only meaningful for a retainer: a one-off website has nothing to deliver
  // after it ships.
  if (inputs.hasActiveSubscription && inputs.daysSinceDelivery != null) {
    if (inputs.daysSinceDelivery > 45) {
      reasons.push(`Sem entregas há ${inputs.daysSinceDelivery} dias`);
      red = true;
    } else if (inputs.daysSinceDelivery > 30) {
      reasons.push(`Sem entregas há ${inputs.daysSinceDelivery} dias`);
      amber = true;
    }
  }

  const status = red ? 'VERMELHO' : amber ? 'AMARELO' : 'VERDE';

  if (reasons.length === 0) reasons.push('Sem sinais de risco');

  return {
    status,
    reasons,
    // Only a retainer can fail to renew.
    renewalRisk: inputs.hasActiveSubscription && status === 'VERMELHO',
  };
}

/** The next billing date for a retainer, given its billing day. */
export function nextBillingDate(billingDay: number, from = new Date()): Date {
  // Capped at 28 so it exists in February.
  const day = Math.min(28, Math.max(1, billingDay));
  const next = new Date(from.getFullYear(), from.getMonth(), day);
  if (next <= from) next.setMonth(next.getMonth() + 1);
  return next;
}
