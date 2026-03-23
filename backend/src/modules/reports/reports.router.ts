import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as reportsController from './reports.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', reportsController.getSummary);
router.get('/pipeline', reportsController.getPipeline);
router.get('/agent-performance', requireRole('ADMIN'), reportsController.getAgentPerformance);
router.get('/conversations', reportsController.getConversationStats);

export default router;
