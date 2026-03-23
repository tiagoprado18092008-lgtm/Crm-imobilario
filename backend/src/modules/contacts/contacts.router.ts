import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as contactsController from './contacts.controller';

const router = Router();

router.use(authenticate);

router.get('/', contactsController.list);
router.post('/', contactsController.create);
router.get('/:id', contactsController.getById);
router.put('/:id', contactsController.update);
router.patch('/:id/archive', contactsController.archive);

export default router;
