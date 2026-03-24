import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './forms.controller';

const router = Router();

// Public route (no auth) for form submission
router.get('/public/:id', ctrl.getPublic);
router.post('/public/:id/submit', ctrl.submit);

// Protected routes
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
