import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { addClient, removeClient } from './notifications.service';

const router = Router();

router.get('/stream', authenticate, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = req.user.id;
  addClient(userId, res);

  // Send initial ping to confirm connection
  res.write(`event: connected\ndata: {"userId":"${userId}"}\n\n`);

  // Keep-alive ping every 30s
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
  }, 30000);

  req.on('close', () => {
    clearInterval(ping);
    removeClient(res);
  });
});

export default router;
