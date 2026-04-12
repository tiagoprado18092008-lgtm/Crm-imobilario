import { google } from 'googleapis';
import prisma from '../../config/database';
import { encrypt } from '../../lib/encryption';
import { fetchAllGoogleEvents, syncGoogleChanges, syncOutlookChanges, setupGoogleWebhook } from './sync';
import { importGoogleEventsAsAppointments } from './appointment-sync';

export const getStatus = async (userId: string) => {
  const integrations = await prisma.calendarIntegration.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      isActive: true,
      lastSyncedAt: true,
      webhookExpiry: true,
    },
  });
  return integrations;
};

export const getGoogleAuthUrl = (userId: string) => {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: Buffer.from(JSON.stringify({ userId })).toString('base64'),
  });
};

export const handleGoogleCallback = async (code: string, state: string) => {
  const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Get email
  const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: userInfo } = await oauth2api.userinfo.get();

  await prisma.calendarIntegration.upsert({
    where: { userId_provider: { userId, provider: 'google' } },
    update: {
      email: userInfo.email!,
      accessToken: encrypt(tokens.access_token!),
      refreshToken: encrypt(tokens.refresh_token!),
      tokenExpiresAt: new Date(tokens.expiry_date!),
      isActive: true,
      syncToken: null,
    },
    create: {
      userId,
      provider: 'google',
      email: userInfo.email!,
      accessToken: encrypt(tokens.access_token!),
      refreshToken: encrypt(tokens.refresh_token!),
      tokenExpiresAt: new Date(tokens.expiry_date!),
    },
  });

  // Initial sync + import as appointments + webhook in background
  fetchAllGoogleEvents(userId)
    .then(() => importGoogleEventsAsAppointments(userId))
    .then(() => setupGoogleWebhook(userId))
    .catch(() => {});

  return userId;
};

export const getOutlookAuthUrl = (userId: string) => {
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    scope: 'https://graph.microsoft.com/Calendars.ReadWrite User.Read offline_access',
    response_mode: 'query',
    state,
  });
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize?${params}`;
};

export const handleOutlookCallback = async (code: string, state: string) => {
  const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    { method: 'POST', body: params }
  );
  const tokens = await tokenRes.json() as any;

  // Get email
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meRes.json() as any;

  await prisma.calendarIntegration.upsert({
    where: { userId_provider: { userId, provider: 'outlook' } },
    update: {
      email: me.mail || me.userPrincipalName,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      isActive: true,
      deltaLink: null,
    },
    create: {
      userId,
      provider: 'outlook',
      email: me.mail || me.userPrincipalName,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return userId;
};

export const disconnectProvider = async (userId: string, provider: string) => {
  await prisma.calendarIntegration.update({
    where: { userId_provider: { userId, provider } },
    data: { isActive: false },
  });
};

export const manualSync = async (userId: string) => {
  await Promise.allSettled([
    syncGoogleChanges(userId),
    syncOutlookChanges(userId),
  ]);
  // Import new Google events as appointments
  importGoogleEventsAsAppointments(userId).catch(() => {});
  return { synced: true };
};

export const getSlots = async (userId: string) => {
  return prisma.calendarSlot.findMany({ where: { userId } });
};

export const upsertSlots = async (userId: string, slots: Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}>) => {
  await prisma.calendarSlot.deleteMany({ where: { userId } });
  await prisma.calendarSlot.createMany({
    data: slots.map(s => ({ ...s, userId })),
  });
  return prisma.calendarSlot.findMany({ where: { userId } });
};
