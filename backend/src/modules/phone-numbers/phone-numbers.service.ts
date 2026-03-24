import twilio from 'twilio';
import prisma from '../../config/database';

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw Object.assign(new Error('Twilio não configurado. Adiciona as credenciais em Definições → Telefone.'), { status: 400 });
  return twilio(sid, token);
}

export const search = async (countryCode: string, areaCode?: string, numberType: string = 'local') => {
  const client = getClient();
  const type = numberType.toLowerCase() as 'local' | 'tollFree' | 'mobile';
  const params: any = { limit: 20 };
  if (areaCode) params.areaCode = areaCode;

  try {
    const available = await (client.availablePhoneNumbers(countryCode) as any)[type].list(params);
    return available.map((n: any) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      isoCountry: n.isoCountry,
      capabilities: n.capabilities,
      monthlyPrice: 1.15,
    }));
  } catch (e: any) {
    throw Object.assign(new Error(`Erro ao pesquisar números: ${e.message}`), { status: 400 });
  }
};

export const purchase = async (userId: string, phoneNumber: string, friendlyName?: string) => {
  const client = getClient();
  const publicUrl = process.env.PUBLIC_URL || '';

  const twilioNum = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName || phoneNumber,
    voiceUrl: publicUrl ? `${publicUrl}/webhook/twilio/voice` : undefined,
    smsUrl: publicUrl ? `${publicUrl}/webhook/twilio/sms` : undefined,
    voiceMethod: 'POST',
    smsMethod: 'POST',
  });

  return prisma.phoneNumber.create({
    data: {
      number: twilioNum.phoneNumber,
      friendlyName: friendlyName || twilioNum.friendlyName || phoneNumber,
      twilioSid: twilioNum.sid,
      countryCode: phoneNumber.substring(1, 3),
      numberType: 'LOCAL',
      capabilities: JSON.stringify(twilioNum.capabilities || { voice: true, sms: true }),
      userId,
      monthlyPrice: 1.15,
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
