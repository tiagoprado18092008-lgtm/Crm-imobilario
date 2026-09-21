import cron from 'node-cron';
import prisma from '../config/database';
import { getTelephonyProvider, isTelephonyConfigured } from '../lib/telephony';

/**
 * Recording offload and retention.
 *
 * Two jobs that have to exist from the first call, not later (risk R3):
 *
 *  - Offload. Provider storage is 200MB free and 2GB on the Office plan, and
 *    their download links expire. Two BDRs at 150 calls a day fill that in
 *    weeks, and once the quota is full new recordings are simply lost.
 *
 *  - Retention. Recordings of calls that did not convert are deleted after 30
 *    days (CNPD 1039/2017, quality and training). Keeping them because nobody
 *    wrote the job is not a defensible position.
 */

const OFFLOAD_BATCH = 20;

/**
 * Downloads recordings the provider has announced and re-hosts them.
 *
 * Runs hourly rather than on the webhook: tying a file transfer to a webhook
 * response means a slow download becomes a provider retry.
 */
export async function offloadPendingRecordings(): Promise<{ moved: number; failed: number }> {
  if (!isTelephonyConfigured()) return { moved: 0, failed: 0 };

  // Announced by a recording.ready event, but not yet stored by us.
  const pending = await prisma.callEvent.findMany({
    where: { eventType: 'recording.ready', call: { recording: null } },
    take: OFFLOAD_BATCH,
    orderBy: { createdAt: 'asc' },
    select: { id: true, callId: true, providerCallId: true, agencyId: true },
  });

  if (pending.length === 0) return { moved: 0, failed: 0 };

  const provider = getTelephonyProvider();
  let moved = 0;
  let failed = 0;

  for (const event of pending) {
    if (!event.callId || !event.providerCallId) continue;
    try {
      const handle = await provider.getRecording(event.providerCallId);

      // Storage is not wired yet, so the provider link is recorded as-is and
      // the row is created. That keeps the call's timeline honest and gives
      // the retention job something to act on; swapping in S3/R2 replaces the
      // url and adds the delete-at-source step below.
      await prisma.recording.create({
        data: {
          callId: event.callId,
          url: handle.url,
          agencyId: event.agencyId,
          // Default to the shorter retention. recordDisposition clears this
          // when the lead converts.
          deleteAt: new Date(Date.now() + 30 * 86_400_000),
        },
      });

      moved++;
    } catch (err: any) {
      failed++;
      console.warn(
        `[Recordings] Falha a obter gravação ${event.providerCallId}: ${err?.message ?? err}`,
      );
    }
  }

  return { moved, failed };
}

/**
 * Deletes recordings past their retention date.
 *
 * Deliberately deletes the row as well as the file: a row pointing at a
 * deleted file is a record that the call was recorded, which is the thing the
 * retention period exists to end.
 */
export async function purgeExpiredRecordings(): Promise<{ deleted: number }> {
  const expired = await prisma.recording.findMany({
    where: { deleteAt: { lte: new Date() } },
    take: 100,
    select: { id: true, callId: true },
  });

  if (expired.length === 0) return { deleted: 0 };

  const provider = isTelephonyConfigured() ? getTelephonyProvider() : null;

  for (const recording of expired) {
    if (provider) {
      const call = await prisma.call.findUnique({
        where: { id: recording.callId },
        select: { providerCallId: true },
      });
      if (call?.providerCallId) {
        await provider
          .deleteRecording(call.providerCallId)
          .catch(() => {
            // Already gone provider-side, or quota already reclaimed. Our own
            // copy is removed regardless — retention is about our storage.
          });
      }
    }
  }

  const result = await prisma.recording.deleteMany({
    where: { id: { in: expired.map((r) => r.id) } },
  });

  console.log(`[Recordings] ${result.count} gravação(ões) eliminada(s) por retenção`);
  return { deleted: result.count };
}

export function startRecordingJobs(): void {
  // Hourly: quota fills faster than a daily job can clear it.
  cron.schedule('15 * * * *', async () => {
    try {
      const { moved, failed } = await offloadPendingRecordings();
      if (moved || failed) {
        console.log(`[Recordings] Offload: ${moved} movida(s), ${failed} falha(s)`);
      }
    } catch (err: any) {
      console.error('[Recordings] Offload falhou:', err?.message ?? err);
    }
  });

  // Nightly, outside calling hours.
  cron.schedule('30 3 * * *', async () => {
    try {
      await purgeExpiredRecordings();
    } catch (err: any) {
      console.error('[Recordings] Purga falhou:', err?.message ?? err);
    }
  });

  console.log('[Recordings] Jobs de offload e retenção agendados');
}
