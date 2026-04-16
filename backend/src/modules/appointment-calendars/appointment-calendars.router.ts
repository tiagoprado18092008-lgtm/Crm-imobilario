import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as svc from './appointment-calendars.service';

const router = Router();

router.get('/', authenticate, async (req: any, res) => {
  try {
    res.json(await svc.list(req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post('/', authenticate, async (req: any, res) => {
  try {
    const { name, color, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    res.status(201).json(await svc.create({ name: name.trim(), color, description }, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id', authenticate, async (req: any, res) => {
  try {
    res.json(await svc.update(req.params.id, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    await svc.remove(req.params.id, req.user);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
