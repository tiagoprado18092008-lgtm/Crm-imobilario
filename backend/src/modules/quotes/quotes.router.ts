import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import * as service from './quotes.service';
import * as products from './products.service';

const handle =
  (fn: (req: any) => Promise<any>, status = 200) =>
  async (req: any, res: any, next: any) => {
    try {
      res.status(status).json(await fn(req));
    } catch (err) {
      next(err);
    }
  };

/**
 * The public proposal page.
 *
 * Mounted before authentication because the recipient has no account: the
 * token in the URL is the authorisation. Rate limited so the token space
 * cannot be probed.
 */
export const publicRouter = Router();

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.get(
  '/:token',
  publicLimiter,
  handle((req) => service.getPublic(req.params.token)),
);

publicRouter.post(
  '/:token/accept',
  publicLimiter,
  handle((req) => service.respondPublic(req.params.token, true)),
);

publicRouter.post(
  '/:token/reject',
  publicLimiter,
  handle((req) => service.respondPublic(req.params.token, false)),
);

/** Everything behind a session. */
const router = Router();
router.use(authenticate);

// ── Products ────────────────────────────────────────────────────────────────
router.get('/products', handle((req) => products.list(req.user)));
router.post('/products', handle((req) => products.create(req.body, req.user), 201));
router.patch('/products/:id', handle((req) => products.update(req.params.id, req.body, req.user)));
router.delete(
  '/products/:id',
  handle(async (req) => {
    await products.remove(req.params.id, req.user);
    return { success: true };
  }),
);

// ── Line items on a deal ────────────────────────────────────────────────────
router.get('/deals/:dealId/items', handle((req) => products.listItems(req.params.dealId, req.user)));
router.post(
  '/deals/:dealId/items',
  handle((req) => products.addItem(req.params.dealId, req.body, req.user), 201),
);
router.patch('/items/:id', handle((req) => products.updateItem(req.params.id, req.body, req.user)));
router.delete(
  '/items/:id',
  handle(async (req) => {
    await products.removeItem(req.params.id, req.user);
    return { success: true };
  }),
);

// ── Quotes ──────────────────────────────────────────────────────────────────
router.get(
  '/',
  handle((req) => service.list({ dealId: req.query.dealId, state: req.query.state }, req.user)),
);
router.get('/:id', handle((req) => service.getById(req.params.id, req.user)));
router.post('/', handle((req) => service.create(req.body, req.user), 201));
router.post('/:id/send', handle((req) => service.send(req.params.id, req.user)));
router.post('/:id/revise', handle((req) => service.revise(req.params.id, req.user), 201));

export default router;
