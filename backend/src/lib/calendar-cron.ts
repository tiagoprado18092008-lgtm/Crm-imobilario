import cron from 'node-cron';
import prisma from '../config/database';
import { syncGoogleChanges, syncOutlookChanges, renewGoogleWebhook, renewOutlookWebhook } from '../modules/calendar/sync';
import { importGoogleEventsAsAppointments } from '../modules/calendar/appointment-sync';

export function startCalendarCron() {
  let syncRunning = false;

  // Every 15 minutes: sync changes
  cron.schedule('*/15 * * * *', async () => {
    if (syncRunning) {
      console.log('[CalendarCron] Skipping sync — previous run still in progress');
      return;
    }
    syncRunning = true;
    try {
      const integrations = await prisma.calendarIntegration.findMany({
        where: { isActive: true },
        select: { userId: true, provider: true },
      });

      for (const integration of integrations) {
        if (integration.provider === 'google') {
          await syncGoogleChanges(integration.userId)
            .then(() => importGoogleEventsAsAppointments(integration.userId))
            .catch(() => {});
        } else if (integration.provider === 'outlook') {
          await syncOutlookChanges(integration.userId).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('[CalendarCron] sync error:', err.message);
    } finally {
      syncRunning = false;
    }
  });

  // Every 6 hours: renew Google webhooks expiring within 24h
  cron.schedule('0 */6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          isActive: true,
          provider: 'google',
          webhookExpiry: { lte: cutoff },
        },
        select: { userId: true },
      });
      for (const i of integrations) {
        renewGoogleWebhook(i.userId).catch(() => {});
      }
    } catch (err: any) {
      console.error('[CalendarCron] Google webhook renewal error:', err.message);
    }
  });

  // Every 12 hours: renew Outlook subscriptions expiring within 2 days
  cron.schedule('0 */12 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          isActive: true,
          provider: 'outlook',
          webhookExpiry: { lte: cutoff },
        },
        select: { userId: true },
      });
      for (const i of integrations) {
        renewOutlookWebhook(i.userId).catch(() => {});
      }
    } catch (err: any) {
      console.error('[CalendarCron] Outlook webhook renewal error:', err.message);
    }
  });

  console.log('[CalendarCron] Calendar cron jobs started');
}
