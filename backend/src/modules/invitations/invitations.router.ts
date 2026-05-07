import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createInvitationSchema } from '../../schemas';
import * as ctrl from './invitations.controller';

const router = Router();

// Public — verify token before showing register form
router.get('/verify/:token', ctrl.verify);

// Protected — admin only
router.use(authenticate);
router.get('/', requireRole('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN'), ctrl.list);
router.post('/', requireRole('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN'), validate(createInvitationSchema), ctrl.create);
router.post('/:id/resend', requireRole('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.resend);
router.delete('/:id', requireRole('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.revoke);

export default router;
