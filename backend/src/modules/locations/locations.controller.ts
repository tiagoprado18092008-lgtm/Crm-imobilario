import { Request, Response } from 'express';
import * as service from './locations.service';

export const list = async (req: Request, res: Response): Promise<void> => {
  const locations = await service.list(req.user);
  res.json(locations);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const location = await service.getById(req.params.id, req.user);
  res.json(location);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const location = await service.create(req.body, req.user);
  res.status(201).json(location);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const location = await service.update(req.params.id, req.body, req.user);
  res.json(location);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await service.remove(req.params.id, req.user);
  res.status(204).send();
};

export const getMembers = async (req: Request, res: Response): Promise<void> => {
  const members = await service.getMembers(req.params.id, req.user);
  res.json(members);
};

export const addMember = async (req: Request, res: Response): Promise<void> => {
  const member = await service.addMember(req.params.id, req.body.userId, req.user);
  res.json(member);
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  const settings = await service.getSettings(req.params.id, req.user);
  res.json(settings);
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  const settings = await service.updateSettings(req.params.id, req.body, req.user);
  res.json(settings);
};
