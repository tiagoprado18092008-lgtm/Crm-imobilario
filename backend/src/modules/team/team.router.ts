import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './team.controller';

const router = Router();

router.use(authenticate, requireRole('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'));

router.get('/members', ctrl.listMembers);
router.patch('/members/:id', ctrl.updateMember);
router.delete('/members/:id', ctrl.deactivateMember);

export default router;
