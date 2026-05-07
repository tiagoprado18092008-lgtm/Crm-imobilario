import { Request, Response, NextFunction } from 'express';

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN';
}

export function isOwnerLevel(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'AGENCY_OWNER' || role === 'AGENCY_ADMIN';
}

const RANK: Record<string, number> = {
  SUPER_ADMIN: 100,
  AGENCY_OWNER: 80,
  AGENCY_ADMIN: 60,
  LOCATION_ADMIN: 40,
  TEAM_LEADER: 30,
  CONSULTANT: 20,
  USER: 10,
};

export function hierarchyRank(role: string): number {
  return RANK[role] ?? 0;
}

/** Middleware factory — pass at least one allowed role. SUPER_ADMIN always passes. */
export function requireRoleHelper(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (user.role === 'SUPER_ADMIN' || roles.includes(user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: `Access denied. Required: ${roles.join(', ')}` });
  };
}
