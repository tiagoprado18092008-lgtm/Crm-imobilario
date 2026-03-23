import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as tasksController from './tasks.controller';

const router = Router();

router.use(authenticate);

router.get('/', tasksController.list);
router.post('/', tasksController.create);
router.get('/:id', tasksController.getById);
router.put('/:id', tasksController.update);
router.delete('/:id', tasksController.remove);

export default router;
