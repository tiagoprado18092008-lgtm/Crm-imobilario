import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import * as service from './leads.service';
import * as importer from './leads.import';

// Kept in memory: an import is parsed once and never needs to survive the
// request, so writing it to disk would only add cleanup to get wrong.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
      {
        state: req.query.state,
        ownerId: req.query.ownerId,
        search: req.query.search,
        sector: req.query.sector,
        dueOnly: req.query.dueOnly === 'true',
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        cursor: req.query.cursor,
      },
      req.user,
    ),
  ),
);

router.get('/:id', handle((req) => service.getById(req.params.id, req.user)));
router.post('/', handle((req) => service.create(req.body, req.user), 201));
router.patch('/:id', handle((req) => service.update(req.params.id, req.body, req.user)));

/** Wrap-up after a call. The disposition drives the lead's next state. */
router.post(
  '/:id/disposition',
  handle((req) => service.recordDisposition(req.params.id, req.body, req.user)),
);

/** Lead → Company + Contact + Opportunity, in one transaction. */
router.post(
  '/:id/convert',
  handle((req) => service.convert(req.params.id, req.body, req.user), 201),
);

router.post(
  '/bulk/assign',
  handle((req) => service.bulkAssign(req.body.ids ?? [], req.body.ownerId, req.user)),
);

router.delete(
  '/:id',
  handle(async (req) => {
    await service.remove(req.params.id, req.user);
    return { success: true };
  }),
);

/** Validates a file and reports what would happen. Writes nothing. */
router.post('/import/preview', upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Ficheiro em falta' });
      return;
    }
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : undefined;
    res.json(await importer.preview(req.file.buffer, mapping, req.user));
  } catch (err) {
    next(err);
  }
});

/** Writes the rows the preview accepted. */
router.post('/import', upload.single('file'), async (req: any, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Ficheiro em falta' });
      return;
    }
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : undefined;
    res.json(
      await importer.commit(
        req.file.buffer,
        { mapping, source: req.body.source, ownerId: req.body.ownerId },
        req.user,
      ),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
