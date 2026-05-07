import { verifyToken, createClerkClient } from '@clerk/backend';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export const clerkExchange = async (clerkToken: string): Promise<{ token: string; user: object }> => {
  let payload: any;
  try {
    payload = await verifyToken(clerkToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch {
    const err: any = new Error('Token Clerk inválido');
    err.status = 401;
    throw err;
  }

  const clerkUserId: string = payload.sub;

  // Try lookup by clerkUserId first (returning users)
  let user = await prisma.user.findUnique({ where: { clerkUserId } });

  if (!user) {
    // Fetch Clerk user to get email
    let clerkUser: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId);
    } catch {
      const err: any = new Error('Erro ao verificar identidade. Tente novamente.');
      err.status = 503;
      throw err;
    }
    const email: string | undefined = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (email) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];

      // Super-admin: auto-link on first login
      if (email === process.env.SUPER_ADMIN_EMAIL) {
        user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { clerkUserId, isActive: true, role: 'SUPER_ADMIN', name: name || user.name },
          });
        }
      }

      if (!user) {
        user = await prisma.user.findUnique({ where: { email } });
      }

      if (user && user.clerkUserId === null) {
        // First-time Clerk login for an invited user — associate clerkUserId, activate, sync name
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkUserId,
            isActive: true,
            name: name || user.name || email.split('@')[0],
          },
        });

        // Mark the invitation as used
        await prisma.invitation.updateMany({
          where: { email, usedAt: null },
          data: { usedAt: new Date() },
        });
      }

      // OWNER invite: no placeholder was created, create user now on first login
      if (!user) {
        const ownerInv = await prisma.invitation.findFirst({
          where: { email, type: 'OWNER', usedAt: null, expiresAt: { gt: new Date() } },
        });
        if (ownerInv) {
          user = await prisma.user.create({
            data: {
              name,
              email,
              clerkUserId,
              role: 'AGENCY_OWNER',
              isActive: true,
              onboardingCompleted: false,
              ...(ownerInv.agencyId ? { agencyId: ownerInv.agencyId } : {}),
            },
          });
          await prisma.invitation.update({ where: { id: ownerInv.id }, data: { usedAt: new Date() } });
        }
      }
    }

    // If the user found by email already has a different clerkUserId, deny access
    if (user && user.clerkUserId !== null && user.clerkUserId !== clerkUserId) {
      user = null as any;
    }
  }

  if (!user) {
    const err: any = new Error('Sem acesso. Contacte o administrador da agência.');
    err.status = 401;
    throw err;
  }

  if (!user.isActive) {
    const err: any = new Error('Conta desativada. Contacte o administrador.');
    err.status = 401;
    throw err;
  }

  const crmToken = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user as any;
  return { token: crmToken, user: userWithoutHash };
};
