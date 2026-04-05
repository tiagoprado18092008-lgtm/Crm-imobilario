import prisma from '../../config/database';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

export const create = async (email: string, role: string, invitedById: string) => {
  // Check if email already registered
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email já registado'), { status: 409 });

  // Invalidate previous pending invitations for same email
  await prisma.invitation.updateMany({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() }, // expire them
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: { email, role, token, invitedById, expiresAt },
  });

  // Send invite email
  const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/register?token=${token}`;
  const transporter = getTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'CRM Imobiliário'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Convite para o CRM Imobiliário',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#6366f1">Bem-vindo ao CRM Imobiliário</h2>
          <p>Foi convidado para se juntar à plataforma.</p>
          <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600">Aceitar convite</a>
          <p style="color:#94a3b8;font-size:12px">Este convite expira em 7 dias. Se não pediu este convite, ignore este email.</p>
        </div>
      `,
    });
  } else {
    console.log(`[Invite] Link para ${email}: ${inviteUrl}`);
  }

  return invitation;
};

export const list = async () => {
  return prisma.invitation.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const verify = async (token: string) => {
  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv) throw Object.assign(new Error('Convite inválido'), { status: 404 });
  if (inv.usedAt) throw Object.assign(new Error('Convite já utilizado'), { status: 410 });
  if (inv.expiresAt < new Date()) throw Object.assign(new Error('Convite expirado'), { status: 410 });
  return inv;
};

export const revoke = async (id: string) => {
  return prisma.invitation.delete({ where: { id } });
};
