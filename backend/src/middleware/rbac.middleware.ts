import { Request, Response, NextFunction } from 'express';

// Role constants — single source of truth
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  AGENCY_OWNER: 'AGENCY_OWNER',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  TEAM_LEADER: 'TEAM_LEADER',
  CONSULTANT: 'CONSULTANT',
  USER: 'USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Roles that can manage agency-wide data
export const AGENCY_MANAGERS = [ROLES.AGENCY_OWNER, ROLES.AGENCY_ADMIN] as const;

// Roles that can see team data (own + direct reports)
export const TEAM_MANAGERS = [ROLES.AGENCY_OWNER, ROLES.AGENCY_ADMIN, ROLES.TEAM_LEADER] as const;

export const LOCATION_MANAGERS = [ROLES.AGENCY_OWNER, ROLES.AGENCY_ADMIN] as const;
export const ALL_AUTHENTICATED = [ROLES.AGENCY_OWNER, ROLES.AGENCY_ADMIN, ROLES.TEAM_LEADER, ROLES.CONSULTANT, ROLES.USER] as const;

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', status: 401 });
      return;
    }

    // SUPER_ADMIN is above the agency hierarchy, so no caller lists it among
    // the roles it allows. Without this it was denied everything gated by
    // requireRole — settings, user management, reports — while appearing to be
    // the most privileged account in the product.
    if (req.user.role === ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        status: 403,
      });
      return;
    }

    next();
  };
};

// Ensures user belongs to a specific agency (or is agency manager of it)
export const requireSameAgency = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', status: 401 });
    return;
  }
  const targetAgencyId = req.params.agencyId || req.body.agencyId;
  if (targetAgencyId && req.user.agencyId !== targetAgencyId) {
    res.status(403).json({ error: 'Access denied. Different agency.', status: 403 });
    return;
  }
  next();
};

export const withPermission = (module: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', status: 401 });
      return;
    }
    const user = req.user;
    // SUPER_ADMIN bypasses all permission checks
    if (user.role === ROLES.SUPER_ADMIN) {
      next();
      return;
    }
    // AGENCY_OWNER and AGENCY_ADMIN always pass
    if (user.role === ROLES.AGENCY_OWNER || user.role === ROLES.AGENCY_ADMIN) {
      next();
      return;
    }
    // USER/CONSULTANT/TEAM_LEADER — check granular permissions
    const perms = user.permissions as Record<string, string[]> | null;
    if (perms && perms[module]?.includes(action)) {
      next();
      return;
    }
    res.status(403).json({ error: `Permissão insuficiente: ${module}.${action}`, status: 403 });
  };
};
