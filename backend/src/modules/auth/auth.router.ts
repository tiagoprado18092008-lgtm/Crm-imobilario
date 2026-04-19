import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../../schemas';
import * as authController from './auth.controller';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.getMe);

// Temporary admin reset — requires ADMIN_SECRET env var
router.post('/admin-reset-password', async (req, res) => {
  const { secret, email, newPassword } = req.body;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash, isActive: true } });
  res.json({ ok: true, message: `Password reset for ${email}` });
});

export default router;
