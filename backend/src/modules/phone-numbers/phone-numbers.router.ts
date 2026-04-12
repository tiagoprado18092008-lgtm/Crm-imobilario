import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './phone-numbers.controller';

const router = Router();
router.use(authenticate);

router.get('/search', ctrl.search);
router.get('/', ctrl.list);
router.post('/payment-intent', ctrl.createPaymentIntent);
router.post('/', ctrl.purchase);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.release);

export default router;
