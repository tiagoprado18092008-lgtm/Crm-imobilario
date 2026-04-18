import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './whatsapp.controller'

const router = Router()
router.use(authenticate)
router.get('/status', ctrl.status)
router.post('/connect', ctrl.connect)
router.post('/disconnect', ctrl.disconnect)

export default router
