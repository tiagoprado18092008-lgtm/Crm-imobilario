import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate);

router.get('/', usersController.list); // All authenticated users can list (needed for dropdowns)
router.post('/', requireRole('ADMIN'), usersController.create);
router.get('/:id', usersController.getById);
router.put('/:id', requireRole('ADMIN'), usersController.update);
router.delete('/:id', requireRole('ADMIN'), usersController.deactivate);
router.patch('/:id', usersController.updateSelf);
router.patch('/:id/password', usersController.changePassword);
router.get('/:id/sub-agents', usersController.getSubAgents);

export default router;
