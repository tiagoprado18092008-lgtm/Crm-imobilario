import crypto from 'crypto';
import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { quoteTotals, canAccept, isExpired, type LineItem } from '../../lib/quotes';

/**
 * Proposals.
 *
 * A quote snapshots what was offered. Line items on the deal may change
 * afterwards — prices rise, scope moves — but a quote the client has seen must
 * keep showing what they were told, or the document stops being evidence of
 * anything.
 */

const SELECT = {
  id: true,
  number: true,
  version: true,
  state: true,
  subtotal: true,
  vatTotal: true,
  total: true,
  mrr: true,
  validUntil: true,
  notes: true,
  publicToken: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  createdAt: true,
} as const;

/** Unguessable; the id is sequential enough to enumerate. */
const newPublicToken = () => crypto.randomBytes(24).toString('base64url');

export const list = async (filters: { dealId?: string; state?: string }, user: any) => {
  const where: any = withWorkspace(user, {});
  if (filters.dealId) where.dealId = filters.dealId;
  if (filters.state) where.state = filters.state;

  return prisma.quote.findMany({
    where,
    orderBy: [{ number: 'desc' }, { version: 'desc' }],
    select: { ...SELECT, deal: { select: { id: true, title: true } } },
    take: 100,
  });
};

export const getById = async (id: string, user: any) => {
  const quote = await prisma.quote.findFirst({
    where: withWorkspace(user, { id }),
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          contact: { select: { id: true, name: true, email: true } },
          company: { select: { id: true, name: true, nif: true, address: true } },
          lineItems: { orderBy: { position: 'asc' } },
        },
      },
    },
  });
  if (!quote) throw Object.assign(new Error('Proposta não encontrada'), { status: 404 });
  return quote;
};

/**
 * Creates a quote from the deal's current line items.
 *
 * Refuses on a deal with no lines: an empty proposal is never what anyone
 * meant to send.
 */
export const create = async (
  dto: { dealId: string; validUntil?: string; notes?: string },
  user: any,
) => {
  const agencyId = workspaceIdFor(user);

  const deal = await prisma.opportunity.findFirst({
    where: withWorkspace(user, { id: dto.dealId }),
    include: { lineItems: { orderBy: { position: 'asc' } } },
  });
  if (!deal) throw Object.assign(new Error('Negócio não encontrado'), { status: 404 });

  if (deal.lineItems.length === 0) {
    throw Object.assign(
      new Error('Adiciona produtos ao negócio antes de criar a proposta'),
      { status: 422 },
    );
  }

  const totals = quoteTotals(deal.lineItems as unknown as LineItem[]);

  // Sequential per workspace, so a quote can be referred to out loud.
  const last = await prisma.quote.findFirst({
    where: { agencyId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  return prisma.quote.create({
    data: {
      agencyId,
      dealId: deal.id,
      number: (last?.number ?? 0) + 1,
      version: 1,
      state: 'RASCUNHO',
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      mrr: totals.mrr,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : defaultValidity(),
      notes: dto.notes ?? null,
      publicToken: newPublicToken(),
    },
    select: SELECT,
  });
};

/**
 * Supersedes a quote with a new version.
 *
 * The old one is marked rejected rather than edited: a client may have the
 * previous PDF, and rewriting it under them would make the two disagree.
 */
export const revise = async (id: string, user: any) => {
  const previous = await getById(id, user);
  const agencyId = workspaceIdFor(user);

  const totals = quoteTotals(previous.deal.lineItems as unknown as LineItem[]);

  return prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id },
      data: { state: 'RECUSADA', rejectedAt: new Date() },
    });

    return tx.quote.create({
      data: {
        agencyId,
        dealId: previous.dealId,
        number: previous.number,
        version: previous.version + 1,
        state: 'RASCUNHO',
        subtotal: totals.subtotal,
        vatTotal: totals.vatTotal,
        total: totals.total,
        mrr: totals.mrr,
        validUntil: defaultValidity(),
        notes: previous.notes,
        publicToken: newPublicToken(),
      },
      select: SELECT,
    });
  });
};

/** Marks a quote as sent and freezes its totals. */
export const send = async (id: string, user: any) => {
  const quote = await getById(id, user);
  if (quote.state !== 'RASCUNHO') {
    throw Object.assign(new Error('A proposta já foi enviada'), { status: 409 });
  }

  const totals = quoteTotals(quote.deal.lineItems as unknown as LineItem[]);

  return prisma.quote.update({
    where: { id },
    data: {
      state: 'ENVIADA',
      sentAt: new Date(),
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      mrr: totals.mrr,
    },
    select: SELECT,
  });
};

/**
 * The public view, by token.
 *
 * No workspace filter, because the recipient has no session — the token is the
 * authorisation. It is 24 random bytes and single-purpose.
 */
export const getPublic = async (token: string) => {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      deal: {
        select: {
          title: true,
          contact: { select: { name: true, email: true } },
          company: { select: { name: true, nif: true, address: true } },
          lineItems: { orderBy: { position: 'asc' } },
        },
      },
      agency: { select: { name: true, logoUrl: true } },
    },
  });

  if (!quote || quote.state === 'RASCUNHO') {
    // A draft was never sent, so from outside it does not exist.
    throw Object.assign(new Error('Proposta não encontrada'), { status: 404 });
  }

  // First open marks it viewed, which is what the follow-up rule watches.
  if (quote.state === 'ENVIADA') {
    await prisma.quote
      .update({ where: { id: quote.id }, data: { state: 'VISTA', viewedAt: new Date() } })
      .catch(() => {
        // Recording the view must never stop the client reading the proposal.
      });
  }

  return {
    ...quote,
    expired: isExpired(quote.validUntil),
    totals: quoteTotals(quote.deal.lineItems as unknown as LineItem[]),
  };
};

/**
 * The client's answer, from the public page.
 *
 * Accepting marks the deal won: the proposal is the agreement, so recording
 * one without the other leaves the pipeline lying about the month.
 */
export const respondPublic = async (token: string, accept: boolean) => {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: { id: true, state: true, validUntil: true, dealId: true, agencyId: true },
  });
  if (!quote) throw Object.assign(new Error('Proposta não encontrada'), { status: 404 });

  if (!canAccept(quote.state, quote.validUntil)) {
    throw Object.assign(
      new Error(
        isExpired(quote.validUntil)
          ? 'Esta proposta expirou. Fala connosco para receber uma nova.'
          : 'Esta proposta já foi respondida.',
      ),
      { status: 409 },
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id: quote.id },
      data: accept
        ? { state: 'ACEITE', acceptedAt: new Date() }
        : { state: 'RECUSADA', rejectedAt: new Date() },
      select: SELECT,
    });

    if (accept) {
      await tx.opportunity.update({
        where: { id: quote.dealId },
        data: { stage: 'CLOSED_WON' },
      });
    }

    return updated;
  });
};

/** Quotes past their validity, for the nightly sweep. */
export const expireOverdue = async (): Promise<number> => {
  const result = await prisma.quote.updateMany({
    where: { state: { in: ['ENVIADA', 'VISTA'] }, validUntil: { lt: new Date() } },
    data: { state: 'EXPIRADA' },
  });
  return result.count;
};

/** Fourteen days: long enough to decide, short enough to keep momentum. */
function defaultValidity(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}
