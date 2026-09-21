import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { normalisePhone } from '../../lib/phone';
import { effectOf } from '../../lib/dispositions';
import { automationEngine } from '../../utils/automation.engine';

/**
 * Lead triage.
 *
 * A lead is a row on a call list, not a deal. It only becomes an Opportunity
 * once someone has qualified it, which is what stops the pipeline filling with
 * thousands of untouched rows.
 */

type ListFilters = {
  state?: string;
  ownerId?: string;
  search?: string;
  sector?: string;
  /** Leads whose next attempt is due on or before now. */
  dueOnly?: boolean;
  limit?: number;
  cursor?: string;
};

const LIST_SELECT = {
  id: true,
  companyName: true,
  contactName: true,
  phone: true,
  email: true,
  state: true,
  source: true,
  attempts: true,
  lastAttemptAt: true,
  nextAttemptAt: true,
  lastDisposition: true,
  optOutCalls: true,
  tags: true,
  createdAt: true,
  owner: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, sector: true, concelho: true } },
} as const;

export const list = async (filters: ListFilters, user: any) => {
  const where: any = withWorkspace(user, { deletedAt: null });

  if (filters.state) where.state = filters.state;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.sector) where.company = { sector: filters.sector };
  if (filters.dueOnly) {
    where.nextAttemptAt = { lte: new Date() };
    where.optOutCalls = false;
  }
  if (filters.search) {
    where.OR = [
      { companyName: { contains: filters.search, mode: 'insensitive' } },
      { contactName: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const limit = Math.min(filters.limit ?? 50, 200);

  const leads = await prisma.lead.findMany({
    where,
    take: limit,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: LIST_SELECT,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  return {
    data: leads,
    nextCursor: leads.length === limit ? leads[leads.length - 1].id : null,
    hasMore: leads.length === limit,
  };
};

export const getById = async (id: string, user: any) => {
  const lead = await prisma.lead.findFirst({
    where: withWorkspace(user, { id, deletedAt: null }),
    include: {
      company: true,
      contact: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
  if (!lead) throw Object.assign(new Error('Lead não encontrada'), { status: 404 });
  return lead;
};

export const create = async (dto: any, user: any) => {
  return prisma.lead.create({
    data: {
      agencyId: workspaceIdFor(user),
      companyName: dto.companyName ?? null,
      contactName: dto.contactName ?? null,
      phone: dto.phone ? normalisePhone(dto.phone) : null,
      email: dto.email ?? null,
      source: dto.source ?? null,
      state: dto.state ?? 'NOVO',
      ownerId: dto.ownerId ?? user.id,
      notes: dto.notes ?? null,
      tags: dto.tags ?? [],
      companyId: dto.companyId ?? null,
      contactId: dto.contactId ?? null,
    },
  });
};

export const update = async (id: string, dto: any, user: any) => {
  await getById(id, user);
  return prisma.lead.update({
    where: { id },
    data: {
      ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      ...(dto.contactName !== undefined && { contactName: dto.contactName }),
      ...(dto.phone !== undefined && { phone: dto.phone ? normalisePhone(dto.phone) : null }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.qualification !== undefined && { qualification: dto.qualification }),
      ...(dto.nextAttemptAt !== undefined && {
        nextAttemptAt: dto.nextAttemptAt ? new Date(dto.nextAttemptAt) : null,
      }),
      ...(dto.disqualifiedReason !== undefined && { disqualifiedReason: dto.disqualifiedReason }),
    },
  });
};

/**
 * Records the outcome of a call attempt.
 *
 * Every disposition has a consequence, which is the point of making it
 * mandatory: NAO_CONTACTAR opts the lead out for good, REMARCAR schedules the
 * next attempt, and REUNIAO_MARCADA hands the lead to the conversion path.
 */
export const recordDisposition = async (
  id: string,
  dto: { disposition: string; notes?: string; nextAttemptAt?: string },
  user: any,
) => {
  const lead = await getById(id, user);
  const now = new Date();

  const data: any = {
    attempts: { increment: 1 },
    lastAttemptAt: now,
    lastDisposition: dto.disposition,
    nextAttemptAt: null,
  };

  if (dto.notes) {
    data.notes = lead.notes ? `${lead.notes}\n\n[${now.toISOString()}] ${dto.notes}` : dto.notes;
  }

  // One source of truth for what a disposition means, shared with the dialer
  // and covered by its own tests.
  const effect = effectOf(dto.disposition, lead.attempts + 1);

  data.state = effect.state;
  if (effect.optOutCalls) data.optOutCalls = true;
  if (effect.disqualifiedReason) data.disqualifiedReason = effect.disqualifiedReason;

  if (effect.requiresDate) {
    data.nextAttemptAt = dto.nextAttemptAt ? new Date(dto.nextAttemptAt) : null;
  } else if (effect.retryInDays != null) {
    const next = new Date(now);
    next.setDate(next.getDate() + effect.retryInDays);
    data.nextAttemptAt = next;
  }

  const updated = await prisma.lead.update({ where: { id }, data });

  // Outcomes that end the conversation also end the cadence. A lead that
  // answered, booked, or asked to be left alone must not keep receiving the
  // remaining steps.
  const stopEvent =
    effect.optOutCalls
      ? 'OPT_OUT'
      : dto.disposition === 'REUNIAO_MARCADA'
      ? 'MEETING_BOOKED'
      : dto.disposition === 'ATENDEU_INTERESSADO' || dto.disposition === 'ATENDEU_SEM_INTERESSE'
      ? 'CALL_ANSWERED'
      : dto.disposition === 'NUMERO_ERRADO'
      ? 'DISQUALIFIED'
      : null;

  if (stopEvent && lead.contactId) {
    await automationEngine
      .stopEnrollmentsFor(lead.contactId, stopEvent as any, lead.agencyId)
      .catch(() => {
        // The disposition is already recorded; a sequence that outlives it is
        // cleaned up by the next event rather than failing the wrap-up.
      });
  }

  return updated;
};

/**
 * Turns a qualified lead into Company + Contact + Opportunity.
 *
 * Runs in one transaction: a half-converted lead — a company with no deal, or
 * a deal with no contact — is worse than an unconverted one, because nothing
 * downstream can tell it is incomplete.
 */
export const convert = async (
  id: string,
  dto: {
    pipelineId?: string;
    stageId?: string;
    dealTitle?: string;
    value?: number;
    sector?: string;
    expectedCloseDate?: string;
  },
  user: any,
) => {
  const lead = await getById(id, user);

  if (lead.convertedAt) {
    throw Object.assign(new Error('Lead já convertida'), { status: 409 });
  }

  const agencyId = workspaceIdFor(user);

  return prisma.$transaction(async (tx) => {
    // Reuse the company the lead already points at, else create one.
    const company =
      (lead.companyId ? await tx.company.findUnique({ where: { id: lead.companyId } }) : null) ??
      (await tx.company.create({
        data: {
          agencyId,
          name: lead.companyName ?? lead.contactName ?? 'Empresa sem nome',
          phone: lead.phone,
          email: lead.email,
          sector: (dto.sector as any) ?? 'OUTRO',
          type: 'PROSPECT',
          source: lead.source,
          ownerId: lead.ownerId ?? user.id,
        },
      }));

    const contact =
      (lead.contactId ? await tx.contact.findUnique({ where: { id: lead.contactId } }) : null) ??
      (await tx.contact.create({
        data: {
          agencyId,
          companyId: company.id,
          name: lead.contactName ?? lead.companyName ?? 'Contacto sem nome',
          phone: lead.phone,
          email: lead.email,
          type: 'PROSPECT',
          status: 'QUALIFIED',
          source: lead.source,
          assignedToId: lead.ownerId ?? user.id,
        },
      }));

    // Fall back to the workspace's default pipeline and its first stage, so a
    // conversion never fails just because the caller did not name one.
    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;
    if (!pipelineId || !stageId) {
      const pipeline = await tx.pipeline.findFirst({
        where: { agencyId },
        orderBy: { position: 'asc' },
        include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
      });
      pipelineId = pipelineId ?? pipeline?.id;
      stageId = stageId ?? pipeline?.stages[0]?.id;
    }

    const opportunity = await tx.opportunity.create({
      data: {
        agencyId,
        companyId: company.id,
        contactId: contact.id,
        assignedToId: lead.ownerId ?? user.id,
        title: dto.dealTitle ?? `${company.name}`,
        value: dto.value ?? null,
        source: lead.source,
        pipelineId: pipelineId ?? null,
        stageId: stageId ?? null,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
      },
    });

    // The lead stays as the audit trail of how the deal was sourced.
    await tx.lead.update({
      where: { id },
      data: {
        state: 'QUALIFICADO',
        companyId: company.id,
        contactId: contact.id,
        convertedToOpportunityId: opportunity.id,
        convertedAt: new Date(),
      },
    });

    return { company, contact, opportunity };
  }).then(async (result) => {
    // A converted lead is in a conversation, not a cadence. Stopping outside
    // the transaction keeps a sequence-engine failure from rolling back the
    // conversion itself.
    await automationEngine
      .stopEnrollmentsFor(result.contact.id, 'CONVERTED' as any, agencyId)
      .catch(() => {});
    return result;
  });
};

export const remove = async (id: string, user: any) => {
  await getById(id, user);
  // Soft delete: a deleted lead is still evidence the number was worked.
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
};

/** Bulk assignment for the list's selection actions. */
export const bulkAssign = async (ids: string[], ownerId: string, user: any) => {
  const result = await prisma.lead.updateMany({
    where: withWorkspace(user, { id: { in: ids } }),
    data: { ownerId },
  });
  return { updated: result.count };
};
