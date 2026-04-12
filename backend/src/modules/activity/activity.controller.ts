import { Request, Response } from 'express';
import * as service from './activity.service';

export const list = async (req: Request, res: Response): Promise<void> => {
  const result = await service.list(req.query, req.user);
  res.json(result);
};
