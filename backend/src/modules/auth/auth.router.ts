import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema } from '../../schemas';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.getMe);
router.post('/clerk-exchange', authController.clerkExchange);

export default router;
