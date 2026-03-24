import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e password são obrigatórios', status: 400 });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres', status: 400 });
      return;
    }
    const result = await authService.register(name, email, password, phone);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email e password são obrigatórios', status: 400 });
      return;
    }
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'Token Google em falta', status: 400 });
      return;
    }
    const result = await authService.googleAuth(idToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
