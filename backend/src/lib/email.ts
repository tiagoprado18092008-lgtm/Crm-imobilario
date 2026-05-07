import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM =
  process.env.SMTP_FROM ||
  `${process.env.SMTP_FROM_NAME || process.env.CRM_NAME || 'CasaFlow'} <${process.env.SMTP_USER}>`;

export const EmailService = {
  async verify(): Promise<void> {
    await transporter.verify();
    console.log('[email] SMTP connection verified');
  },

  async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    await transporter.sendMail({ from: FROM, ...opts });
    console.log(`[email] Sent "${opts.subject}" to ${opts.to}`);
  },
};
