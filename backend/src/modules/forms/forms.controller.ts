import { Request, Response } from 'express';
import * as service from './forms.service';

const u = (req: Request) => (req as any).user;

export const list = async (req: Request, res: Response) => {
  try { res.json(await service.list(u(req))); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const getById = async (req: Request, res: Response) => {
  try { res.json(await service.getById(req.params.id, u(req))); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const getPublic = async (req: Request, res: Response) => {
  try { res.json(await service.getPublic(req.params.id)); }
  catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const create = async (req: Request, res: Response) => {
  try { res.status(201).json(await service.create(req.body, u(req).id)); }
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

export const submit = async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress;
    res.status(201).json(await service.submit(req.params.id, req.body, ip));
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};
