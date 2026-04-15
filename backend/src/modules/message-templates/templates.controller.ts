import { Request, Response, NextFunction } from 'express';
import * as templatesService from './templates.service';

export const listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { channel } = req.query as Record<string, string>;
    const templates = await templatesService.list(req.user, channel);
    res.status(200).json(templates);
  } catch (err) { next(err); }
};

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await templatesService.create(req.body, req.user);
    res.status(201).json(template);
  } catch (err) { next(err); }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await templatesService.update(req.params.id, req.body, req.user);
    res.status(200).json(template);
  } catch (err) { next(err); }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await templatesService.remove(req.params.id, req.user);
    res.status(204).send();
  } catch (err) { next(err); }
};
