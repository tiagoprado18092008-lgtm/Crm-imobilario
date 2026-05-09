import { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service';

export const getCommunicationsConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agencyId = req.user?.agencyId;
    const config = await settingsService.getCommunicationsConfig(agencyId);
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
    const agencyId = req.user?.agencyId;
    const result = await settingsService.updateCommunicationsConfig(req.body, agencyId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const triggerTwilioAutoSetup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agencyId = req.user?.agencyId;
    const result = await settingsService.triggerTwilioAutoSetup(agencyId);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
};

export const getChannelStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agencyId = req.user?.agencyId;
    const status = await settingsService.getChannelStatus(agencyId);
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
};

export const testWhatsApp = async (req: Request, res: Response): Promise<void> => {
  try { res.json(await settingsService.testWhatsAppConnection()); } catch (e: any) { res.json({ success: false, message: e.message }); }
};

export const testEmail = async (req: Request, res: Response): Promise<void> => {
  try { res.json(await settingsService.testEmailConnection()); } catch (e: any) { res.json({ success: false, message: e.message }); }
};

export const testTwilio = async (req: Request, res: Response): Promise<void> => {
  try { res.json(await settingsService.testTwilioConnection()); } catch (e: any) { res.json({ success: false, message: e.message }); }
};
