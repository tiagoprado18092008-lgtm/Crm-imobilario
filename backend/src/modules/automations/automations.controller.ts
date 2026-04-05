import { Request, Response, NextFunction } from 'express';
import * as service from './automations.service';

const requireAdmin = (req: Request, res: Response): boolean => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only admins can manage automation rules' });
    return false;
  }
  return true;
};

export const list = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.list());
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.getById(req.params.id));
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { name, trigger, isActive, actions } = req.body;
    if (!name || !trigger || !Array.isArray(actions)) {
      res.status(400).json({ error: 'name, trigger and actions are required' });
      return;
    }
    res.status(201).json(await service.create({ name, trigger, isActive, actions }));
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!requireAdmin(req, res)) return;
    res.json(await service.update(req.params.id, req.body));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!requireAdmin(req, res)) return;
    await service.remove(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ruleId, contactId, limit } = req.query;
    res.json(await service.getLogs({
      ruleId: ruleId as string,
      contactId: contactId as string,
      limit: limit ? parseInt(limit as string) : undefined,
    }));
  } catch (err) { next(err); }
};
