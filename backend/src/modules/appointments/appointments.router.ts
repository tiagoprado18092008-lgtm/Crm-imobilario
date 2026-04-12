import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createAppointmentSchema, updateAppointmentSchema } from '../../schemas';
import * as ctrl from './appointments.controller';

const router = Router();
router.use(authenticate);

router.get('/upcoming', ctrl.upcoming);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(createAppointmentSchema), ctrl.create);
router.patch('/:id', validate(updateAppointmentSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
