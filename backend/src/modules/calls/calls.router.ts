import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as callsController from './calls.controller'

const router = Router()

router.use(authenticate)

router.get('/token', callsController.getToken)
router.post('/', callsController.initiate)
router.get('/', callsController.list)
router.patch('/:id', callsController.updateNotes)

export default router
