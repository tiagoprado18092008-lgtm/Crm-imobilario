import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createOpportunitySchema, updateOpportunitySchema, moveStageSchema } from '../../schemas';
import * as opportunitiesController from './opportunities.controller';

const router = Router();

router.use(authenticate);

router.get('/', opportunitiesController.list);
router.post('/import', opportunitiesController.bulkImport);
router.post('/', validate(createOpportunitySchema), opportunitiesController.create);
router.get('/:id', opportunitiesController.getById);
router.put('/:id', validate(updateOpportunitySchema), opportunitiesController.update);
router.patch('/:id/stage', validate(moveStageSchema), opportunitiesController.moveStage);
router.delete('/:id', opportunitiesController.remove);

export default router;
