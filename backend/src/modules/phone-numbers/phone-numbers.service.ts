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
