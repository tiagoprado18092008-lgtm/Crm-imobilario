import {
  mrrByCompany,
  mrrMovement,
  arr,
  agingBuckets,
  clientHealth,
  nextBillingDate,
} from '../lib/revenue';

const sub = (companyId: string, monthlyValue: number, state: any = 'ATIVA') => ({
  companyId,
  monthlyValue,
  state,
});

describe('mrrByCompany', () => {
  it('sums a company with more than one retainer', () => {
    // Ads plus social for the same clinic is one client at €400.
    const m = mrrByCompany([sub('c1', 200), sub('c1', 200)]);
    expect(m.get('c1')).toBe(400);
  });

  it('ignores paused and cancelled retainers', () => {
    // Counting a paused client as revenue is how a forecast becomes fiction.
    const m = mrrByCompany([sub('c1', 200, 'EM_PAUSA'), sub('c2', 200, 'CANCELADA')]);
    expect(m.size).toBe(0);
  });

  it('is empty for no subscriptions', () => {
    expect(mrrByCompany([]).size).toBe(0);
  });
});

describe('mrrMovement', () => {
  const map = (entries: Array<[string, number]>) => new Map(entries);

  it('counts a first-time client as new', () => {
    const m = mrrMovement(map([]), map([['c1', 200]]));
    expect(m).toMatchObject({ mrr: 200, newMrr: 200, expansion: 0, contraction: 0, churn: 0 });
  });

  it('counts an upsell as expansion, not as new', () => {
    // €200 to €400 is €200 of expansion, not €400 of new business.
    const m = mrrMovement(map([['c1', 200]]), map([['c1', 400]]));
    expect(m.expansion).toBe(200);
    expect(m.newMrr).toBe(0);
  });

  it('counts a downgrade as contraction, not churn', () => {
    // The client is still paying. Calling that churn overstates the loss.
    const m = mrrMovement(map([['c1', 400]]), map([['c1', 200]]));
    expect(m.contraction).toBe(200);
    expect(m.churn).toBe(0);
  });

  it('counts a departure as churn, reported positive', () => {
    const m = mrrMovement(map([['c1', 200]]), map([]));
    expect(m.churn).toBe(200);
    expect(m.mrr).toBe(0);
  });

  it('treats a company dropping to zero as churn', () => {
    const m = mrrMovement(map([['c1', 200]]), map([['c1', 0]]));
    expect(m.churn).toBe(200);
  });

  it('reconciles: the parts explain the change in the total', () => {
    // A decomposition that does not add up is worse than none.
    const previous = map([['a', 200], ['b', 400], ['c', 100]]);
    const current = map([['a', 200], ['b', 600], ['d', 300]]);
    const m = mrrMovement(previous, current);

    const previousTotal = 700;
    expect(m.mrr).toBe(1100);
    expect(m.newMrr).toBe(300);      // d
    expect(m.expansion).toBe(200);   // b
    expect(m.contraction).toBe(0);
    expect(m.churn).toBe(100);       // c
    expect(previousTotal + m.netNew).toBe(m.mrr);
  });

  it('nets out a month of equal growth and loss', () => {
    const m = mrrMovement(map([['a', 200]]), map([['b', 200]]));
    expect(m.netNew).toBe(0);
    expect(m.newMrr).toBe(200);
    expect(m.churn).toBe(200);
  });

  it('counts only paying clients as active', () => {
    const m = mrrMovement(map([]), map([['a', 200], ['b', 0]]));
    expect(m.activeClients).toBe(1);
  });

  it('reports a quiet month as all zeroes', () => {
    const same = map([['a', 200]]);
    const m = mrrMovement(same, new Map(same));
    expect(m).toMatchObject({ newMrr: 0, expansion: 0, contraction: 0, churn: 0, netNew: 0 });
  });
});

describe('arr', () => {
  it('is twelve months of the current MRR', () => {
    expect(arr(200)).toBe(2400);
    expect(arr(0)).toBe(0);
  });
});

describe('agingBuckets', () => {
  const now = new Date('2026-09-22T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it('counts only what is actually owed', () => {
    // Paid, draft and cancelled invoices are not debt.
    const b = agingBuckets(
      [
        { total: 100, dueAt: daysAgo(10), state: 'PAGA' },
        { total: 200, dueAt: daysAgo(10), state: 'RASCUNHO' },
        { total: 300, dueAt: daysAgo(10), state: 'ANULADA' },
        { total: 400, dueAt: daysAgo(10), state: 'EMITIDA' },
      ],
      now,
    );
    expect(b.total).toBe(400);
  });

  it('puts an invoice not yet due in current', () => {
    const b = agingBuckets(
      [{ total: 500, dueAt: new Date(now.getTime() + 86_400_000), state: 'EMITIDA' }],
      now,
    );
    expect(b.current).toBe(500);
    expect(b.days1to30).toBe(0);
  });

  it('buckets by how late it is', () => {
    const b = agingBuckets(
      [
        { total: 100, dueAt: daysAgo(10), state: 'VENCIDA' },
        { total: 200, dueAt: daysAgo(45), state: 'VENCIDA' },
        { total: 300, dueAt: daysAgo(75), state: 'VENCIDA' },
        { total: 400, dueAt: daysAgo(120), state: 'VENCIDA' },
      ],
      now,
    );
    expect(b.days1to30).toBe(100);
    expect(b.days31to60).toBe(200);
    expect(b.days61to90).toBe(300);
    expect(b.over90).toBe(400);
    expect(b.total).toBe(1000);
  });

  it('treats an invoice with no due date as current', () => {
    const b = agingBuckets([{ total: 100, dueAt: null, state: 'EMITIDA' }], now);
    expect(b.current).toBe(100);
  });

  it('is all zeroes with nothing outstanding', () => {
    expect(agingBuckets([], now).total).toBe(0);
  });
});

describe('clientHealth', () => {
  const base = {
    daysSinceContact: 5,
    overdueInvoices: 0,
    overdueTasks: 0,
    daysSinceDelivery: 5,
    hasActiveSubscription: true,
  };

  it('is green when nothing is wrong, and says so', () => {
    const h = clientHealth(base);
    expect(h.status).toBe('VERDE');
    expect(h.reasons).toEqual(['Sem sinais de risco']);
    expect(h.renewalRisk).toBe(false);
  });

  it('turns red on two or more unpaid invoices', () => {
    const h = clientHealth({ ...base, overdueInvoices: 2 });
    expect(h.status).toBe('VERMELHO');
    expect(h.reasons[0]).toMatch(/2 faturas/);
  });

  it('is only amber for a single unpaid invoice', () => {
    // One late invoice is a reminder, not a crisis.
    expect(clientHealth({ ...base, overdueInvoices: 1 }).status).toBe('AMARELO');
  });

  it('escalates silence from amber to red', () => {
    expect(clientHealth({ ...base, daysSinceContact: 40 }).status).toBe('AMARELO');
    expect(clientHealth({ ...base, daysSinceContact: 70 }).status).toBe('VERMELHO');
  });

  it('flags overdue work as amber', () => {
    const h = clientHealth({ ...base, overdueTasks: 3 });
    expect(h.status).toBe('AMARELO');
    expect(h.reasons.some((r) => r.includes('3 tarefas'))).toBe(true);
  });

  it('ignores delivery gaps for a client with no retainer', () => {
    // A one-off website has nothing to deliver after it ships.
    const h = clientHealth({ ...base, hasActiveSubscription: false, daysSinceDelivery: 90 });
    expect(h.status).toBe('VERDE');
  });

  it('flags a retainer with no deliveries', () => {
    expect(clientHealth({ ...base, daysSinceDelivery: 35 }).status).toBe('AMARELO');
    expect(clientHealth({ ...base, daysSinceDelivery: 60 }).status).toBe('VERMELHO');
  });

  it('marks renewal risk only for a red retainer', () => {
    expect(clientHealth({ ...base, overdueInvoices: 2 }).renewalRisk).toBe(true);
    expect(
      clientHealth({ ...base, overdueInvoices: 2, hasActiveSubscription: false }).renewalRisk,
    ).toBe(false);
    expect(clientHealth({ ...base, overdueInvoices: 1 }).renewalRisk).toBe(false);
  });

  it('gives every reason, not just the worst one', () => {
    const h = clientHealth({ ...base, overdueInvoices: 2, overdueTasks: 1, daysSinceContact: 40 });
    expect(h.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('copes with a client never contacted', () => {
    expect(clientHealth({ ...base, daysSinceContact: null }).status).toBe('VERDE');
  });
});

describe('nextBillingDate', () => {
  it('is this month when the day is still ahead', () => {
    const next = nextBillingDate(25, new Date('2026-09-22T10:00:00'));
    expect(next.getMonth()).toBe(8);
    expect(next.getDate()).toBe(25);
  });

  it('rolls to next month once the day has passed', () => {
    const next = nextBillingDate(5, new Date('2026-09-22T10:00:00'));
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(5);
  });

  it('caps at the 28th so the date exists in February', () => {
    const next = nextBillingDate(31, new Date('2026-01-15T10:00:00'));
    expect(next.getDate()).toBe(28);
  });

  it('clamps a nonsensical day rather than producing an invalid date', () => {
    expect(nextBillingDate(0, new Date('2026-09-22T10:00:00')).getDate()).toBe(1);
  });
});
