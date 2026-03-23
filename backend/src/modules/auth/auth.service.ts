import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

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
    data: { name, email, passwordHash, phone, role: 'SUB_AGENT' },
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
