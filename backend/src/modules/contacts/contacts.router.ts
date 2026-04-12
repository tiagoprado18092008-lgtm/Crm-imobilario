import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createContactSchema, updateContactSchema } from '../../schemas';
import * as contactsController from './contacts.controller';

const router = Router();

router.use(authenticate);

router.get('/', contactsController.list);
router.post('/', validate(createContactSchema), contactsController.create);
router.get('/:id', contactsController.getById);
router.put('/:id', validate(updateContactSchema), contactsController.update);
router.delete('/:id', contactsController.remove);
router.post('/import', contactsController.bulkImport);
router.patch('/:id/archive', contactsController.archive);

export default router;
