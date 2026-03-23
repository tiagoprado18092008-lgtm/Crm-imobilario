import { Request, Response, NextFunction } from 'express';
import * as tasksService from './tasks.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      assignedToId: req.query.assignedToId as string,
      dueDateFrom: req.query.dueDateFrom as string,
      dueDateTo: req.query.dueDateTo as string,
      contactId: req.query.contactId as string,
      opportunityId: req.query.opportunityId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await tasksService.list(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await tasksService.create(req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await tasksService.getById(req.params.id);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await tasksService.update(req.params.id, req.body);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await tasksService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
