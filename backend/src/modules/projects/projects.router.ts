import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as service from './projects.service';

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

router.get(
  '/',
  handle((req) =>
    service.list(
      { state: req.query.state, companyId: req.query.companyId, ownerId: req.query.ownerId },
      req.user,
    ),
  ),
);

router.get('/:id', handle((req) => service.getById(req.params.id, req.user)));
router.post('/', handle((req) => service.create(req.body, req.user), 201));
router.patch('/:id', handle((req) => service.update(req.params.id, req.body, req.user)));

/** Opens the projects a won deal owes. Idempotent. */
router.post(
  '/from-deal/:dealId',
  handle((req) => service.createFromWonDeal(req.params.dealId, req.user), 201),
);

router.post('/:id/tasks', handle((req) => service.addTask(req.params.id, req.body, req.user), 201));
router.post('/tasks/:taskId/toggle', handle((req) => service.toggleTask(req.params.taskId, req.user)));

router.post(
  '/:id/deliverables',
  handle((req) => service.addDeliverable(req.params.id, req.body, req.user), 201),
);
router.patch(
  '/deliverables/:id',
  handle((req) => service.updateDeliverable(req.params.id, req.body, req.user)),
);

export default router;
