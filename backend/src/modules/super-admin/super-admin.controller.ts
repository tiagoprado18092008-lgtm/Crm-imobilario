import { Request, Response, NextFunction } from 'express';
import * as svc from './super-admin.service';

export const listAgencies = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.listAgencies()); } catch (err) { next(err); }
};

export const getAgencyDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.getAgencyDetail(req.params.id)); } catch (err) { next(err); }
};

export const createAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, email, phone, ownerEmail } = req.body;
    if (!name || !ownerEmail) {
      res.status(400).json({ error: 'name e ownerEmail são obrigatórios' });
      return;
    }
    const agency = await svc.createAgencyWithOwner({ name, slug, email, phone }, ownerEmail, req.user.id);
    res.status(201).json(agency);
  } catch (err) { next(err); }
};

export const updateAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.updateAgency(req.params.id, req.body)); } catch (err) { next(err); }
};

export const deactivateAgency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.deactivateAgency(req.params.id)); } catch (err) { next(err); }
};
