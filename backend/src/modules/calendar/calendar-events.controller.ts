import { Request, Response } from 'express';
import * as eventsService from './calendar-events.service';

export const list = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.list((req as any).user.id, req.query as any);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.getById((req as any).user.id, req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.create((req as any).user.id, req.body);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.update((req as any).user.id, req.params.id, req.body);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await eventsService.remove((req as any).user.id, req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const duplicate = async (req: Request, res: Response) => {
  try {
    const data = await eventsService.duplicate((req as any).user.id, req.params.id);
    res.status(201).json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
