import { Request, Response, NextFunction } from 'express';
import * as invitationsService from './invitations.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, role, locationId, permissions } = req.body;
    if (!email) { res.status(400).json({ error: 'Email obrigatório' }); return; }
    const inv = await invitationsService.create(email, role || 'CONSULTANT', req.user.id, locationId, permissions, req.user.agencyId);
    res.status(201).json(inv);
  } catch (err) { next(err); }
};

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await invitationsService.list(req.user));
  } catch (err) { next(err); }
};

export const verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await invitationsService.verify(req.params.token));
  } catch (err) { next(err); }
};

export const revoke = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await invitationsService.revoke(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};
