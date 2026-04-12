import fs from 'fs';
import path from 'path';
import twilio from 'twilio';
import { isWhatsAppConfigured, isEmailConfigured, isInstagramConfigured, isTwilioConfigured } from '../../config/comms.config';

// Path to the .env file (two levels up from src/modules/settings)
const ENV_FILE_PATH = path.resolve(__dirname, '..', '..', '..', '.env');

// Mask a secret value — show only last 4 chars
function maskValue(value: string): string {
  if (!value || value.length === 0) return '';
  if (value.length <= 4) return '****';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

export const getCommunicationsConfig = () => {
  return {
    // WhatsApp — also return flat keys for frontend compatibility
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

export const getChannelStatus = () => {
  return {
    whatsapp: isWhatsAppConfigured() ? 'configured' : 'unconfigured',
    email: isEmailConfigured() ? 'configured' : 'unconfigured',
    instagram: isInstagramConfigured() ? 'configured' : 'unconfigured',
    phone: isTwilioConfigured() ? 'configured' : 'unconfigured',
  };
};

// Update a key-value pair in the .env file
function updateEnvFile(updates: Record<string, string>): void {
  let content = '';
  try {
    content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
  } catch {
    content = '';
  }

  for (const [key, value] of Object.entries(updates)) {
    const escaped = value.replace(/"/g, '\\"');
    const regex = new RegExp(`^(${key}=).*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, `$1"${escaped}"`);
    } else {
      content += `\n${key}="${escaped}"`;
    }

    // Also update process.env immediately
    process.env[key] = value;
  }

  fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
}

// Map of allowed settable keys (so we don't allow arbitrary env overrides)
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
  accessToken: 'INSTAGRAM_ACCESS_TOKEN',
  pageId: 'INSTAGRAM_PAGE_ID',
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

async function runTwilioAutoSetup(sid: string, token: string): Promise<void> {
  const client = twilio(sid, token);
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const autoUpdates: Record<string, string> = {};

  // 1. Create TwiML App if not already configured
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

  // 3. Persist auto-generated values immediately
  if (Object.keys(autoUpdates).length > 0) {
    updateEnvFile(autoUpdates);
  }

  // 4. Update phone number webhooks if PUBLIC_URL is set
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
    // Nothing to update is OK — just return current config
    return { updated: [], config: getCommunicationsConfig() };
  }

  updateEnvFile(updates);

  // Auto-setup Twilio (create TwiML App + API Key) when credentials are saved
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
