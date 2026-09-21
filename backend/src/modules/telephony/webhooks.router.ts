import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../../config/database';
import { getTelephonyProvider, type TelephonyEvent } from '../../lib/telephony';
import { phoneVariants } from '../../lib/phone';

/**
 * Zadarma webhook endpoint.
 *
 * Zadarma does not sign its webhooks, which is risk R2. Four weaker controls
 * are used together in place of a signature:
 *
 *   1. a long secret in the URL path, checked in constant time
 *   2. an IP allowlist
 *   3. a rate limit
 *   4. deduplication on (providerCallId, eventType)
 *
 * None is sufficient alone. The endpoint fails closed: an unverified request
 * is rejected rather than processed "just in case".
 */

const router = Router();

/**
 * Zadarma's published egress addresses. Kept in an env var so it can be
 * corrected without a deploy if they change theirs.
 */
const ALLOWED_IPS = (process.env.ZADARMA_WEBHOOK_IPS ?? '185.45.152.42,185.45.152.43,185.45.153.4')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 600, // ~10/s: comfortable for two BDRs, closed to a flood
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Zadarma verifies a new endpoint by GETting it with a zd_echo parameter and
 * expecting the value echoed back verbatim.
 */
router.get('/:token?', webhookLimiter, (req, res) => {
  const echo = req.query.zd_echo;
  if (typeof echo === 'string') {
    res.type('text/plain').send(echo);
    return;
  }
  res.status(400).json({ error: 'Pedido inválido' });
});

router.post('/:token?', webhookLimiter, async (req, res) => {
  // Acknowledge immediately. Zadarma retries on a slow response, and the work
  // below must not hold the connection open.
  res.status(200).send('OK');

  try {
    const provider = getTelephonyProvider();

    const verified = await provider.verifyWebhook({
      headers: req.headers as Record<string, unknown>,
      body: req.body,
      query: req.query as Record<string, unknown>,
      ip: req.ip,
      path: req.path,
    });

    if (!verified) {
      console.warn(`[Zadarma] Webhook rejeitado — token inválido (ip=${req.ip})`);
      return;
    }

    if (ALLOWED_IPS.length > 0) {
      const ip = (req.ip ?? '').replace(/^::ffff:/, '');
      if (!ALLOWED_IPS.includes(ip)) {
        console.warn(`[Zadarma] Webhook rejeitado — IP fora da allowlist (${ip})`);
        return;
      }
    }

    const event = provider.normalizeEvent(req.body);
    if (!event) return;

    await handleEvent(event);
  } catch (err: any) {
    console.error('[Zadarma] Falha a processar webhook:', err?.message ?? err);
  }
});

/** Applies one normalised event. */
async function handleEvent(event: TelephonyEvent): Promise<void> {
  if (!event.providerCallId) return;

  // Resolve the workspace from the extension, so the event is attributed to a
  // tenant before anything is written. An event we cannot attribute is logged
  // and dropped rather than guessed at.
  const extension = event.extension
    ? await prisma.agentExtension.findFirst({
        where: { extension: event.extension },
        select: { userId: true, agencyId: true },
      })
    : null;

  const agencyId = extension?.agencyId ?? null;

  // The raw payload is stored first and unconditionally: if the logic below
  // fails, the event can still be replayed from here.
  await prisma.callEvent
    .create({
      data: {
        providerCallId: event.providerCallId,
        eventType: event.type,
        payload: event.raw as any,
        agencyId,
      },
    })
    .catch(() => {
      // Unique on (providerCallId, eventType): a retry is a no-op, not an error.
    });

  if (!agencyId) {
    console.warn(`[Zadarma] Evento sem workspace (ext=${event.extension ?? '—'})`);
    return;
  }

  const existing = await prisma.call.findFirst({
    where: { providerCallId: event.providerCallId, agencyId },
  });

  if (event.type === 'call.started') {
    if (existing) return;

    // Match the far end to a lead or contact, so the call appears on the right
    // timeline and the dialer can show who is ringing before anyone answers.
    const farEnd = event.direction === 'outbound' ? event.to : event.from;
    const variants = phoneVariants(farEnd);

    const [lead, contact] = await Promise.all([
      variants.length
        ? prisma.lead.findFirst({
            where: { agencyId, phone: { in: variants } },
            select: { id: true, companyId: true },
          })
        : null,
      variants.length
        ? prisma.contact.findFirst({
            where: { agencyId, phone: { in: variants } },
            select: { id: true, companyId: true },
          })
        : null,
    ]);

    await prisma.call.create({
      data: {
        agencyId,
        direction: event.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND',
        state: 'A_TOCAR',
        from: event.from ?? '',
        to: event.to ?? '',
        userId: extension?.userId ?? null,
        leadId: lead?.id ?? null,
        contactId: contact?.id ?? null,
        companyId: contact?.companyId ?? lead?.companyId ?? null,
        provider: 'ZADARMA',
        providerCallId: event.providerCallId,
      },
    });
    return;
  }

  if (!existing) return;

  if (event.type === 'call.answered') {
    await prisma.call.update({ where: { id: existing.id }, data: { state: 'ATENDIDA' } });
    return;
  }

  if (event.type === 'call.ended') {
    await prisma.call.update({
      where: { id: existing.id },
      data: {
        state: event.state === 'falhada' ? 'FALHADA' : 'TERMINADA',
        duration: event.duration ?? null,
        talkTime: event.talkTime ?? null,
        cost: event.cost ?? null,
        currency: event.currency ?? null,
        endedAt: new Date(),
      },
    });
    return;
  }

  if (event.type === 'recording.ready') {
    // Only the availability is recorded here. Downloading and re-hosting is a
    // job, because provider links expire and their quota is small — doing it
    // inline would tie a webhook to a file transfer.
    await prisma.callEvent.updateMany({
      where: { providerCallId: event.providerCallId, eventType: 'recording.ready' },
      data: { callId: existing.id },
    });
  }
}

export default router;
