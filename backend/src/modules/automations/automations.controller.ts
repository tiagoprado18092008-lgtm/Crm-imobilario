import { Request, Response, NextFunction } from 'express';
import * as service from './automations.service';

const ALLOWED_ROLES = ['ADMIN', 'AGENCY_OWNER', 'AGENCY_DIRECTOR', 'AGENCY_ADMIN', 'TEAM_LEADER'];

const canManage = (req: Request, res: Response): boolean => {
  if (!req.user || !ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Acesso negado. Função sem permissão para gerir automações.' });
    return false;
  }
  return true;
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.list(req.user?.agencyId));
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.getById(req.params.id, req.user?.agencyId));
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canManage(req, res)) return;
    const { name, trigger, isActive, actions } = req.body;
    if (!name || !trigger || !Array.isArray(actions)) {
      res.status(400).json({ error: 'name, trigger e actions são obrigatórios' });
      return;
    }
    res.status(201).json(await service.create({ name, trigger, isActive, actions, agencyId: req.user?.agencyId }));
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canManage(req, res)) return;
    res.json(await service.update(req.params.id, req.body, req.user?.agencyId));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canManage(req, res)) return;
    await service.remove(req.params.id, req.user?.agencyId);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ruleId, contactId, limit } = req.query;
    res.json(await service.getLogs({
      ruleId: ruleId as string,
      contactId: contactId as string,
      limit: limit ? parseInt(limit as string) : undefined,
    }, req.user?.agencyId));
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════
// V2 CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

const requireAgency = (req: Request, res: Response): string | null => {
  const agencyId = (req.user as any)?.agencyId;
  if (!agencyId) {
    res.status(403).json({ error: 'Utilizador não associado a nenhuma agência.' });
    return null;
  }
  return agencyId;
};

export const listV2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    res.json(await service.listV2(agencyId));
  } catch (err) { next(err); }
};

export const getV2ById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    res.json(await service.getV2ById(req.params.id, agencyId));
  } catch (err) { next(err); }
};

export const createV2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    const { name, description, trigger, steps } = req.body;
    if (!name || !trigger?.type) {
      res.status(400).json({ error: 'name e trigger.type são obrigatórios' });
      return;
    }
    res.status(201).json(await service.createV2(agencyId, { name, description, trigger, steps: steps || [] }));
  } catch (err) { next(err); }
};

export const updateV2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    res.json(await service.updateV2(req.params.id, agencyId, req.body));
  } catch (err) { next(err); }
};

export const deleteV2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    await service.deleteV2(req.params.id, agencyId);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const toggleV2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    res.json(await service.toggleV2(req.params.id, agencyId));
  } catch (err) { next(err); }
};

export const listEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    res.json(await service.listEnrollments(req.params.id, agencyId));
  } catch (err) { next(err); }
};

export const triggerEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = requireAgency(req, res);
    if (!agencyId) return;
    const { type, contactId, data } = req.body;
    if (!type || !contactId) {
      res.status(400).json({ error: 'type e contactId são obrigatórios' });
      return;
    }
    res.json(await service.triggerEnrollment({ type, contactId, data }, agencyId));
  } catch (err) { next(err); }
};

export const fireEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event, contactId } = req.body;
    if (!event || !contactId) {
      res.status(400).json({ error: 'event e contactId são obrigatórios' });
      return;
    }
    await service.fireEvent({ event, contactId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
