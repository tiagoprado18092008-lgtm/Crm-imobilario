import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as propertiesController from './properties.controller';

const router = Router();

router.use(authenticate);

router.get('/', propertiesController.list);
router.post('/', propertiesController.create);
router.get('/:id', propertiesController.getById);
router.put('/:id', propertiesController.update);
router.delete('/:id', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), propertiesController.remove);

export default router;
