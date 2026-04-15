import bcrypt from 'bcryptjs';
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
  const rawRole = invitation?.role || role || 'CONSULTANT';
  const validRole = VALID_ROLES.includes(rawRole) ? rawRole : 'CONSULTANT';
  console.log('[REGISTER] role recebido:', role, '| rawRole:', rawRole, '| validRole:', validRole);

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
): Promise<{ token: string; user: object }> => {
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
  const { passwordHash: _, ...userWithoutHash } = user;
  return { token, user: userWithoutHash };
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
