import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { getTelephonyProvider } from '../../lib/telephony';
import { normalisePhone } from '../../lib/phone';
import { assertWithinCallingHours } from '../../lib/calling-hours';
import * as leadsService from '../leads/leads.service';

/**
 * Call handling and wrap-up.
 *
 * Every call ends with a disposition. That is not bureaucracy: the disposition
 * is what moves the lead, schedules the next attempt, or takes the number out
 * of circulation. A call without one teaches the pipeline nothing.
 */

/** How long a recording is kept when the lead did not convert. */
const UNCONVERTED_RETENTION_DAYS = 30;

/**
 * Starts an outbound call.
 *
 * Refuses on opt-out and outside the workspace's calling window, rather than
 * leaving either to the interface to remember.
 */
export const startCall = async (
  dto: { to: string; leadId?: string; contactId?: string; fromNumber?: string },
  user: any,
) => {
  const agencyId = workspaceIdFor(user);
  const to = normalisePhone(dto.to);
  if (!to) {
    throw Object.assign(new Error('Número de destino inválido'), { status: 400 });
  }

  if (dto.leadId) {
    const lead = await prisma.lead.findFirst({
      where: withWorkspace(user, { id: dto.leadId }),
      select: { optOutCalls: true },
    });
    if (lead?.optOutCalls) {
      throw Object.assign(
        new Error('Esta lead pediu para não ser contactada'),
        { status: 403 },
      );
    }
  }

  assertWithinCallingHours();

  const extension = await prisma.agentExtension.findFirst({
    where: { userId: user.id, isActive: true },
    select: { extension: true },
  });

  const provider = getTelephonyProvider();
  const numbers = await provider.listNumbers();

  // Caller ID may only be a number verified on the account. The UI never
  // supplies one, so it cannot be spoofed from the interface.
  const fromNumber =
    numbers.find((n) => n.number === dto.fromNumber)?.number ??
    numbers.find((n) => n.type === 'mobile')?.number ??
    numbers[0]?.number;

  if (!fromNumber) {
    throw Object.assign(
      new Error('Sem número de origem configurado na conta Zadarma'),
      { status: 409 },
    );
  }

  const { providerCallId } = await provider.makeCall({
    fromNumber,
    to,
    extension: extension?.extension,
    userId: user.id,
  });

  return prisma.call.create({
    data: {
      agencyId,
      direction: 'OUTBOUND',
      state: 'INICIADA',
      from: fromNumber,
      to,
      userId: user.id,
      leadId: dto.leadId ?? null,
      contactId: dto.contactId ?? null,
      provider: 'ZADARMA',
      providerCallId,
    },
  });
};

/**
 * Records the outcome of a call.
 *
 * The disposition is applied to the lead as well as the call, so the two can
 * never disagree about what happened.
 */
export const recordDisposition = async (
  id: string,
  dto: { disposition: string; notes?: string; nextAttemptAt?: string },
  user: any,
) => {
  if (!dto.disposition) {
    throw Object.assign(new Error('Disposition obrigatória'), { status: 400 });
  }

  const call = await prisma.call.findFirst({ where: withWorkspace(user, { id }) });
  if (!call) throw Object.assign(new Error('Chamada não encontrada'), { status: 404 });

  const updated = await prisma.call.update({
    where: { id },
    data: { disposition: dto.disposition as any, notes: dto.notes ?? call.notes },
  });

  if (call.leadId) {
    await leadsService.recordDisposition(call.leadId, dto, user);
  }

  // A recording of a call that did not convert is kept for 30 days. Once the
  // lead converts the basis changes to pre-contractual and the clock is
  // cleared, so the retention job leaves it alone.
  const converted = dto.disposition === 'REUNIAO_MARCADA';
  await prisma.recording.updateMany({
    where: { callId: id },
    data: {
      deleteAt: converted
        ? null
        : new Date(Date.now() + UNCONVERTED_RETENTION_DAYS * 86_400_000),
    },
  });

  return updated;
};

export const list = async (
  filters: { userId?: string; disposition?: string; limit?: number; cursor?: string },
  user: any,
) => {
  const where: any = withWorkspace(user, {});
  if (filters.userId) where.userId = filters.userId;
  if (filters.disposition) where.disposition = filters.disposition;

  const limit = Math.min(filters.limit ?? 50, 200);
  const calls = await prisma.call.findMany({
    where,
    take: limit,
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    include: {
      user: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      lead: { select: { id: true, companyName: true } },
      recording: { select: { id: true, url: true, duration: true } },
    },
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  return {
    data: calls,
    nextCursor: calls.length === limit ? calls[calls.length - 1].id : null,
    hasMore: calls.length === limit,
  };
};

/**
 * Calls that have ended without a disposition.
 *
 * Surfaced so wrap-up can be enforced in the interface: a BDR is not handed
 * the next number while the last one is unrecorded.
 */
export const pendingWrapUp = async (user: any) => {
  return prisma.call.findMany({
    where: withWorkspace(user, {
      userId: user.id,
      state: { in: ['TERMINADA', 'FALHADA'] as any },
      disposition: null,
    }),
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { lead: { select: { id: true, companyName: true, phone: true } } },
  });
};

