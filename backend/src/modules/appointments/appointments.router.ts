import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './appointments.controller';

const router = Router();
router.use(authenticate);

router.get('/upcoming', ctrl.upcoming);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
