import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (
  name: string,
  email: string,
  password: string,
  phone?: string,
  agency?: string,
  invitationToken?: string,
  role?: string
): Promise<{ token: string; user: object }> => {
  // If a token was provided, validate it
  let invitation: any = null;
  if (invitationToken) {
    invitation = await prisma.invitation.findUnique({ where: { token: invitationToken } });
    if (!invitation) {
      const err: any = new Error('Convite inválido');
      err.status = 404;
      throw err;
    }
    if (invitation.usedAt) {
      const err: any = new Error('Convite já utilizado');
      err.status = 410;
      throw err;
    }
    if (invitation.expiresAt < new Date()) {
      const err: any = new Error('Convite expirado');
      err.status = 410;
      throw err;
    }
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      const err: any = new Error('O email não corresponde ao convite');
      err.status = 400;
      throw err;
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err: any = new Error('Email já registado');
    err.status = 409;
    throw err;
  }

  // Map legacy/invalid roles to valid enum values
  const VALID_ROLES = ['AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER', 'CONSULTANT'];
  // Se não vem role mas vem agency, é AGENCY_OWNER
  const inferredRole = !role && agency ? 'AGENCY_OWNER' : role;
  const rawRole = invitation?.role || inferredRole || 'CONSULTANT';
  const validRole = VALID_ROLES.includes(rawRole) ? rawRole : 'CONSULTANT';
  console.log('[REGISTER] role recebido:', role, '| inferredRole:', inferredRole, '| validRole:', validRole);

  const passwordHash = await bcrypt.hash(password, 10);

  // If registering as AGENCY_OWNER, create an Agency automatically
  let agencyId: string | undefined;
  let locationId: string | undefined;

  if (validRole === 'AGENCY_OWNER' && agency) {
    const slug = agency.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const uniqueSlug = `${slug}-${Date.now()}`;
    const newAgency = await prisma.agency.create({
      data: { name: agency, slug: uniqueSlug },
    });
    agencyId = newAgency.id;
  }

  // Se veio via convite, herda agencyId e locationId de quem convidou
  if (invitation) {
    if (invitation.agencyId) agencyId = invitation.agencyId;
    if (invitation.locationId) locationId = invitation.locationId;

    // Se agencyId ainda não está definido, busca o do utilizador que convidou
    if (!agencyId && invitation.invitedById) {
      const inviter = await prisma.user.findUnique({
        where: { id: invitation.invitedById },
        select: { agencyId: true, locationId: true },
      });
      if (inviter?.agencyId) agencyId = inviter.agencyId;
      if (inviter?.locationId && !locationId) locationId = inviter.locationId;
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
      role: validRole as any,
      ...(agencyId ? { agencyId } : {}),
      ...(locationId ? { locationId } : {}),
    },
  });

  // Mark the invitation as used
  if (invitation) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });
  }

  console.log('[REGISTER] user criado:', { id: user.id, role: user.role, agencyId: user.agencyId });
  const token = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user;
  return { token, user: userWithoutHash };
};

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: object }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  if (!user.passwordHash) {
    const err: any = new Error('Esta conta usa login com Google. Clique em "Entrar com Google".');
    err.status = 400;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const token = signToken({ userId: user.id, role: user.role });
  const refresh = await issueRefreshToken(user.id);
  const { passwordHash: _, ...userWithoutHash } = user;
  return { token, refreshToken: refresh, user: userWithoutHash };
};

export const googleAuth = async (idToken: string): Promise<{ token: string; user: object }> => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const err: any = new Error('Google OAuth não configurado');
    err.status = 501;
    throw err;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    const err: any = new Error('Token Google inválido');
    err.status = 400;
    throw err;
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: payload.name || payload.email,
        email: payload.email,
        googleId: payload.sub,
        avatarUrl: payload.picture,
        passwordHash: null,
        role: 'CONSULTANT',
        isActive: true,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: payload.sub, avatarUrl: payload.picture || user.avatarUrl },
    });
  }

  if (!user.isActive) {
    const err: any = new Error('Conta inativa. Contacte o administrador.');
    err.status = 403;
    throw err;
  }

  const token = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user;
  return { token, user: userWithoutHash };
};

export const getMe = async (userId: string): Promise<object> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      agencyId: true,
      agency: true,
      locationId: true,
      avatarUrl: true,
      googleId: true,
      isActive: true,
      onboardingCompleted: true,
      supervisorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return user;
};

const getMailTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // don't leak whether email exists

  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  await getMailTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Recuperação de password — CasaFlow',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0f2553">Recuperar password</h2>
        <p>Clica no botão abaixo para definir uma nova password. O link expira em 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0f2553;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Definir nova password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Se não pediste a recuperação, ignora este email.</p>
      </div>
    `,
  });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) throw Object.assign(new Error('Token inválido'), { status: 400 });
  if (record.usedAt) throw Object.assign(new Error('Token já utilizado'), { status: 410 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Token expirado'), { status: 410 });
  if (newPassword.length < 6) throw Object.assign(new Error('A password deve ter pelo menos 6 caracteres'), { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { email: record.email }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);
};

export const issueRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!record) throw Object.assign(new Error('Refresh token inválido'), { status: 401 });
  if (record.revokedAt) throw Object.assign(new Error('Refresh token revogado'), { status: 401 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Refresh token expirado'), { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw Object.assign(new Error('Utilizador inativo'), { status: 401 });

  await prisma.refreshToken.update({ where: { token: refreshToken }, data: { revokedAt: new Date() } });
  const newRefreshToken = await issueRefreshToken(user.id);
  const accessToken = signToken({ userId: user.id, role: user.role });

  return { token: accessToken, refreshToken: newRefreshToken };
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
