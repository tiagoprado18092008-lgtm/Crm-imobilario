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
    const agency = await agencyService.update(req.params.id, req.body);
    res.json(agency);
  } catch (err) {
    next(err);
  }
};

export const listMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.params.id;
    // Non-managers can only see their own agency members
    if (!['AGENCY_OWNER', 'AGENCY_ADMIN'].includes(req.user?.role) && req.user?.agencyId !== agencyId) {
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
    const { userId } = req.body;
    const user = await agencyService.assignUserToAgency(userId, req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};
