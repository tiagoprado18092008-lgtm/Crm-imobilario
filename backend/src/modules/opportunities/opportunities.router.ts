import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as opportunitiesController from './opportunities.controller';

const router = Router();

router.use(authenticate);

router.get('/', opportunitiesController.list);
router.post('/', opportunitiesController.create);
router.get('/:id', opportunitiesController.getById);
router.put('/:id', opportunitiesController.update);
router.patch('/:id/stage', opportunitiesController.moveStage);
router.delete('/:id', requireRole('ADMIN'), opportunitiesController.remove);

export default router;
