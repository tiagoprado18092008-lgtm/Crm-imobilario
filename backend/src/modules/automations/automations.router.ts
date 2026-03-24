import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './automations.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/logs', ctrl.getLogs);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
