import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './super-admin.controller';

const router = Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/agencies', ctrl.listAgencies);
router.post('/agencies', ctrl.createAgency);
router.get('/agencies/:id', ctrl.getAgencyDetail);
router.patch('/agencies/:id', ctrl.updateAgency);
router.delete('/agencies/:id', ctrl.deactivateAgency);

export default router;
