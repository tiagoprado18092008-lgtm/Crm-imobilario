import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      originalUser?: any;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    // Also accept token via query param (for SSE EventSource which can't set headers)
    const queryToken = req.query.token as string | undefined;
    if (!authHeader?.startsWith('Bearer ') && !queryToken) {
      res.status(401).json({ error: 'No token provided', status: 401 });
      return;
    }

    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : queryToken!;
    const decoded = verifyToken(token) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        supervisorId: true,
        agencyId: true,
        locationId: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive', status: 401 });
      return;
    }

    req.user = user;

    // Impersonation support
    const impersonateId = req.headers['x-impersonate-user'] as string | undefined;
    if (
      impersonateId &&
      (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN')
    ) {
      const impersonated = await prisma.user.findUnique({
        where: { id: impersonateId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          agencyId: true,
          locationId: true,
          permissions: true,
        },
      });
      if (
        impersonated &&
        impersonated.isActive &&
        impersonated.agencyId === user.agencyId
      ) {
        req.user = { ...impersonated, _impersonatedBy: user.id };
        req.originalUser = user;
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', status: 401 });
  }
};
