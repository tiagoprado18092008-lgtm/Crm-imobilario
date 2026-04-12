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

export const updateCommunicationsConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await settingsService.updateCommunicationsConfig(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const triggerTwilioAutoSetup = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await settingsService.triggerTwilioAutoSetup();
    res.status(result.ok ? 200 : 400).json(result);
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
