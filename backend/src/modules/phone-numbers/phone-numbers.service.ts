import twilio from 'twilio';
import Stripe from 'stripe';
import prisma from '../../config/database';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error('Stripe não configurado. Adiciona STRIPE_SECRET_KEY nas Definições.'), { status: 400 });
  return new Stripe(key);
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

  // Always try all types — if user picked one, try it first then fall back
  const allTypes = ['local', 'mobile', 'tollFree'];
  const typesToTry = numberType
    ? [numberType, ...allTypes.filter(t => t !== numberType)]
    : allTypes;

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

  const errMsg = `Nenhum número disponível para ${countryCode}. Tenta outro país (ex: US, GB).`;
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

  // Some countries (PT, DE, etc.) require a registered address on the Twilio account
  let addressSid: string | undefined;
  try {
    const addresses = await client.addresses.list({ limit: 20 });
    // Prefer validated address, fall back to first available
    const validated = addresses.find((a: any) => a.validated);
    addressSid = (validated || addresses[0])?.sid;
  } catch (_) {}

  const createParams: any = {
    phoneNumber,
    friendlyName: friendlyName || phoneNumber,
    voiceUrl: publicUrl ? `${publicUrl}/webhook/twilio/inbound-call` : undefined,
    smsUrl: publicUrl ? `${publicUrl}/webhook/twilio/sms` : undefined,
    voiceMethod: 'POST',
    smsMethod: 'POST',
  };
  if (addressSid) createParams.addressSid = addressSid;

  let twilioNum: any;
  try {
    twilioNum = await client.incomingPhoneNumbers.create(createParams);
  } catch (err: any) {
    // Provide a clear message when address is required but missing
    if (err.message?.includes('Address') || err.code === 21650) {
      throw Object.assign(
        new Error('Este número requer um endereço registado na tua conta Twilio. Vai a twilio.com/console/addresses, adiciona um endereço e tenta novamente.'),
        { status: 400 }
      );
    }
    throw err;
  }

  // Auto-set TWILIO_PHONE_NUMBER if not already set — persist to DB (works on Render)
  if (!process.env.TWILIO_PHONE_NUMBER) {
    await prisma.systemSettings.upsert({
      where: { key: 'TWILIO_PHONE_NUMBER' },
      update: { value: twilioNum.phoneNumber },
      create: { key: 'TWILIO_PHONE_NUMBER', value: twilioNum.phoneNumber },
    });
    process.env.TWILIO_PHONE_NUMBER = twilioNum.phoneNumber;
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
    if (num.twilioSid) {
      const client = getClient();
      await client.incomingPhoneNumbers(num.twilioSid).remove();
    }
  } catch (_) {}

  return prisma.phoneNumber.update({ where: { id }, data: { status: 'RELEASED' } });
};

export const updateFriendlyName = async (id: string, userId: string, friendlyName: string) => {
  const num = await prisma.phoneNumber.findFirst({ where: { id, userId } });
  if (!num) throw Object.assign(new Error('Número não encontrado'), { status: 404 });
  return prisma.phoneNumber.update({ where: { id }, data: { friendlyName } });
};

// ─── Auto-provision Twilio TwiML App + API Keys ───────────────────────────────

export const autoProvisionTwilio = async () => {
  const client = getClient();
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) {
    throw Object.assign(
      new Error('Define PUBLIC_URL nas Definições antes de fazer o setup automático.'),
      { status: 400 }
    );
  }

  // 1. TwiML App — reuse if exists
  const apps = await client.applications.list({ limit: 50 });
  let twimlApp: any = apps.find((a: any) => a.friendlyName === 'CRM Voice');
  if (!twimlApp) {
    twimlApp = await client.applications.create({
      friendlyName: 'CRM Voice',
      voiceUrl: `${publicUrl}/webhook/twilio/client`,
      voiceMethod: 'POST',
    });
  }

  // 2. API Key — always create new (can't read secret of existing key)
  const keys = await (client as any).newKeys.list({ limit: 50 });
  const existing = keys.find((k: any) => k.friendlyName === 'CRM Voice Key');
  let apiKey: any;
  if (existing) {
    apiKey = await (client as any).newKeys.create({ friendlyName: `CRM Voice Key ${Date.now()}` });
  } else {
    apiKey = await (client as any).newKeys.create({ friendlyName: 'CRM Voice Key' });
  }

  // 3. Persist into SystemSettings
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_TWIML_APP_SID' },
    update: { value: twimlApp.sid },
    create: { key: 'TWILIO_TWIML_APP_SID', value: twimlApp.sid },
  });
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_API_KEY' },
    update: { value: apiKey.sid },
    create: { key: 'TWILIO_API_KEY', value: apiKey.sid },
  });
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_API_SECRET' },
    update: { value: apiKey.secret },
    create: { key: 'TWILIO_API_SECRET', value: apiKey.secret },
  });
  process.env.TWILIO_TWIML_APP_SID = twimlApp.sid;
  process.env.TWILIO_API_KEY = apiKey.sid;
  process.env.TWILIO_API_SECRET = apiKey.secret;

  return {
    twimlAppSid: twimlApp.sid,
    apiKey: apiKey.sid,
  };
};

// ─── Verify external personal number as Caller ID ─────────────────────────────

const E164 = /^\+[1-9]\d{6,14}$/;

export const verifyPersonalNumber = async (
  _userId: string,
  phoneNumber: string,
  channel: 'sms' | 'call' = 'call'
) => {
  if (!E164.test(phoneNumber)) {
    throw Object.assign(
      new Error('Número inválido. Usa o formato internacional, ex: +351912345678'),
      { status: 400 }
    );
  }
  const client = getClient();
  const req = await (client as any).validationRequests.create({
    phoneNumber,
    friendlyName: phoneNumber,
    callDelay: channel === 'call' ? 5 : undefined,
  });
  return { validationCode: req.validationCode, phoneNumber: req.phoneNumber };
};

export const confirmPersonalNumber = async (
  userId: string,
  phoneNumber: string,
  friendlyName?: string
) => {
  if (!E164.test(phoneNumber)) {
    throw Object.assign(new Error('Número inválido.'), { status: 400 });
  }
  const client = getClient();
  const outgoing = await (client as any).outgoingCallerIds.list({ phoneNumber, limit: 5 });
  if (outgoing.length === 0) {
    throw Object.assign(
      new Error('Número ainda não verificado. Confirma o código recebido e tenta de novo.'),
      { status: 400 }
    );
  }
  const existing = await prisma.phoneNumber.findUnique({ where: { number: phoneNumber } });
  if (existing) {
    return prisma.phoneNumber.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        source: 'EXTERNAL_VERIFIED',
        friendlyName: friendlyName || existing.friendlyName,
      },
    });
  }
  return prisma.phoneNumber.create({
    data: {
      number: phoneNumber,
      friendlyName: friendlyName || phoneNumber,
      twilioSid: null,
      status: 'ACTIVE',
      countryCode: phoneNumber.substring(1, 3),
      numberType: 'LOCAL',
      capabilities: JSON.stringify({ voice: true, sms: false }),
      monthlyPrice: 0,
      source: 'EXTERNAL_VERIFIED',
      user: { connect: { id: userId } },
    },
  });
};

// ─── Routing settings (ringAll, voicemailEnabled) ─────────────────────────────

export const updateRoutingSettings = async (
  id: string,
  userId: string,
  updates: { ringAll?: boolean; voicemailEnabled?: boolean }
) => {
  const num = await prisma.phoneNumber.findFirst({ where: { id, userId } });
  if (!num) throw Object.assign(new Error('Número não encontrado'), { status: 404 });
  const data: any = {};
  if (typeof updates.ringAll === 'boolean') data.ringAll = updates.ringAll;
  if (typeof updates.voicemailEnabled === 'boolean') data.voicemailEnabled = updates.voicemailEnabled;
  return prisma.phoneNumber.update({ where: { id }, data });
};
