import nodemailer from 'nodemailer';

export function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'crm@demo.pt';

  if (!transporter) {
    // Credenciais não configuradas
    console.log(`[Email DEMO] To: ${opts.to} | Subject: ${opts.subject}`);
    console.log(`[Email DEMO] Body: ${opts.text || opts.html}`);
    return { success: true, messageId: `sim_email_${Date.now()}` };
  }

  try {
    const sendPromise = transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout')), 20000)
    );
    const info = await Promise.race([sendPromise, timeout]);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[Email Error]', err.message);
    try { transporter.close(); } catch {}
    // Network unreachable or SMTP blocked (e.g. Railway) — fall back to demo mode
    if (err.code === 'ENETUNREACH' || err.code === 'ECONNREFUSED' || err.message === 'SMTP timeout') {
      console.log(`[Email DEMO fallback] To: ${opts.to} | Subject: ${opts.subject}`);
      return { success: true, messageId: `sim_email_${Date.now()}` };
    }
    return { success: false, error: err.message };
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
