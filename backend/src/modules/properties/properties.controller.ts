import { Request, Response, NextFunction } from 'express';
import * as propertiesService from './properties.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    const result = await propertiesService.list(filters, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.create(req.body, req.user);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.getById(req.params.id, req.user);
    res.status(200).json(property);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const property = await propertiesService.update(req.params.id, req.body, req.user);
    res.status(200).json(property);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.remove(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
