import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema } from '../../schemas';
import * as authController from './auth.controller';
import * as authService from './auth.service';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.getMe);
router.post('/clerk-exchange', authController.clerkExchange);

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email obrigatório' }); return; }
    await authService.forgotPassword(email);
    res.json({ message: 'Se o email existir, receberás instruções em breve.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { res.status(400).json({ error: 'Token e password obrigatórios' }); return; }
    await authService.resetPassword(token, password);
    res.json({ message: 'Password alterada com sucesso.' });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'refreshToken obrigatório' }); return; }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.revokeAllRefreshTokens((req as any).user.id);
    res.json({ message: 'Todas as sessões terminadas.' });
  } catch (err) { next(err); }
});

export default router;
