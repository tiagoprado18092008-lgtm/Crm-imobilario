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
router.use(requireRole('ADMIN'));
router.get('/', ctrl.list);
router.post('/', validate(createInvitationSchema), ctrl.create);
router.delete('/:id', ctrl.revoke);

export default router;
