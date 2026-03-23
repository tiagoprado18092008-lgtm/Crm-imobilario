import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as conversationsController from './conversations.controller';

const router = Router();

router.use(authenticate);

// GET  /api/conversations          - list with filters
router.get('/', conversationsController.listConversations);

// POST /api/conversations          - create or find conversation
router.post('/', conversationsController.createConversation);

// GET  /api/conversations/stats    - stats overview (must be before /:id)
router.get('/stats', conversationsController.getStats);

// GET  /api/conversations/:id      - get with messages
router.get('/:id', conversationsController.getConversation);

// POST /api/conversations/:id/messages - send a message
router.post('/:id/messages', conversationsController.sendMessage);

// PATCH /api/conversations/:id/status  - update status
router.patch('/:id/status', conversationsController.updateStatus);

// PATCH /api/conversations/:id/assign  - assign to user
router.patch('/:id/assign', conversationsController.assignConversation);

export default router;
