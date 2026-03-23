import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await usersService.list();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.getById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.update(req.params.id, req.body);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.deactivate(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateSelf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id !== req.user.id) {
      res.status(403).json({ error: 'Sem permissão', status: 403 });
      return;
    }
    const { name, phone } = req.body;
    const user = await usersService.update(req.params.id, { name, phone });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id !== req.user.id) {
      res.status(403).json({ error: 'Sem permissão', status: 403 });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Campos obrigatórios em falta', status: 400 });
      return;
    }
    await usersService.changePassword(req.params.id, currentPassword, newPassword);
    res.status(200).json({ message: 'Password alterada' });
  } catch (err) {
    next(err);
  }
};

export const getSubAgents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agents = await usersService.getSubAgents(req.params.id);
    res.status(200).json(agents);
  } catch (err) {
    next(err);
  }
};
