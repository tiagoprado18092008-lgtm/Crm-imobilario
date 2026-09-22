import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as service from './goals.service';

const router = Router();
router.use(authenticate);

const handle =
  (fn: (req: any) => Promise<any>, status = 200) =>
  async (req: any, res: any, next: any) => {
    try {
      res.status(status).json(await fn(req));
    } catch (err) {
      next(err);
    }
  };

router.get('/', handle((req) => service.list(req.user)));
router.post('/', handle((req) => service.create(req.body, req.user), 201));
router.patch('/:id', handle((req) => service.update(req.params.id, req.body, req.user)));
router.delete(
  '/:id',
  handle(async (req) => {
    await service.remove(req.params.id, req.user);
    return { success: true };
  }),
);

/** A BDR sees only their own row; scoping is applied in the service. */
router.get(
  '/leaderboard',
  handle((req) => service.leaderboard((req.query.period as any) ?? 'MENSAL', req.user)),
);

export default router;
