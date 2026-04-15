import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as settingsController from './settings.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER', 'CONSULTANT'));

// GET  /api/settings/communications        - get current comms config (masked)
router.get('/communications', settingsController.getCommunicationsConfig);

// POST /api/settings/communications        - update comms config
router.post('/communications', settingsController.updateCommunicationsConfig);

// GET  /api/settings/communications/status - test each channel
router.get('/communications/status', settingsController.getChannelStatus);

// POST /api/settings/twilio-setup - force Twilio auto-setup with existing credentials
router.post('/twilio-setup', settingsController.triggerTwilioAutoSetup);

// POST /api/settings/communications/test/* - test individual channel connections
router.post('/communications/test/whatsapp', settingsController.testWhatsApp);
router.post('/communications/test/email', settingsController.testEmail);
router.post('/communications/test/twilio', settingsController.testTwilio);

export default router;
