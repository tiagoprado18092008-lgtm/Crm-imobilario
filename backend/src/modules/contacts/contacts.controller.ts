import { Request, Response, NextFunction } from 'express';
import * as contactsService from './contacts.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      search: req.query.search as string,
      type: req.query.type as string,
      status: req.query.status as string,
      source: req.query.source as string,
      assignedToId: req.query.assignedToId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await contactsService.list(filters, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await contactsService.create(req.body, req.user);
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await contactsService.getById(req.params.id, req.user);
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await contactsService.update(req.params.id, req.body, req.user);
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
};

export const bulkImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'rows array required' });
      return;
    }
    const result = await contactsService.bulkImport(rows, req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await contactsService.archive(req.params.id);
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contactsService.remove(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
