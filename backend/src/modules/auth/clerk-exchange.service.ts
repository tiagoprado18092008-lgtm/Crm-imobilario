import { verifyToken } from '@clerk/backend';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

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
  const email: string | undefined = payload.email;

  // Try lookup by clerkUserId first, then fall back to email
  let user = await prisma.user.findUnique({ where: { clerkUserId } });

  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // First-time Clerk login: save clerkUserId for future lookups
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId },
      });
    }
  }

  if (!user) {
    const err: any = new Error('Utilizador não encontrado no CRM');
    err.status = 401;
    throw err;
  }

  if (!user.isActive) {
    const err: any = new Error('Conta desativada');
    err.status = 401;
    throw err;
  }

  const crmToken = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user as any;
  return { token: crmToken, user: userWithoutHash };
};
