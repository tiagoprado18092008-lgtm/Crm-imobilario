import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as service from './revenue.service';

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

router.get('/overview', handle((req) => service.overview(req.user)));
router.post('/snapshot', handle((req) => service.snapshotMonth(req.user), 201));

router.get('/clients', handle((req) => service.listClients(req.user)));
router.post('/health/refresh', handle((req) => service.refreshHealth(req.user)));

router.get(
  '/subscriptions',
  handle((req) =>
    service.listSubscriptions({ state: req.query.state, companyId: req.query.companyId }, req.user),
  ),
);
router.post('/subscriptions', handle((req) => service.createSubscription(req.body, req.user), 201));
router.patch(
  '/subscriptions/:id',
  handle((req) => service.updateSubscription(req.params.id, req.body, req.user)),
);
router.post(
  '/subscriptions/from-deal/:dealId',
  handle((req) => service.createFromWonDeal(req.params.dealId, req.user), 201),
);

router.get(
  '/invoices',
  handle((req) =>
    service.listInvoices({ state: req.query.state, companyId: req.query.companyId }, req.user),
  ),
);
router.post('/invoices', handle((req) => service.createInvoice(req.body, req.user), 201));
router.patch(
  '/invoices/:id',
  handle((req) => service.updateInvoice(req.params.id, req.body, req.user)),
);

/** CSV for the accountant. Certified AT invoicing stays out of scope. */
router.get('/invoices/export', async (req: any, res, next) => {
  try {
    const csv = await service.exportInvoicesCsv(req.user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="faturas.csv"');
    // BOM so Excel opens it as UTF-8 and the accents survive.
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
});

export default router;
