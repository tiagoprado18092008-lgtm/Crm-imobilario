import { Request, Response, NextFunction } from 'express';
import * as service from './appointments.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.list(req.user, req.query)); }
  catch (e) { next(e); }
};

export const upcoming = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getUpcoming(req.user)); }
  catch (e) { next(e); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getById(req.params.id, req.user)); }
  catch (e) { next(e); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.status(201).json(await service.create(req.user.id, req.body)); }
  catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.update(req.params.id, req.body, req.user)); }
  catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { await service.remove(req.params.id, req.user); res.status(204).send(); }
  catch (e) { next(e); }
};
