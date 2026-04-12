import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './automations.controller';

const router = Router();

router.use(authenticate);

// V1 routes
router.get('/', ctrl.list);
router.get('/logs', ctrl.getLogs);
router.post('/', ctrl.create);

// V2 routes (must be before /:id to avoid conflicts)
router.get('/v2', ctrl.listV2);
router.post('/v2', ctrl.createV2);
router.get('/v2/:id', ctrl.getV2ById);
router.put('/v2/:id', ctrl.updateV2);
router.delete('/v2/:id', ctrl.deleteV2);
router.patch('/v2/:id/toggle', ctrl.toggleV2);
router.get('/v2/:id/enrollments', ctrl.listEnrollments);
router.post('/trigger', ctrl.triggerEnrollment);
router.post('/event', ctrl.fireEvent);

// V1 parameterized routes (after v2 to avoid conflict)
router.get('/:id', ctrl.getById);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
