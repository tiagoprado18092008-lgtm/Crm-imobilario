import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './templates.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listTemplates);
router.post('/', ctrl.createTemplate);
router.put('/:id', ctrl.updateTemplate);
router.delete('/:id', ctrl.deleteTemplate);

export default router;
