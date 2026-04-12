import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './locations.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', requireRole('AGENCY_OWNER'), ctrl.remove);
router.get('/:id/members', ctrl.getMembers);
router.post('/:id/members', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.addMember);
router.get('/:id/settings', ctrl.getSettings);
router.put('/:id/settings', ctrl.updateSettings);

export default router;
