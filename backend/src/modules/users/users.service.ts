import bcrypt from 'bcryptjs';
import prisma from '../../config/database';

export const list = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      onboardingCompleted: true,
      supervisorId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { subAgents: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  return users;
};

export const create = async (dto: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  supervisorId?: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) {
    const err: any = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role as any,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      supervisorId: dto.supervisorId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      onboardingCompleted: true,
      supervisorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

export const getById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      onboardingCompleted: true,
      supervisorId: true,
      createdAt: true,
      updatedAt: true,
      supervisor: {
        select: { id: true, name: true, email: true, role: true },
      },
      subAgents: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
    },
  });

  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
};

export const update = async (
  id: string,
  dto: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phone?: string;
    avatarUrl?: string;
    supervisorId?: string;
    isActive?: boolean;
    onboardingCompleted?: boolean;
  }
) => {
  const updateData: any = {};
  if (dto.name !== undefined) updateData.name = dto.name;
  if (dto.email !== undefined) updateData.email = dto.email;
  if (dto.role !== undefined) updateData.role = dto.role;
  if (dto.phone !== undefined) updateData.phone = dto.phone;
  if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
  if (dto.supervisorId !== undefined) updateData.supervisorId = dto.supervisorId;
  if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
  if (dto.onboardingCompleted !== undefined) updateData.onboardingCompleted = dto.onboardingCompleted;
  if (dto.password) {
    updateData.passwordHash = await bcrypt.hash(dto.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      onboardingCompleted: true,
      supervisorId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

export const changePassword = async (id: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const err: any = new Error('User not found'); err.status = 404; throw err;
  }
  if (!user.passwordHash) {
    const err: any = new Error('Esta conta usa login com Google. Não é possível alterar a password.'); err.status = 400; throw err;
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const err: any = new Error('Password atual incorreta'); err.status = 401; throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
};

export const deactivate = async (id: string) => {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
  return user;
};

export const getSubAgents = async (supervisorId: string) => {
  return prisma.user.findMany({
    where: { supervisorId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};
