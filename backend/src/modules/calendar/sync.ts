import { google } from 'googleapis';
import prisma from '../../config/database';
import { encrypt, decrypt } from '../../lib/encryption';

// ─── Google ─────────────────────────────────────────────────────────────────

async function getGoogleClient(userId: string) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: 'google', isActive: true },
  });
  if (!integration) throw new Error('Google integration not found');

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  let accessToken = decrypt(integration.accessToken);
  const refreshToken = decrypt(integration.refreshToken);

  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

  // Auto-refresh if token expires within 5 minutes
  if (new Date(integration.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await oauth2.refreshAccessToken();
    accessToken = credentials.access_token!;
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: encrypt(accessToken),
        tokenExpiresAt: new Date(credentials.expiry_date!),
      },
    });
    oauth2.setCredentials(credentials);
  }

  return { oauth2, integration };
}

async function upsertGoogleEvent(userId: string, integrationId: string, event: any) {
  if (!event.id) return;
  if (event.status === 'cancelled') {
    await prisma.calendarEvent.deleteMany({
      where: { userId, externalId: event.id, externalProvider: 'google' },
    });
    return;
  }
  const startAt = new Date(event.start?.dateTime || event.start?.date || '');
  const endAt = new Date(event.end?.dateTime || event.end?.date || '');
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) return;

  await prisma.calendarEvent.upsert({
    where: {
      userId_externalId_externalProvider: {
        userId,
        externalId: event.id,
        externalProvider: 'google',
      },
    },
    update: {
      title: event.summary || '(sem título)',
      description: event.description,
      location: event.location,
      startAt,
      endAt,
      isAllDay: !event.start?.dateTime,
      status: event.status || 'confirmed',
      meetLink: event.hangoutLink,
      attendees: event.attendees as any,
      syncedAt: new Date(),
    },
    create: {
      userId,
      integrationId,
      externalId: event.id,
      externalProvider: 'google',
      title: event.summary || '(sem título)',
      description: event.description,
      location: event.location,
      startAt,
      endAt,
      isAllDay: !event.start?.dateTime,
      status: event.status || 'confirmed',
      meetLink: event.hangoutLink,
      attendees: event.attendees as any,
      syncedAt: new Date(),
    },
  });
}

export async function fetchAllGoogleEvents(userId: string) {
  try {
    const { oauth2, integration } = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    // Fetch all user's calendars (not just primary)
    const calListRes: any = await calendar.calendarList.list({ maxResults: 250 });
    const calendarIds: string[] = (calListRes.data.items || [])
      .filter((c: any) => c.accessRole !== 'none')
      .map((c: any) => c.id);

    if (!calendarIds.includes('primary')) calendarIds.unshift('primary');

    // Fetch 2 years back + 2 years forward to catch all events
    const timeMin = new Date();
    timeMin.setFullYear(timeMin.getFullYear() - 2);
    const timeMax = new Date();
    timeMax.setFullYear(timeMax.getFullYear() + 2);

    let totalSynced = 0;
    let lastSyncToken: string | undefined;

    for (const calId of calendarIds) {
      let pageToken: string | undefined;
      let nextSyncToken: string | undefined;

      do {
        const response: any = await calendar.events.list({
          calendarId: calId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 2500,
          pageToken,
        });

        const events = response.data.items || [];
        for (const event of events) {
          await upsertGoogleEvent(userId, integration.id, event);
          totalSynced++;
        }

        pageToken = response.data.nextPageToken;
        if (!pageToken) nextSyncToken = response.data.nextSyncToken;
      } while (pageToken);

      // Use primary calendar's syncToken for incremental syncs
      if (calId === 'primary' && nextSyncToken) lastSyncToken = nextSyncToken;
    }

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        syncToken: lastSyncToken || undefined,
        lastSyncedAt: new Date(),
      },
    });

    console.log(`[CalendarSync] Google: synced ${totalSynced} events across ${calendarIds.length} calendars for user ${userId}`);
  } catch (err: any) {
    console.error(`[CalendarSync] fetchAllGoogleEvents error for ${userId}:`, err.message);
  }
}

export async function syncGoogleChanges(userId: string) {
  try {
    const { oauth2, integration } = await getGoogleClient(userId);
    if (!integration.syncToken) {
      await fetchAllGoogleEvents(userId);
      return;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    // Incremental sync on primary calendar using syncToken
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    do {
      const response: any = await calendar.events.list({
        calendarId: 'primary',
        syncToken: pageToken ? undefined : integration.syncToken,
        pageToken,
      });

      const events = response.data.items || [];
      for (const event of events) {
        await upsertGoogleEvent(userId, integration.id, event);
      }

      pageToken = response.data.nextPageToken;
      if (!pageToken) nextSyncToken = response.data.nextSyncToken;
    } while (pageToken);

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        syncToken: nextSyncToken || integration.syncToken,
        lastSyncedAt: new Date(),
      },
    });
  } catch (err: any) {
    // Full resync if sync token expired (410)
    if (err.code === 410 || err.status === 410) {
      console.log(`[CalendarSync] Sync token expired for ${userId}, doing full resync`);
      await prisma.calendarIntegration.update({
        where: { userId_provider: { userId, provider: 'google' } },
        data: { syncToken: null },
      });
      await fetchAllGoogleEvents(userId);
    } else {
      console.error(`[CalendarSync] syncGoogleChanges error for ${userId}:`, err.message);
    }
  }
}

export async function pushEventToGoogle(userId: string, eventId: string) {
  try {
    const { oauth2 } = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
    if (!event) return;

    const googleEvent = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: event.isAllDay
        ? { date: event.startAt.toISOString().split('T')[0] }
        : { dateTime: event.startAt.toISOString() },
      end: event.isAllDay
        ? { date: event.endAt.toISOString().split('T')[0] }
        : { dateTime: event.endAt.toISOString() },
    };

    if (event.externalId) {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: event.externalId,
        requestBody: googleEvent,
      });
    } else {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { externalId: res.data.id, externalProvider: 'google', syncedAt: new Date() },
      });
    }
  } catch (err: any) {
    console.error(`[CalendarSync] pushEventToGoogle error:`, err.message);
  }
}

export async function deleteGoogleEvent(userId: string, externalId: string) {
  try {
    const { oauth2 } = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    await calendar.events.delete({ calendarId: 'primary', eventId: externalId });
  } catch (err: any) {
    console.error(`[CalendarSync] deleteGoogleEvent error:`, err.message);
  }
}

export async function setupGoogleWebhook(userId: string) {
  try {
    const { oauth2, integration } = await getGoogleClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    const channelId = `crm-${userId}-${Date.now()}`;
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const res = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.FRONTEND_URL?.replace('5173', '3000')}/api/webhooks/google-calendar`,
        expiration: expiry.getTime().toString(),
      },
    });

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        webhookChannelId: res.data.id,
        webhookResourceId: res.data.resourceId,
        webhookExpiry: expiry,
      },
    });
  } catch (err: any) {
    console.error(`[CalendarSync] setupGoogleWebhook error:`, err.message);
  }
}

export async function renewGoogleWebhook(userId: string) {
  await setupGoogleWebhook(userId);
}

// ─── Outlook ─────────────────────────────────────────────────────────────────

async function getOutlookHeaders(userId: string) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: 'outlook', isActive: true },
  });
  if (!integration) throw new Error('Outlook integration not found');

  let accessToken = decrypt(integration.accessToken);

  // Auto-refresh if expiring
  if (new Date(integration.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: decrypt(integration.refreshToken),
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
    });

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
      { method: 'POST', body: params }
    );
    const tokens = await tokenRes.json() as any;

    accessToken = tokens.access_token;
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: encrypt(accessToken),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  }

  return { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, integration };
}

export async function fetchAllOutlookEvents(userId: string) {
  try {
    const { headers, integration } = await getOutlookHeaders(userId);

    const now = new Date();
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${threeMonthsLater.toISOString()}&$top=250`;
    const res = await fetch(url, { headers });
    const data = await res.json() as any;

    const events = data.value || [];
    for (const event of events) {
      const startAt = new Date(event.start?.dateTime + 'Z' || event.start?.dateTime);
      const endAt = new Date(event.end?.dateTime + 'Z' || event.end?.dateTime);

      await prisma.calendarEvent.upsert({
        where: {
          userId_externalId_externalProvider: {
            userId,
            externalId: event.id,
            externalProvider: 'outlook',
          },
        },
        update: {
          title: event.subject || '(sem título)',
          description: event.bodyPreview,
          location: event.location?.displayName,
          startAt,
          endAt,
          isAllDay: event.isAllDay || false,
          status: event.isCancelled ? 'cancelled' : 'confirmed',
          teamsLink: event.onlineMeeting?.joinUrl,
          syncedAt: new Date(),
        },
        create: {
          userId,
          integrationId: integration.id,
          externalId: event.id,
          externalProvider: 'outlook',
          title: event.subject || '(sem título)',
          description: event.bodyPreview,
          location: event.location?.displayName,
          startAt,
          endAt,
          isAllDay: event.isAllDay || false,
          status: event.isCancelled ? 'cancelled' : 'confirmed',
          teamsLink: event.onlineMeeting?.joinUrl,
          syncedAt: new Date(),
        },
      });
    }

    // Get deltaLink for incremental sync
    let deltaLink = data['@odata.deltaLink'];
    if (!deltaLink) {
      const deltaRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${now.toISOString()}&endDateTime=${threeMonthsLater.toISOString()}`,
        { headers }
      );
      const deltaData = await deltaRes.json() as any;
      deltaLink = deltaData['@odata.deltaLink'];
    }

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { deltaLink: deltaLink || undefined, lastSyncedAt: new Date() },
    });

    console.log(`[CalendarSync] Outlook: synced ${events.length} events for user ${userId}`);
  } catch (err: any) {
    console.error(`[CalendarSync] fetchAllOutlookEvents error for ${userId}:`, err.message);
  }
}

export async function syncOutlookChanges(userId: string) {
  try {
    const { headers, integration } = await getOutlookHeaders(userId);
    if (!integration.deltaLink) {
      await fetchAllOutlookEvents(userId);
      return;
    }

    const res = await fetch(integration.deltaLink, { headers });
    const data = await res.json() as any;

    const events = data.value || [];
    for (const event of events) {
      if (event['@removed']) {
        await prisma.calendarEvent.deleteMany({
          where: { userId, externalId: event.id, externalProvider: 'outlook' },
        });
        continue;
      }
      const startAt = new Date(event.start?.dateTime + 'Z');
      const endAt = new Date(event.end?.dateTime + 'Z');

      await prisma.calendarEvent.upsert({
        where: {
          userId_externalId_externalProvider: {
            userId,
            externalId: event.id,
            externalProvider: 'outlook',
          },
        },
        update: {
          title: event.subject || '(sem título)',
          description: event.bodyPreview,
          location: event.location?.displayName,
          startAt,
          endAt,
          isAllDay: event.isAllDay || false,
          status: event.isCancelled ? 'cancelled' : 'confirmed',
          syncedAt: new Date(),
        },
        create: {
          userId,
          integrationId: integration.id,
          externalId: event.id,
          externalProvider: 'outlook',
          title: event.subject || '(sem título)',
          description: event.bodyPreview,
          location: event.location?.displayName,
          startAt,
          endAt,
          isAllDay: event.isAllDay || false,
          status: event.isCancelled ? 'cancelled' : 'confirmed',
          syncedAt: new Date(),
        },
      });
    }

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        deltaLink: data['@odata.deltaLink'] || integration.deltaLink,
        lastSyncedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(`[CalendarSync] syncOutlookChanges error for ${userId}:`, err.message);
  }
}

export async function pushEventToOutlook(userId: string, eventId: string) {
  try {
    const { headers } = await getOutlookHeaders(userId);
    const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, userId } });
    if (!event) return;

    const outlookEvent = {
      subject: event.title,
      body: { contentType: 'text', content: event.description || '' },
      start: { dateTime: event.startAt.toISOString(), timeZone: 'UTC' },
      end: { dateTime: event.endAt.toISOString(), timeZone: 'UTC' },
      location: event.location ? { displayName: event.location } : undefined,
    };

    if (event.externalId) {
      await fetch(`https://graph.microsoft.com/v1.0/me/events/${event.externalId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(outlookEvent),
      });
    } else {
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(outlookEvent),
      });
      const created = await res.json() as any;
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { externalId: created.id, externalProvider: 'outlook', syncedAt: new Date() },
      });
    }
  } catch (err: any) {
    console.error(`[CalendarSync] pushEventToOutlook error:`, err.message);
  }
}

export async function deleteOutlookEvent(userId: string, externalId: string) {
  try {
    const { headers } = await getOutlookHeaders(userId);
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${externalId}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err: any) {
    console.error(`[CalendarSync] deleteOutlookEvent error:`, err.message);
  }
}

export async function setupOutlookWebhook(userId: string) {
  try {
    const { headers, integration } = await getOutlookHeaders(userId);
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days max

    const notificationUrl = `${process.env.FRONTEND_URL?.replace('5173', '3000')}/api/webhooks/outlook-calendar`;

    const body = {
      changeType: 'created,updated,deleted',
      notificationUrl,
      resource: '/me/events',
      expirationDateTime: expiry.toISOString(),
      clientState: process.env.CALENDAR_WEBHOOK_SECRET || 'default-secret',
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;

    if (data.id) {
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { webhookChannelId: data.id, webhookExpiry: expiry },
      });
    }
  } catch (err: any) {
    console.error(`[CalendarSync] setupOutlookWebhook error:`, err.message);
  }
}

export async function renewOutlookWebhook(userId: string) {
  try {
    const { headers, integration } = await getOutlookHeaders(userId);
    if (!integration.webhookChannelId) {
      await setupOutlookWebhook(userId);
      return;
    }
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${integration.webhookChannelId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ expirationDateTime: expiry.toISOString() }),
    });
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { webhookExpiry: expiry },
    });
  } catch (err: any) {
    console.error(`[CalendarSync] renewOutlookWebhook error:`, err.message);
  }
}
