import { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service';

export const getCommunicationsConfig = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const config = settingsService.getCommunicationsConfig();
    res.status(200).json(config);
  } catch (err) {
    next(err);
  }
};

export const updateCommunicationsConfig = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = settingsService.updateCommunicationsConfig(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getChannelStatus = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const status = settingsService.getChannelStatus();
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
};
