/**
 * Quote arithmetic.
 *
 * Money is rounded to cents at every step rather than only at the end,
 * because a total that does not equal the sum of its printed lines is the
 * first thing a client notices and the hardest thing to explain. VAT is
 * computed per line, since not everything sold carries the same rate.
 */

export type LineItem = {
  name: string;
  quantity: number;
  /** Net of VAT. */
  unitPrice: number;
  /** Percentage off the line, 0-100. */
  discount?: number;
  /** Percentage, e.g. 23. */
  vatRate?: number;
  revenueType?: 'ONE_OFF' | 'RECORRENTE';
};

export type LineTotals = {
  /** Before discount. */
  gross: number;
  discountAmount: number;
  /** After discount, before VAT. */
  net: number;
  vat: number;
  total: number;
};

export type QuoteTotals = {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  /** Monthly recurring component, net of VAT. A proposal mixing a one-off
   *  website with a retainer is two commitments, and they are reported apart. */
  mrr: number;
  oneOff: number;
  lines: LineTotals[];
};

/** Rounds to cents, away from zero, avoiding the float-binary surprise. */
export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineTotals(item: LineItem): LineTotals {
  const quantity = Math.max(0, item.quantity ?? 1);
  const unitPrice = Math.max(0, item.unitPrice ?? 0);
  const discountPct = Math.min(100, Math.max(0, item.discount ?? 0));
  const vatRate = Math.max(0, item.vatRate ?? 23);

  const gross = toCents(quantity * unitPrice);
  const discountAmount = toCents(gross * (discountPct / 100));
  const net = toCents(gross - discountAmount);
  const vat = toCents(net * (vatRate / 100));

  return { gross, discountAmount, net, vat, total: toCents(net + vat) };
}

export function quoteTotals(items: LineItem[]): QuoteTotals {
  const lines = items.map(lineTotals);

  const subtotal = toCents(lines.reduce((s, l) => s + l.net, 0));
  const discountTotal = toCents(lines.reduce((s, l) => s + l.discountAmount, 0));
  const vatTotal = toCents(lines.reduce((s, l) => s + l.vat, 0));

  // Monthly and one-off are summed separately: adding a €200/month retainer to
  // a €700 website gives a number that means nothing.
  const mrr = toCents(
    items.reduce(
      (s, item, i) => (item.revenueType === 'RECORRENTE' ? s + lines[i].net : s),
      0,
    ),
  );
  const oneOff = toCents(
    items.reduce(
      (s, item, i) => (item.revenueType === 'RECORRENTE' ? s : s + lines[i].net),
      0,
    ),
  );

  return {
    subtotal,
    discountTotal,
    vatTotal,
    total: toCents(subtotal + vatTotal),
    mrr,
    oneOff,
    lines,
  };
}

/** Formats in euros, Portuguese convention. */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

/**
 * Whether a quote has passed its validity date.
 *
 * A quote without one never expires, which is deliberate: an absent date means
 * no deadline was agreed, not that the deadline was today.
 */
export function isExpired(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil < now;
}

/**
 * Whether the state still allows the client to accept.
 *
 * An expired quote is not acceptable even if nobody has run the job that
 * marks it so — the date decides, not the stored state.
 */
export function canAccept(
  state: string,
  validUntil: Date | null | undefined,
  now = new Date(),
): boolean {
  if (isExpired(validUntil, now)) return false;
  return state === 'ENVIADA' || state === 'VISTA';
}
