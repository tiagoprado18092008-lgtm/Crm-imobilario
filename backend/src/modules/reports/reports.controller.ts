import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await reportsService.getSummary(req.user);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

export const getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pipeline = await reportsService.getPipeline(req.user);
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
