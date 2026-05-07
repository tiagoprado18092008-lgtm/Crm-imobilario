import { createClerkClient } from '@clerk/backend';
import { UserRole } from '@prisma/client';
import prisma from '../../config/database';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export const listMembers = async (agencyId: string) => {
  return prisma.user.findMany({
    where: { agencyId },
    select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateMember = async (id: string, agencyId: string, data: { role?: UserRole; isActive?: boolean }) => {
  const member = await prisma.user.findFirst({ where: { id, agencyId } });
  if (!member) throw Object.assign(new Error('Membro não encontrado'), { status: 404 });
  return prisma.user.update({ where: { id }, data });
};

export const deactivateMember = async (id: string, agencyId: string) => {
  const member = await prisma.user.findFirst({ where: { id, agencyId } });
  if (!member) throw Object.assign(new Error('Membro não encontrado'), { status: 404 });

  if (member.clerkUserId) {
    try {
      await clerkClient.users.banUser(member.clerkUserId);
    } catch (err: any) {
      console.error(`[team] Failed to ban Clerk user ${member.clerkUserId}:`, err.message);
    }
  }

  return prisma.user.update({ where: { id }, data: { isActive: false } });
};
