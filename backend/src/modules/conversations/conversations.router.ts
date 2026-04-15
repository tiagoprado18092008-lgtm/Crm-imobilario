import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sendMessageSchema } from '../../schemas';
import * as conversationsController from './conversations.controller';

const router = Router();

router.use(authenticate);

// GET  /api/conversations          - list with filters
router.get('/', conversationsController.listConversations);

// POST /api/conversations          - create or find conversation
router.post('/', conversationsController.createConversation);

// GET  /api/conversations/stats    - stats overview (must be before /:id)
router.get('/stats', conversationsController.getStats);

// GET  /api/conversations/unread-count - total não lidas (must be before /:id)
router.get('/unread-count', conversationsController.getUnreadCount);

// GET  /api/conversations/:id      - get with messages
router.get('/:id', conversationsController.getConversation);

// POST /api/conversations/:id/messages - send a message
router.post('/:id/messages', validate(sendMessageSchema), conversationsController.sendMessage);

// PATCH /api/conversations/:id/status  - update status
router.patch('/:id/status', conversationsController.updateStatus);

// PATCH /api/conversations/:id/assign  - assign to user
router.patch('/:id/assign', conversationsController.assignConversation);

// PATCH /api/conversations/:id/read  - marcar como lida
router.patch('/:id/read', conversationsController.markAsRead);

// PATCH /api/conversations/:id/star  - toggle estrela
router.patch('/:id/star', conversationsController.toggleStar);

export default router;
