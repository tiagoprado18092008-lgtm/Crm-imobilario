import { Request, Response, NextFunction } from 'express';
import * as opportunitiesService from './opportunities.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = {
      stage: req.query.stage as string,
      stageId: req.query.stageId as string,
      pipelineId: req.query.pipelineId as string,
      assignedToId: req.query.assignedToId as string,
      contactId: req.query.contactId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };
    const result = await opportunitiesService.list(filters, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const opportunity = await opportunitiesService.create(req.body, req.user);
    res.status(201).json(opportunity);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const opportunity = await opportunitiesService.getById(req.params.id, req.user);
    res.status(200).json(opportunity);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const opportunity = await opportunitiesService.update(req.params.id, req.body, req.user);
    res.status(200).json(opportunity);
  } catch (err) {
    next(err);
  }
};

export const moveStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stage, position, stageId } = req.body;
    if (!stage) {
      res.status(400).json({ error: 'stage is required', status: 400 });
      return;
    }
    const opportunity = await opportunitiesService.moveStage(
      req.params.id,
      stage,
      position ?? 0,
      req.user,
      stageId
    );
    res.status(200).json(opportunity);
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
    const result = await opportunitiesService.bulkImport(rows, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await opportunitiesService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
