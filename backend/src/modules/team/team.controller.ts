import { Request, Response, NextFunction } from 'express';
import * as svc from './team.service';

export const listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agencyId = req.user.agencyId;
    if (!agencyId) { res.status(400).json({ error: 'Sem agência associada' }); return; }
    res.json(await svc.listMembers(agencyId));
  } catch (err) { next(err); }
};

export const updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agencyId = req.user.agencyId;
    if (!agencyId) { res.status(400).json({ error: 'Sem agência associada' }); return; }
    res.json(await svc.updateMember(req.params.id, agencyId, req.body));
  } catch (err) { next(err); }
};

export const deactivateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agencyId = req.user.agencyId;
    if (!agencyId) { res.status(400).json({ error: 'Sem agência associada' }); return; }
    res.json(await svc.deactivateMember(req.params.id, agencyId));
  } catch (err) { next(err); }
};
