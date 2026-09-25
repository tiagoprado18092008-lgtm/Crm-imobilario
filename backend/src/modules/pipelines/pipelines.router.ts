import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
const requireAuth = authenticate;
import * as svc from './pipelines.service';

const router = Router();

router.get('/', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.list(req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    res.status(201).json(await svc.create(name.trim(), req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.update(req.params.id, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const moveTo = typeof req.query.moveTo === 'string' ? req.query.moveTo : undefined;
    const deleteOpportunities = req.query.deleteOpportunities === 'true';
    res.json({ ok: true, ...(await svc.remove(req.params.id, req.user, { moveTo, deleteOpportunities })) });
  } catch (e: any) {
    // The count lets the client ask what to do with the deals instead of
    // showing a dead end.
    res.status(e.status || 500).json({ error: e.message, ...(e.count != null && { count: e.count }) });
  }
});

router.post('/:id/stages', requireAuth, async (req: any, res) => {
  try {
    res.status(201).json(await svc.createStage(req.params.id, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id/stages/:stageId', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.updateStage(req.params.id, req.params.stageId, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id/stages/:stageId', requireAuth, async (req: any, res) => {
  try {
    await svc.removeStage(req.params.id, req.params.stageId, req.user);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
