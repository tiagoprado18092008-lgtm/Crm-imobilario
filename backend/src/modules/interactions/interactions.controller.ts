import { Request, Response, NextFunction } from 'express';
import * as interactionsService from './interactions.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      contactId: req.query.contactId as string,
      opportunityId: req.query.opportunityId as string,
      type: req.query.type as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await interactionsService.list(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interaction = await interactionsService.create(req.body, req.user.id);
    res.status(201).json(interaction);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const interaction = await interactionsService.getById(req.params.id);
    res.status(200).json(interaction);
  } catch (err) {
    next(err);
  }
};
