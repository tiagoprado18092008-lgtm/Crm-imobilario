import https from 'https';

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'onboarding@resend.dev';

  if (!apiKey || !apiKey.startsWith('re_')) {
    console.log(`[Email DEMO] To: ${opts.to} | Subject: ${opts.subject}`);
    return { success: true, messageId: `sim_email_${Date.now()}` };
  }

  const body = JSON.stringify({
    from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode && res.statusCode < 300) {
              console.log(`[Email OK] To: ${opts.to} | id: ${json.id}`);
              resolve({ success: true, messageId: json.id });
            } else {
              console.error('[Email Error]', json);
              resolve({ success: false, error: json.message || JSON.stringify(json) });
            }
          } catch {
            resolve({ success: false, error: data });
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('[Email Error]', err.message);
      resolve({ success: false, error: err.message });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

export function isEmailConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  return !!(apiKey && apiKey.startsWith('re_'));
}
