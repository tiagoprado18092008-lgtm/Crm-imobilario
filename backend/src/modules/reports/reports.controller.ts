import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const assignedToId = req.query.assignedToId as string | undefined;
    const summary = await reportsService.getSummary(req.user, { from, to, assignedToId });
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

export const getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const assignedToId = req.query.assignedToId as string | undefined;
    const pipeline = await reportsService.getPipeline(req.user, { from, to, assignedToId });
    res.status(200).json(pipeline);
  } catch (err) {
    next(err);
  }
};

export const getAgentPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const performance = await reportsService.getAgentPerformance(req.user);
    res.status(200).json(performance);
  } catch (err) {
    next(err);
  }
};

export const getConversationStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await reportsService.getConversationStats(req.user);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
};
