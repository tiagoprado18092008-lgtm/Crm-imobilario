import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v21.0';

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    // Simulate for demo mode
    console.log(`[WhatsApp DEMO] To: ${to} | Message: ${message}`);
    return { success: true, messageId: `demo_${Date.now()}` };
  }

  try {
    const res = await axios.post(
      `${BASE_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // strip non-digits
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true, messageId: res.data?.messages?.[0]?.id };
  } catch (err: any) {
    console.error('[WhatsApp Error]', err?.response?.data || err.message);
    return {
      success: false,
      error: err?.response?.data?.error?.message || err.message,
    };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  langCode = 'pt_PT'
): Promise<{ success: boolean; messageId?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log(`[WhatsApp DEMO Template] To: ${to} | Template: ${templateName}`);
    return { success: true, messageId: `demo_tpl_${Date.now()}` };
  }

  try {
    const res = await axios.post(
      `${BASE_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: { name: templateName, language: { code: langCode } },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: true, messageId: res.data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false };
  }
}
