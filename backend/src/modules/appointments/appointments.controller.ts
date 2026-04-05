import { Request, Response } from 'express';
import * as service from './appointments.service';

const u = (req: Request) => (req as any).user;

export const list = async (req: Request, res: Response) => {
  try { res.json(await service.list(u(req), req.query)); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const upcoming = async (req: Request, res: Response) => {
  try { res.json(await service.getUpcoming(u(req))); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const getById = async (req: Request, res: Response) => {
  try { res.json(await service.getById(req.params.id, u(req))); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const create = async (req: Request, res: Response) => {
  try { res.status(201).json(await service.create(u(req).id, req.body)); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const update = async (req: Request, res: Response) => {
  try { res.json(await service.update(req.params.id, req.body, u(req))); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const remove = async (req: Request, res: Response) => {
  try { await service.remove(req.params.id, u(req)); res.json({ success: true }); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};
