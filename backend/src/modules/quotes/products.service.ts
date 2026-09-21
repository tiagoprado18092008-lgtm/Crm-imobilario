import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { quoteTotals, type LineItem } from '../../lib/quotes';

/**
 * Products and the line items that put them on a deal.
 *
 * A line item copies the product's name and price rather than referencing
 * them. Raising a price next year must not silently rewrite what was quoted
 * last year.
 */

export const list = async (user: any) =>
  prisma.product.findMany({
    where: withWorkspace(user, { isActive: true }),
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });

export const create = async (dto: any, user: any) =>
  prisma.product.create({
    data: {
      agencyId: workspaceIdFor(user),
      name: dto.name,
      description: dto.description ?? null,
      priceType: dto.priceType ?? 'UNICO',
      price: Number(dto.price ?? 0),
      vatRate: dto.vatRate != null ? Number(dto.vatRate) : 23,
      position: dto.position ?? 0,
    },
  });

export const update = async (id: string, dto: any, user: any) => {
  const existing = await prisma.product.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Produto não encontrado'), { status: 404 });

  return prisma.product.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.priceType !== undefined && { priceType: dto.priceType }),
      ...(dto.price !== undefined && { price: Number(dto.price) }),
      ...(dto.vatRate !== undefined && { vatRate: Number(dto.vatRate) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.position !== undefined && { position: dto.position }),
    },
  });
};

/**
 * Retires a product.
 *
 * Deactivated rather than deleted: line items keep their own copy of the
 * name and price, but a deleted product would break the link back to what
 * was sold.
 */
export const remove = async (id: string, user: any) => {
  const existing = await prisma.product.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Produto não encontrado'), { status: 404 });
  await prisma.product.update({ where: { id }, data: { isActive: false } });
};

// ─── Line items ───────────────────────────────────────────────────────────────

export const listItems = async (dealId: string, user: any) => {
  const deal = await prisma.opportunity.findFirst({
    where: withWorkspace(user, { id: dealId }),
    select: { id: true },
  });
  if (!deal) throw Object.assign(new Error('Negócio não encontrado'), { status: 404 });

  const items = await prisma.dealLineItem.findMany({
    where: { dealId },
    orderBy: { position: 'asc' },
  });

  return { items, totals: quoteTotals(items as unknown as LineItem[]) };
};

export const addItem = async (dealId: string, dto: any, user: any) => {
  const agencyId = workspaceIdFor(user);

  const deal = await prisma.opportunity.findFirst({
    where: withWorkspace(user, { id: dealId }),
    select: { id: true },
  });
  if (!deal) throw Object.assign(new Error('Negócio não encontrado'), { status: 404 });

  // Snapshot from the product when one is named, so the line stands alone.
  const product = dto.productId
    ? await prisma.product.findFirst({ where: withWorkspace(user, { id: dto.productId }) })
    : null;

  const count = await prisma.dealLineItem.count({ where: { dealId } });

  const item = await prisma.dealLineItem.create({
    data: {
      agencyId,
      dealId,
      productId: product?.id ?? null,
      name: dto.name ?? product?.name ?? 'Item',
      quantity: Number(dto.quantity ?? 1),
      unitPrice: Number(dto.unitPrice ?? product?.price ?? 0),
      discount: Number(dto.discount ?? 0),
      vatRate: Number(dto.vatRate ?? product?.vatRate ?? 23),
      revenueType:
        dto.revenueType ?? (product?.priceType === 'MENSAL' ? 'RECORRENTE' : 'ONE_OFF'),
      position: count,
    },
  });

  await syncDealValue(dealId);
  return item;
};

export const updateItem = async (id: string, dto: any, user: any) => {
  const existing = await prisma.dealLineItem.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Item não encontrado'), { status: 404 });

  const item = await prisma.dealLineItem.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.quantity !== undefined && { quantity: Number(dto.quantity) }),
      ...(dto.unitPrice !== undefined && { unitPrice: Number(dto.unitPrice) }),
      ...(dto.discount !== undefined && { discount: Number(dto.discount) }),
      ...(dto.vatRate !== undefined && { vatRate: Number(dto.vatRate) }),
      ...(dto.revenueType !== undefined && { revenueType: dto.revenueType }),
      ...(dto.position !== undefined && { position: dto.position }),
    },
  });

  await syncDealValue(existing.dealId);
  return item;
};

export const removeItem = async (id: string, user: any) => {
  const existing = await prisma.dealLineItem.findFirst({ where: withWorkspace(user, { id }) });
  if (!existing) throw Object.assign(new Error('Item não encontrado'), { status: 404 });

  await prisma.dealLineItem.delete({ where: { id } });
  await syncDealValue(existing.dealId);
};

/**
 * Keeps the deal's headline value equal to its line items.
 *
 * The board and the forecast read `value`, so leaving it out of step with the
 * lines makes both wrong. Net of VAT: a pipeline reported including tax
 * overstates what the business actually earns.
 */
async function syncDealValue(dealId: string): Promise<void> {
  const items = await prisma.dealLineItem.findMany({ where: { dealId } });
  const totals = quoteTotals(items as unknown as LineItem[]);

  await prisma.opportunity.update({
    where: { id: dealId },
    data: { value: totals.subtotal },
  });
}
