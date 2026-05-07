import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { clerkExchange as clerkExchangeService } from './clerk-exchange.service';

// Legacy endpoints — disabled. Auth is now handled exclusively through Clerk.
export const register = (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Registration via password is no longer supported. Use the invite system.', status: 410 });
};

export const login = (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Password login is no longer supported. Use Clerk authentication.', status: 410 });
};

export const googleAuth = (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Google login via this endpoint is no longer supported. Use Clerk authentication.', status: 410 });
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const clerkExchange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(400).json({ error: 'Token Clerk em falta', status: 400 });
      return;
    }
    const clerkToken = authHeader.slice(7);
    const result = await clerkExchangeService(clerkToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
