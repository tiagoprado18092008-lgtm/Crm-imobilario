import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './calendar.controller';

const router = Router();

// Auth-protected routes
router.get('/status', authenticate, ctrl.getStatus);
router.post('/sync', authenticate, ctrl.sync);
router.get('/slots', authenticate, ctrl.getSlots);
router.put('/slots', authenticate, ctrl.upsertSlots);
router.delete('/:provider/disconnect', authenticate, ctrl.disconnect);

// Google OAuth — /auth endpoint reads JWT from query param (browser redirect can't send headers)
router.get('/google/auth', (req, res, next) => {
  // Accept token via query param for OAuth redirect flow
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, ctrl.googleAuth);

router.get('/google/callback', ctrl.googleCallback);

// Outlook OAuth
router.get('/outlook/auth', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, ctrl.outlookAuth);

router.get('/outlook/callback', ctrl.outlookCallback);

export default router;
