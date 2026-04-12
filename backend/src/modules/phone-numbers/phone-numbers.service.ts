import twilio from 'twilio';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('Stripe não configurado. Adiciona STRIPE_SECRET_KEY nas Definições.'), { status: 400 });
  return new Stripe(key);
}

const ENV_FILE = path.resolve(__dirname, '..', '..', '..', '.env');

function setEnvVar(key: string, value: string) {
  let content = '';
  try { content = fs.readFileSync(ENV_FILE, 'utf-8'); } catch { content = ''; }
  const regex = new RegExp(`^(${key}=).*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `$1"${value}"`);
  } else {
    content += `\n${key}="${value}"`;
  }
  fs.writeFileSync(ENV_FILE, content, 'utf-8');
  process.env[key] = value;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw Object.assign(new Error('Twilio não configurado. Adiciona as credenciais em Definições → Telefone.'), { status: 400 });
  return twilio(sid, token);
}

export const search = async (countryCode: string, areaCode?: string, numberType?: string) => {
  const client = getClient();
  const params: any = { limit: 20 };
  if (areaCode) params.areaCode = areaCode;

  const mapNumber = (n: any, type: string) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality || '',
    region: n.region || '',
    isoCountry: n.isoCountry,
    capabilities: n.capabilities,
    numberType: type,
    monthlyPrice: type === 'tollFree' ? 2.15 : 1.15,
  });

  // Try types in order of preference — some countries only support certain types
  const typesToTry = numberType
    ? [numberType]
    : ['local', 'mobile', 'tollFree'];

  const errors: string[] = [];
  for (const type of typesToTry) {
    try {
      const available = await (client.availablePhoneNumbers(countryCode) as any)[type].list(params);
      if (available.length > 0) {
        return available.map((n: any) => mapNumber(n, type));
      }
    } catch (e: any) {
      errors.push(`${type}: ${e.message}`);
    }
  }

  // If all types returned empty or errored, throw descriptive error
  const errMsg = errors.length > 0
    ? `Nenhum número disponível para ${countryCode}. Detalhes: ${errors.join(' | ')}`
    : `Nenhum número disponível para ${countryCode}. Tenta outro país (ex: US, GB).`;
  throw Object.assign(new Error(errMsg), { status: 400 });
};

export const createPaymentIntent = async (phoneNumber: string, monthlyPrice: number) => {
  const stripe = getStripe();
  // Charge 1 month upfront in cents (USD)
  const amountCents = Math.round(monthlyPrice * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: { phoneNumber },
    description: `Compra de número ${phoneNumber}`,
  });
  return { clientSecret: paymentIntent.client_secret, amount: amountCents };
};

export const purchase = async (userId: string, phoneNumber: string, friendlyName?: string) => {
  const client = getClient();
  const publicUrl = process.env.PUBLIC_URL || '';

  const twilioNum = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName || phoneNumber,
    voiceUrl: publicUrl ? `${publicUrl}/webhook/twilio/inbound-call` : undefined,
    smsUrl: publicUrl ? `${publicUrl}/webhook/twilio/sms` : undefined,
    voiceMethod: 'POST',
    smsMethod: 'POST',
  });

  // Auto-set TWILIO_PHONE_NUMBER if not already set
  if (!process.env.TWILIO_PHONE_NUMBER) {
    setEnvVar('TWILIO_PHONE_NUMBER', twilioNum.phoneNumber);
  }

  return prisma.phoneNumber.create({
    data: {
      number: twilioNum.phoneNumber,
      friendlyName: friendlyName || twilioNum.friendlyName || phoneNumber,
      twilioSid: twilioNum.sid,
      countryCode: phoneNumber.substring(1, 3),
      numberType: 'LOCAL',
      capabilities: JSON.stringify(twilioNum.capabilities || { voice: true, sms: true }),
      monthlyPrice: 1.15,
      user: { connect: { id: userId } },
    },
  });
};

export const list = async (userId: string) => {
  return prisma.phoneNumber.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
};

export const release = async (id: string, userId: string) => {
  const num = await prisma.phoneNumber.findFirst({ where: { id, userId } });
  if (!num) throw Object.assign(new Error('Número não encontrado'), { status: 404 });

  try {
    const client = getClient();
    await client.incomingPhoneNumbers(num.twilioSid).remove();
  } catch (_) {}

  return prisma.phoneNumber.update({ where: { id }, data: { status: 'RELEASED' } });
};

export const updateFriendlyName = async (id: string, userId: string, friendlyName: string) => {
  const num = await prisma.phoneNumber.findFirst({ where: { id, userId } });
  if (!num) throw Object.assign(new Error('Número não encontrado'), { status: 404 });
  return prisma.phoneNumber.update({ where: { id }, data: { friendlyName } });
};
