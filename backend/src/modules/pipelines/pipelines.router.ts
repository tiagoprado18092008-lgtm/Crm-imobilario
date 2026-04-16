import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
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
    await svc.remove(req.params.id, req.user);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
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
