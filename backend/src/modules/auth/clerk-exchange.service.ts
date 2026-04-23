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
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email: string | undefined = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (email) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user && user.clerkUserId === null) {
        // First-time Clerk login for an invited user — associate clerkUserId, activate, sync name
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];
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
