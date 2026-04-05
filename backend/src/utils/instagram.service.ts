import axios from 'axios';

export async function sendInstagramDM(
  recipientId: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.INSTAGRAM_PAGE_ID;

  if (!token || !pageId) {
    console.log(`[Instagram SIM] To: ${recipientId} | Message: ${message}`);
    return { success: true, messageId: `sim_ig_${Date.now()}` };
  }

  try {
    const res = await axios.post(
      `https://graph.instagram.com/v24.0/${pageId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: true, messageId: res.data?.message_id };
  } catch (err: any) {
    return {
      success: false,
      error: err?.response?.data?.error?.message || err.message,
    };
  }
}
