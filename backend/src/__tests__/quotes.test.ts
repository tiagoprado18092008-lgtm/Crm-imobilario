import {
  toCents,
  lineTotals,
  quoteTotals,
  formatEuro,
  isExpired,
  canAccept,
  type LineItem,
} from '../lib/quotes';

/**
 * Quote arithmetic, checked against the prices AlphaScale actually sells:
 * a €700 website, €250 ads setup, €200/month management.
 */

describe('toCents', () => {
  it('rounds to cents', () => {
    expect(toCents(10.004)).toBe(10);
    expect(toCents(10.005)).toBe(10.01);
    expect(toCents(10.006)).toBe(10.01);
  });

  it('survives the classic float case', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in binary floating point.
    expect(toCents(0.1 + 0.2)).toBe(0.3);
    expect(toCents(1.005)).toBe(1.01);
  });
});

describe('lineTotals', () => {
  it('computes a website at 23% VAT', () => {
    const t = lineTotals({ name: 'Website', quantity: 1, unitPrice: 700 });
    expect(t.net).toBe(700);
    expect(t.vat).toBe(161);
    expect(t.total).toBe(861);
  });

  it('multiplies by quantity', () => {
    const t = lineTotals({ name: 'Website', quantity: 3, unitPrice: 700 });
    expect(t.gross).toBe(2100);
    expect(t.total).toBe(2583);
  });

  it('applies a percentage discount before VAT', () => {
    // VAT is charged on what is actually paid, not on the list price.
    const t = lineTotals({ name: 'Website', quantity: 1, unitPrice: 700, discount: 10 });
    expect(t.discountAmount).toBe(70);
    expect(t.net).toBe(630);
    expect(t.vat).toBe(144.9);
    expect(t.total).toBe(774.9);
  });

  it('honours a non-standard VAT rate', () => {
    const t = lineTotals({ name: 'Isento', quantity: 1, unitPrice: 100, vatRate: 0 });
    expect(t.vat).toBe(0);
    expect(t.total).toBe(100);
  });

  it('clamps a discount above 100 rather than paying the client', () => {
    const t = lineTotals({ name: 'X', quantity: 1, unitPrice: 100, discount: 150 });
    expect(t.net).toBe(0);
    expect(t.total).toBe(0);
  });

  it('treats a negative quantity or price as zero', () => {
    expect(lineTotals({ name: 'X', quantity: -2, unitPrice: 100 }).total).toBe(0);
    expect(lineTotals({ name: 'X', quantity: 1, unitPrice: -50 }).total).toBe(0);
  });

  it('defaults to quantity one at 23%', () => {
    const t = lineTotals({ name: 'X', quantity: 1, unitPrice: 200 });
    expect(t.vat).toBe(46);
  });
});

describe('quoteTotals', () => {
  it('reports a website and a retainer as separate commitments', () => {
    // €700 one-off plus €200/month is not a €900 deal.
    const items: LineItem[] = [
      { name: 'Website', quantity: 1, unitPrice: 700, revenueType: 'ONE_OFF' },
      { name: 'Gestão Ads', quantity: 1, unitPrice: 200, revenueType: 'RECORRENTE' },
    ];
    const t = quoteTotals(items);
    expect(t.oneOff).toBe(700);
    expect(t.mrr).toBe(200);
    expect(t.subtotal).toBe(900);
    expect(t.vatTotal).toBe(207);
    expect(t.total).toBe(1107);
  });

  it('adds up the full first-month ads proposal', () => {
    const items: LineItem[] = [
      { name: 'Ads Setup', quantity: 1, unitPrice: 250, revenueType: 'ONE_OFF' },
      { name: 'Gestão Ads', quantity: 1, unitPrice: 200, revenueType: 'RECORRENTE' },
    ];
    const t = quoteTotals(items);
    expect(t.subtotal).toBe(450);
    expect(t.total).toBe(553.5);
    expect(t.mrr).toBe(200);
  });

  it('keeps the total equal to the sum of its printed lines', () => {
    // Rounding per line and again at the end is what makes a quote fail to
    // add up on the page.
    const items: LineItem[] = [
      { name: 'A', quantity: 3, unitPrice: 33.33 },
      { name: 'B', quantity: 7, unitPrice: 1.11 },
      { name: 'C', quantity: 1, unitPrice: 0.07 },
    ];
    const t = quoteTotals(items);
    const sumOfLines = toCents(t.lines.reduce((s, l) => s + l.total, 0));
    expect(t.total).toBe(sumOfLines);
  });

  it('sums discounts across lines', () => {
    const t = quoteTotals([
      { name: 'A', quantity: 1, unitPrice: 700, discount: 10 },
      { name: 'B', quantity: 1, unitPrice: 200, discount: 50 },
    ]);
    expect(t.discountTotal).toBe(170);
    expect(t.subtotal).toBe(730);
  });

  it('returns zeroes for an empty quote', () => {
    const t = quoteTotals([]);
    expect(t).toMatchObject({ subtotal: 0, vatTotal: 0, total: 0, mrr: 0, oneOff: 0 });
  });

  it('reports zero MRR when nothing recurs', () => {
    expect(quoteTotals([{ name: 'Website', quantity: 1, unitPrice: 700 }]).mrr).toBe(0);
  });
});

describe('formatEuro', () => {
  it('formats in the Portuguese convention', () => {
    // Non-breaking spaces vary by ICU build, so assert the parts.
    const out = formatEuro(1234.5);
    expect(out).toContain('€');
    expect(out).toContain('1');
    expect(out).toContain('234');
  });
});

describe('isExpired', () => {
  const now = new Date('2026-09-21T12:00:00Z');

  it('is false before the date', () => {
    expect(isExpired(new Date('2026-09-30T00:00:00Z'), now)).toBe(false);
  });

  it('is true after it', () => {
    expect(isExpired(new Date('2026-09-20T00:00:00Z'), now)).toBe(true);
  });

  it('never expires a quote with no date', () => {
    // No date means no deadline was agreed, not that it was today.
    expect(isExpired(null, now)).toBe(false);
    expect(isExpired(undefined, now)).toBe(false);
  });
});

describe('canAccept', () => {
  const now = new Date('2026-09-21T12:00:00Z');
  const future = new Date('2026-09-30T00:00:00Z');
  const past = new Date('2026-09-01T00:00:00Z');

  it('allows accepting a sent or viewed quote', () => {
    expect(canAccept('ENVIADA', future, now)).toBe(true);
    expect(canAccept('VISTA', future, now)).toBe(true);
  });

  it('refuses a draft, which the client should never have seen', () => {
    expect(canAccept('RASCUNHO', future, now)).toBe(false);
  });

  it('refuses one already answered', () => {
    expect(canAccept('ACEITE', future, now)).toBe(false);
    expect(canAccept('RECUSADA', future, now)).toBe(false);
  });

  it('refuses an expired quote even when the state still says sent', () => {
    // The date decides, not whether the nightly job has run yet.
    expect(canAccept('ENVIADA', past, now)).toBe(false);
  });
});
