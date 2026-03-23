import { Request, Response, NextFunction } from 'express';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', status: 401 });
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
