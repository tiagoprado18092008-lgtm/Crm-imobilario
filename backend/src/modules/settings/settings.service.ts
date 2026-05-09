import axios from 'axios';
import twilio from 'twilio';
import prisma from '../../config/database';
import { isWhatsAppConfigured, isEmailConfigured, isInstagramConfigured, isTwilioConfigured } from '../../config/comms.config';

// ─── Sensitive keys — stored encrypted in DB ─────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'WHATSAPP_TOKEN',
  'SMTP_PASS',
  'IMAP_PASS',
  'INSTAGRAM_ACCESS_TOKEN',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_API_SECRET',
  'JWT_SECRET',
]);

// Simple XOR-based obfuscation using ENCRYPTION_KEY env var.
// Not military-grade but prevents plain-text secrets in DB if someone dumps the table.
function encrypt(value: string): string {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-me';
  let result = '';
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(value.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return 'enc:' + Buffer.from(result, 'binary').toString('base64');
}

function decrypt(value: string): string {
  if (!value.startsWith('enc:')) return value;
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-me';
  const decoded = Buffer.from(value.slice(4), 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// ─── Bootstrap: load all settings from DB into process.env on server start ───

export async function loadSettingsFromDB(): Promise<void> {
  try {
    const rows = await prisma.systemSettings.findMany();
    let loaded = 0;
    for (const row of rows) {
      const plain = decrypt(row.value);
      // Only override if the env var is not already set by the platform (platform vars take priority)
      if (!process.env[row.key] || process.env[row.key] === '') {
        process.env[row.key] = plain;
        loaded++;
      }
    }
    if (rows.length > 0) {
      console.log(`[Settings] Loaded ${rows.length} settings from DB (${loaded} applied, rest overridden by platform env)`);
    }
  } catch (err) {
    // Table may not exist yet on first deploy — safe to ignore
    console.warn('[Settings] Could not load settings from DB (first deploy?):', (err as Error).message);
  }
}

// ─── Persist settings to DB + process.env ────────────────────────────────────

async function persistSettings(updates: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    const stored = SENSITIVE_KEYS.has(key) ? encrypt(value) : value;

    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: stored },
      create: { key, value: stored },
    });

    // Also update process.env immediately so the running server uses the new value
    process.env[key] = value;
  }
}

// ─── Mask a secret value — show only last 4 chars ────────────────────────────

function maskValue(value: string): string {
  if (!value || value.length === 0) return '';
  if (value.length <= 4) return '****';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

// ─── getCommunicationsConfig ──────────────────────────────────────────────────

export const getCommunicationsConfig = () => {
  return {
    // WhatsApp
    whatsappToken: maskValue(process.env.WHATSAPP_TOKEN || ''),
    phoneNumberId: maskValue(process.env.WHATSAPP_PHONE_NUMBER_ID || ''),
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    // Email SMTP
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: maskValue(process.env.SMTP_PASS || ''),
    smtpFrom: process.env.SMTP_FROM || '',
    fromName: process.env.SMTP_FROM_NAME || '',
    fromEmail: process.env.SMTP_FROM || '',
    // IMAP
    imapHost: process.env.IMAP_HOST || '',
    imapPort: process.env.IMAP_PORT || '993',
    imapUser: process.env.IMAP_USER || '',
    imapPass: maskValue(process.env.IMAP_PASS || ''),
    // Instagram
    igAccessToken: maskValue(process.env.INSTAGRAM_ACCESS_TOKEN || ''),
    igPageId: process.env.INSTAGRAM_PAGE_ID || '',
    igVerifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || '',
    // Twilio
    twilioAccountSid: maskValue(process.env.TWILIO_ACCOUNT_SID || ''),
    twilioAuthToken: maskValue(process.env.TWILIO_AUTH_TOKEN || ''),
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    twilioTwimlAppSid: process.env.TWILIO_TWIML_APP_SID || '',
    twilioApiKey: maskValue(process.env.TWILIO_API_KEY || ''),
    twilioApiSecret: maskValue(process.env.TWILIO_API_SECRET || ''),
    publicUrl: process.env.PUBLIC_URL || '',
    // General
    crmName: process.env.CRM_NAME || 'CasaFlow',
    timezone: process.env.TZ || 'Europe/Lisbon',
    language: process.env.APP_LANGUAGE || 'pt-PT',
  };
};

// ─── getChannelStatus ─────────────────────────────────────────────────────────

export const getChannelStatus = () => {
  return {
    whatsapp: isWhatsAppConfigured() ? 'configured' : 'unconfigured',
    email: isEmailConfigured() ? 'configured' : 'unconfigured',
    instagram: isInstagramConfigured() ? 'configured' : 'unconfigured',
    phone: isTwilioConfigured() ? 'configured' : 'unconfigured',
  };
};

// ─── Map of allowed settable keys ────────────────────────────────────────────

const ALLOWED_KEYS: Record<string, string> = {
  // WhatsApp
  whatsappToken: 'WHATSAPP_TOKEN',
  phoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
  verifyToken: 'WHATSAPP_VERIFY_TOKEN',
  whatsappPhoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
  whatsappVerifyToken: 'WHATSAPP_VERIFY_TOKEN',
  // Email SMTP
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpUser: 'SMTP_USER',
  smtpPass: 'SMTP_PASS',
  smtpFrom: 'SMTP_FROM',
  fromName: 'SMTP_FROM_NAME',
  fromEmail: 'SMTP_FROM',
  // Email IMAP
  imapHost: 'IMAP_HOST',
  imapPort: 'IMAP_PORT',
  imapUser: 'IMAP_USER',
  imapPass: 'IMAP_PASS',
  // Instagram
  instagramAccessToken: 'INSTAGRAM_ACCESS_TOKEN',
  instagramPageId: 'INSTAGRAM_PAGE_ID',
  instagramVerifyToken: 'INSTAGRAM_VERIFY_TOKEN',
  accessToken: 'INSTAGRAM_ACCESS_TOKEN',
  pageId: 'INSTAGRAM_PAGE_ID',
  igVerifyToken: 'INSTAGRAM_VERIFY_TOKEN',
  // Twilio
  twilioAccountSid: 'TWILIO_ACCOUNT_SID',
  twilioAuthToken: 'TWILIO_AUTH_TOKEN',
  twilioPhoneNumber: 'TWILIO_PHONE_NUMBER',
  twilioTwimlAppSid: 'TWILIO_TWIML_APP_SID',
  twilioApiKey: 'TWILIO_API_KEY',
  twilioApiSecret: 'TWILIO_API_SECRET',
  publicUrl: 'PUBLIC_URL',
  // General
  crmName: 'CRM_NAME',
  timezone: 'TZ',
  language: 'APP_LANGUAGE',
};

// ─── Twilio Auto-Setup ────────────────────────────────────────────────────────

async function runTwilioAutoSetup(sid: string, token: string): Promise<void> {
  const client = twilio(sid, token);
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const autoUpdates: Record<string, string> = {};

  // 1. Create TwiML App if not already configured, or update voiceUrl if PUBLIC_URL changed
  if (!process.env.TWILIO_TWIML_APP_SID) {
    try {
      const voiceUrl = publicUrl
        ? `${publicUrl}/webhook/twilio/voice`
        : 'https://placeholder.example.com/webhook/twilio/voice';
      const app = await client.applications.create({
        friendlyName: 'CRM Browser Calls',
        voiceUrl,
        voiceMethod: 'POST',
      });
      autoUpdates['TWILIO_TWIML_APP_SID'] = app.sid;
      console.log(`[Twilio Auto-Setup] TwiML App created: ${app.sid}`);
    } catch (err) {
      console.error('[Twilio Auto-Setup] Failed to create TwiML App:', err);
    }
  } else if (publicUrl) {
    try {
      await client.applications(process.env.TWILIO_TWIML_APP_SID).update({
        voiceUrl: `${publicUrl}/webhook/twilio/voice`,
        voiceMethod: 'POST',
      });
      console.log(`[Twilio Auto-Setup] TwiML App updated: ${process.env.TWILIO_TWIML_APP_SID}`);
    } catch (err) {
      console.error('[Twilio Auto-Setup] Failed to update TwiML App:', err);
    }
  }

  // 2. Create API Key if not already configured
  if (!process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET) {
    try {
      const key = await (client as any).newKeys.create({ friendlyName: 'CRM Browser Calls Key' });
      autoUpdates['TWILIO_API_KEY'] = key.sid;
      autoUpdates['TWILIO_API_SECRET'] = key.secret;
      console.log(`[Twilio Auto-Setup] API Key created: ${key.sid}`);
    } catch (err) {
      console.error('[Twilio Auto-Setup] Failed to create API Key:', err);
    }
  }

  if (Object.keys(autoUpdates).length > 0) {
    await persistSettings(autoUpdates);
  }

  // 3. Update phone number webhooks if PUBLIC_URL is set
  if (publicUrl) {
    try {
      const numbers = await client.incomingPhoneNumbers.list();
      await Promise.all(numbers.map(n =>
        n.update({
          voiceUrl: `${publicUrl}/webhook/twilio/inbound-call`,
          voiceMethod: 'POST',
          smsUrl: `${publicUrl}/webhook/twilio/sms`,
          smsMethod: 'POST',
        })
      ));
      console.log(`[Twilio Auto-Setup] Updated ${numbers.length} number(s) with webhooks`);
    } catch (err) {
      console.error('[Twilio Auto-Setup] Failed to update number webhooks:', err);
    }
  }
}

export const triggerTwilioAutoSetup = async (): Promise<{ ok: boolean; message: string }> => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { ok: false, message: 'Twilio não configurado. Guarda o Account SID e Auth Token primeiro.' };
  }
  await runTwilioAutoSetup(sid, token);
  return { ok: true, message: 'Auto-setup concluído.' };
};

// ─── updateCommunicationsConfig ───────────────────────────────────────────────

export const updateCommunicationsConfig = async (body: Record<string, string>) => {
  const updates: Record<string, string> = {};

  for (const [bodyKey, envKey] of Object.entries(ALLOWED_KEYS)) {
    if (bodyKey in body && body[bodyKey] !== undefined) {
      const val = String(body[bodyKey]);
      // Skip masked values (e.g. "****f869") — don't overwrite real value with mask
      if (val.startsWith('*')) continue;
      if (val.trim() === '') continue;
      updates[envKey] = val;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { updated: [], config: getCommunicationsConfig() };
  }

  await persistSettings(updates);

  // Auto-setup Twilio when credentials are saved
  const sidToUse = updates['TWILIO_ACCOUNT_SID'] || process.env.TWILIO_ACCOUNT_SID;
  const tokenToUse = updates['TWILIO_AUTH_TOKEN'] || process.env.TWILIO_AUTH_TOKEN;
  if (
    (updates['TWILIO_ACCOUNT_SID'] || updates['TWILIO_AUTH_TOKEN']) &&
    sidToUse && tokenToUse
  ) {
    await runTwilioAutoSetup(sidToUse, tokenToUse);
  }

  return { updated: Object.keys(updates), config: getCommunicationsConfig() };
};

// ─── Connection tests ─────────────────────────────────────────────────────────

export const testWhatsAppConnection = async () => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { success: false, message: 'Credenciais não configuradas' };
  try {
    const res = await axios.get(`https://graph.facebook.com/v21.0/${phoneId}`, {
      params: { access_token: token }
    });
    return { success: true, message: `Ligado: ${res.data.display_phone_number || phoneId}` };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.error?.message || 'Erro de ligação' };
  }
};

export const testEmailConnection = async () => {
  const { isEmailConfigured, sendEmail } = await import('../../utils/email.service');
  if (!isEmailConfigured()) return { success: false, message: 'SMTP não configurado' };
  try {
    const result = await sendEmail({
      to: process.env.SMTP_USER || process.env.SMTP_FROM || 'test@test.com',
      subject: 'Teste de ligação SMTP',
      html: '<p>Teste de ligação SMTP bem-sucedido.</p>',
    });
    if (result.success) return { success: true, message: 'Ligação SMTP verificada com sucesso' };
    return { success: false, message: result.error || 'Erro SMTP' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro SMTP' };
  }
};

export const testTwilioConnection = async () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { success: false, message: 'Credenciais Twilio não configuradas' };
  try {
    const client = twilio(sid, token);
    const account = await client.api.accounts(sid).fetch();
    return { success: true, message: `Conta: ${account.friendlyName}` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro Twilio' };
  }
};
