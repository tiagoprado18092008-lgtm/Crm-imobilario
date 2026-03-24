import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './campaigns.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id/stats', ctrl.getStats);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.post('/:id/send', ctrl.send);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
