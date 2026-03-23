import fs from 'fs';
import path from 'path';
import { isWhatsAppConfigured, isEmailConfigured, isInstagramConfigured } from '../../config/comms.config';

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
    whatsapp: {
      token: maskValue(process.env.WHATSAPP_TOKEN || ''),
      phoneNumberId: maskValue(process.env.WHATSAPP_PHONE_NUMBER_ID || ''),
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    },
    email: {
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: maskValue(process.env.SMTP_PASS || ''),
      smtpFrom: process.env.SMTP_FROM || '',
      imapHost: process.env.IMAP_HOST || '',
      imapPort: process.env.IMAP_PORT || '993',
      imapUser: process.env.IMAP_USER || '',
      imapPass: maskValue(process.env.IMAP_PASS || ''),
    },
    instagram: {
      accessToken: maskValue(process.env.INSTAGRAM_ACCESS_TOKEN || ''),
      pageId: process.env.INSTAGRAM_PAGE_ID || '',
    },
  };
};

export const getChannelStatus = () => {
  return {
    whatsapp: isWhatsAppConfigured(),
    email: isEmailConfigured(),
    instagram: isInstagramConfigured(),
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
  whatsappToken: 'WHATSAPP_TOKEN',
  whatsappPhoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
  whatsappVerifyToken: 'WHATSAPP_VERIFY_TOKEN',
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpUser: 'SMTP_USER',
  smtpPass: 'SMTP_PASS',
  smtpFrom: 'SMTP_FROM',
  imapHost: 'IMAP_HOST',
  imapPort: 'IMAP_PORT',
  imapUser: 'IMAP_USER',
  imapPass: 'IMAP_PASS',
  instagramAccessToken: 'INSTAGRAM_ACCESS_TOKEN',
  instagramPageId: 'INSTAGRAM_PAGE_ID',
};

export const updateCommunicationsConfig = (body: Record<string, string>) => {
  const updates: Record<string, string> = {};

  for (const [bodyKey, envKey] of Object.entries(ALLOWED_KEYS)) {
    if (bodyKey in body && body[bodyKey] !== undefined) {
      updates[envKey] = String(body[bodyKey]);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw Object.assign(new Error('No valid configuration keys provided'), { status: 400 });
  }

  updateEnvFile(updates);

  return { updated: Object.keys(updates), config: getCommunicationsConfig() };
};
