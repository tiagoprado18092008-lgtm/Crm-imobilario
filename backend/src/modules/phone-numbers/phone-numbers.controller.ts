import { Request, Response } from 'express';
import * as service from './phone-numbers.service';

export const search = async (req: Request, res: Response) => {
  try {
    const { country = 'US', areaCode, type } = req.query as any;
    const results = await service.search(country, areaCode, type);
    res.json(results);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const list = async (req: Request, res: Response) => {
  try {
    const numbers = await service.list((req as any).user.id);
    res.json(numbers);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, monthlyPrice } = req.body;
    const result = await service.createPaymentIntent(phoneNumber, monthlyPrice || 1.15);
    res.json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const purchase = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    const num = await service.purchase((req as any).user.id, phoneNumber, friendlyName);
    res.status(201).json(num);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const release = async (req: Request, res: Response) => {
  try {
    await service.release(req.params.id, (req as any).user.id);
    res.json({ success: true });
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const update = async (req: Request, res: Response) => {
  try {
    const num = await service.updateFriendlyName(req.params.id, (req as any).user.id, req.body.friendlyName);
    res.json(num);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};
