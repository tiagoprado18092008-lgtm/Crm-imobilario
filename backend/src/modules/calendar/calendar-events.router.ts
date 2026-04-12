import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './calendar-events.controller';

const router = Router();

router.get('/events', authenticate, ctrl.list);
router.post('/events', authenticate, ctrl.create);
router.get('/events/:id', authenticate, ctrl.getById);
router.put('/events/:id', authenticate, ctrl.update);
router.delete('/events/:id', authenticate, ctrl.remove);
router.post('/events/:id/duplicate', authenticate, ctrl.duplicate);

export default router;
