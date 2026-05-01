import { Request, Response, NextFunction } from 'express';
import * as agencyService from './agency.service';

export const getMyAgency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.agencyId) {
      res.status(404).json({ error: 'No agency associated', status: 404 });
      return;
    }
    const agency = await agencyService.getById(req.user.agencyId);
    res.json(agency);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.agencyId !== req.params.id) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const agency = await agencyService.getById(req.params.id);
    res.json(agency);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agency = await agencyService.create(req.body);
    res.status(201).json(agency);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.agencyId !== req.params.id) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const agency = await agencyService.update(req.params.id, req.body);
    res.json(agency);
  } catch (err) {
    next(err);
  }
};

export const listMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.params.id;
    // Every user can ONLY see members of their own agency
    if (req.user?.agencyId !== agencyId) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const members = await agencyService.listMembers(agencyId);
    res.json(members);
  } catch (err) {
    next(err);
  }
};

export const assignUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow assigning users to own agency
    if (req.user?.agencyId !== req.params.id) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const { userId } = req.body;
    const user = await agencyService.assignUserToAgency(userId, req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only owner/admin of the same agency can regenerate its API key
    if (req.user?.agencyId !== req.params.id) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const agency = await agencyService.regenerateApiKey(req.params.id);
    res.json({ apiKey: agency.apiKey });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.params.id;
    const userId = req.params.userId;
    if (req.user?.agencyId !== agencyId) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const result = await agencyService.removeMember(agencyId, userId, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.agencyId !== req.params.id) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: 'Ficheiro obrigatório' }); return; }
    const url = `/uploads/agency/${req.params.id}/${file.filename}`;
    const agency = await agencyService.update(req.params.id, { logoUrl: url });
    res.json({ logoUrl: agency.logoUrl });
  } catch (err) {
    next(err);
  }
};
