import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as interactionsController from './interactions.controller';

const router = Router();

router.use(authenticate);

router.get('/', interactionsController.list);
router.post('/', interactionsController.create);
router.get('/:id', interactionsController.getById);

export default router;
