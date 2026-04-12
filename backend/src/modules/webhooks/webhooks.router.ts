import { Router } from 'express';
import * as ctrl from './webhooks.controller';

const router = Router();

// No JWT auth — these come from external services
router.post('/google-calendar', ctrl.googleCalendarWebhook);
router.post('/outlook-calendar', ctrl.outlookCalendarWebhook);

export default router;
