import { Request, Response } from 'express';
import prisma from '../../config/database';
import { syncGoogleChanges, syncOutlookChanges } from '../calendar/sync';

export const googleCalendarWebhook = async (req: Request, res: Response) => {
  const channelId = req.headers['x-goog-channel-id'] as string;
  const resourceState = req.headers['x-goog-resource-state'] as string;

  // Always respond 200 immediately
  res.status(200).send();

  if (resourceState === 'sync') return;

  if (!channelId) return;

  // Find integration by channelId
  const integration = await prisma.calendarIntegration.findFirst({
    where: { webhookChannelId: channelId, isActive: true },
  });

  if (!integration) return;

  // Sync in background
  syncGoogleChanges(integration.userId).catch(() => {});
};

export const outlookCalendarWebhook = async (req: Request, res: Response) => {
  // Outlook validation challenge
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(validationToken);
  }

  // Respond 202 immediately
  res.status(202).send();

  const secret = process.env.CALENDAR_WEBHOOK_SECRET || 'default-secret';
  const notifications = req.body?.value || [];

  for (const notification of notifications) {
    if (notification.clientState !== secret) continue;

    const subscriptionId = notification.subscriptionId;
    const integration = await prisma.calendarIntegration.findFirst({
      where: { webhookChannelId: subscriptionId, isActive: true },
    });

    if (!integration) continue;

    syncOutlookChanges(integration.userId).catch(() => {});
  }
};
