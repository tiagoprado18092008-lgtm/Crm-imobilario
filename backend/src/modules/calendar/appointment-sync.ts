import { google } from 'googleapis';
import prisma from '../../config/database';
import { decrypt, encrypt } from '../../lib/encryption';

const TYPE_LABELS: Record<string, string> = {
  VISIT: 'Visita',
  ANGARIACAO_MEETING: 'Reunião de angariação',
  CPCV: 'CPCV',
  ESCRITURA: 'Escritura',
  GENERAL_MEETING: 'Reunião geral',
  CALL: 'Chamada',
  MEETING: 'Reunião',
  OTHER: 'Outro',
};

async function getOAuth2Client(userId: string) {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: 'google', isActive: true },
  });
  if (!integration) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2.setCredentials({
    access_token: decrypt(integration.accessToken),
    refresh_token: decrypt(integration.refreshToken),
  });

  if (new Date(integration.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await oauth2.refreshAccessToken();
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: encrypt(credentials.access_token!),
        tokenExpiresAt: new Date(credentials.expiry_date!),
      },
    });
    oauth2.setCredentials(credentials);
  }

  return { oauth2, integrationId: integration.id };
}

// Push a CRM appointment to Google Calendar
export async function pushAppointmentToGoogle(userId: string, appointment: any) {
  try {
    const client = await getOAuth2Client(userId);
    if (!client) return;

    const calendar = google.calendar({ version: 'v3', auth: client.oauth2 });

    const typeLabel = TYPE_LABELS[appointment.type] || appointment.type;
    const description = [
      appointment.description,
      appointment.notes,
      appointment.contact ? `Contacto: ${appointment.contact.name}` : '',
    ].filter(Boolean).join('\n');

    const googleEvent = {
      summary: `${typeLabel}: ${appointment.title}`,
      description: description || undefined,
      location: appointment.location || undefined,
      start: { dateTime: new Date(appointment.startAt).toISOString() },
      end: { dateTime: new Date(appointment.endAt).toISOString() },
    };

    // Check if already synced
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        userId,
        opportunityId: appointment.opportunityId || undefined,
        externalProvider: 'google',
        title: { contains: appointment.title },
      },
    });

    // Also check by a stored mapping (appointmentId in description or externalId)
    const mapped = await prisma.calendarEvent.findFirst({
      where: { userId, externalProvider: 'google', description: { contains: `appt:${appointment.id}` } },
    });

    if (mapped?.externalId) {
      // Update existing
      await calendar.events.update({
        calendarId: 'primary',
        eventId: mapped.externalId,
        requestBody: googleEvent,
      });
    } else {
      // Create new — embed appointment id in description for tracking
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          ...googleEvent,
          description: (googleEvent.description || '') + `\n\nappt:${appointment.id}`,
        },
      });

      // Store in CalendarEvent for tracking
      await prisma.calendarEvent.create({
        data: {
          userId,
          integrationId: client.integrationId,
          externalId: res.data.id!,
          externalProvider: 'google',
          title: googleEvent.summary,
          description: (googleEvent.description || '') + `\nappt:${appointment.id}`,
          location: appointment.location,
          startAt: new Date(appointment.startAt),
          endAt: new Date(appointment.endAt),
          eventType: appointment.type?.toLowerCase() || 'other',
          contactId: appointment.contactId || undefined,
          opportunityId: appointment.opportunityId || undefined,
          syncedAt: new Date(),
        },
      });
    }

    console.log(`[AppointmentSync] Pushed appointment ${appointment.id} to Google Calendar`);
  } catch (err: any) {
    console.error(`[AppointmentSync] pushAppointmentToGoogle error:`, err.message);
  }
}

// Delete a CRM appointment from Google Calendar
export async function deleteAppointmentFromGoogle(userId: string, appointmentId: string) {
  try {
    const client = await getOAuth2Client(userId);
    if (!client) return;

    const mapped = await prisma.calendarEvent.findFirst({
      where: { userId, externalProvider: 'google', description: { contains: `appt:${appointmentId}` } },
    });

    if (!mapped?.externalId) return;

    const calendar = google.calendar({ version: 'v3', auth: client.oauth2 });
    await calendar.events.delete({ calendarId: 'primary', eventId: mapped.externalId });
    await prisma.calendarEvent.delete({ where: { id: mapped.id } });

    console.log(`[AppointmentSync] Deleted appointment ${appointmentId} from Google Calendar`);
  } catch (err: any) {
    console.error(`[AppointmentSync] deleteAppointmentFromGoogle error:`, err.message);
  }
}

// Import Google Calendar events as Appointments (called during sync)
export async function importGoogleEventsAsAppointments(userId: string) {
  try {
    const client = await getOAuth2Client(userId);
    if (!client) return;

    // Get all CalendarEvents synced from Google that don't have appt: marker (not CRM-created)
    const googleEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        externalProvider: 'google',
        NOT: { description: { contains: 'appt:' } },
      },
    });

    let imported = 0;
    let updated = 0;

    for (const ev of googleEvents) {
      // Use externalId as the deduplication key (stored in description as gcal:<externalId>)
      const marker = `gcal:${ev.externalId}`;

      const existing = await prisma.appointment.findFirst({
        where: { assignedToId: userId, description: { contains: marker } },
      });

      if (existing) {
        // Update title/times in case they changed in Google
        await prisma.appointment.update({
          where: { id: existing.id },
          data: {
            title: ev.title,
            startAt: ev.startAt,
            endAt: ev.endAt,
            location: ev.location || undefined,
          },
        });
        updated++;
        continue;
      }

      await prisma.appointment.create({
        data: {
          title: ev.title,
          description: (ev.description ? ev.description + '\n' : '') + marker,
          startAt: ev.startAt,
          endAt: ev.endAt,
          status: 'SCHEDULED',
          type: 'GENERAL_MEETING',
          location: ev.location || undefined,
          assignedToId: userId,
          contactId: ev.contactId || undefined,
        },
      });
      imported++;
    }

    console.log(`[AppointmentSync] Google events → appointments: ${imported} imported, ${updated} updated for user ${userId}`);
  } catch (err: any) {
    console.error(`[AppointmentSync] importGoogleEventsAsAppointments error:`, err.message);
  }
}
