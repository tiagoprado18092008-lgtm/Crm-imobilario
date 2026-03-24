import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<{ token: string; user: object }> => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err: any = new Error('Email já registado');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, role: 'CONSULTANT' },
  });

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
      avatarUrl: true,
      googleId: true,
      isActive: true,
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
