import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './whatsapp.controller'

const router = Router()
router.use(authenticate)

// Sessão pessoal
router.get('/me/status', ctrl.meStatus)
router.post('/me/connect', ctrl.meConnect)
router.post('/me/disconnect', ctrl.meDisconnect)

// Sessão da agência
router.get('/agency/status', ctrl.agencyStatus)
router.post('/agency/connect', ctrl.agencyConnect)
router.post('/agency/disconnect', ctrl.agencyDisconnect)

// Aliases legacy
router.get('/status', ctrl.status)
router.post('/connect', ctrl.connect)
router.post('/disconnect', ctrl.disconnect)

export default router
