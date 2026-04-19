import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../../schemas';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.getMe);

export default router;
