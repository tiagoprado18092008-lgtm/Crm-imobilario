import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as settingsController from './settings.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

// GET  /api/settings/communications        - get current comms config (masked)
router.get('/communications', settingsController.getCommunicationsConfig);

// POST /api/settings/communications        - update comms config
router.post('/communications', settingsController.updateCommunicationsConfig);

// GET  /api/settings/communications/status - test each channel
router.get('/communications/status', settingsController.getChannelStatus);

export default router;
