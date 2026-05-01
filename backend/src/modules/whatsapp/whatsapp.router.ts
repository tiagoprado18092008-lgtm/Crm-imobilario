import { Router, Request, Response } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './whatsapp.controller'
import { getStatus } from './whatsapp.service'
import { eventBus } from '../../utils/event-bus'

const router = Router()
router.use(authenticate)

// ─── Sessão pessoal ───────────────────────────────────────────────────────────
router.get('/me/status', ctrl.meStatus)
router.post('/me/connect', ctrl.meConnect)
router.post('/me/disconnect', ctrl.meDisconnect)

// ─── Sessão da agência ────────────────────────────────────────────────────────
router.get('/agency/status', ctrl.agencyStatus)
router.post('/agency/connect', ctrl.agencyConnect)
router.post('/agency/disconnect', ctrl.agencyDisconnect)

// ─── SSE stream de QR — entrega QR em tempo real sem polling ─────────────────
// GET /api/whatsapp/qr-stream?scope=agency  → agência (default)
// GET /api/whatsapp/qr-stream?scope=me      → sessão pessoal
router.get('/qr-stream', (req: Request, res: Response) => {
  const agencyId = (req.user as any)?.agencyId as string
  const userId = (req.user as any)?.id as string
  const scope = req.query.scope === 'me' ? 'me' : 'agency'
  const sessionKey = scope === 'me' ? `${agencyId}:${userId}` : agencyId

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: object) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch {}
  }

  // Immediately send current QR if already available
  const current = scope === 'me'
    ? getStatus(agencyId, userId)
    : getStatus(agencyId, null)

  if (current.qr) {
    send({ type: 'qr', qr: current.qr })
  } else if (current.status === 'CONNECTED') {
    send({ type: 'connected', phone: current.phone })
  }

  const onQR = (payload: any) => send({ type: 'qr', qr: payload.qr })
  const onConnected = (payload: any) => send({ type: 'connected', phone: payload.phone })

  eventBus.on(`whatsapp_qr:${sessionKey}`, onQR)
  eventBus.on(`whatsapp_connected:${sessionKey}`, onConnected)

  const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 25000)

  req.on('close', () => {
    clearInterval(ping)
    eventBus.off(`whatsapp_qr:${sessionKey}`, onQR)
    eventBus.off(`whatsapp_connected:${sessionKey}`, onConnected)
  })
})

// ─── Aliases legacy ───────────────────────────────────────────────────────────
router.get('/status', ctrl.status)
router.post('/connect', ctrl.connect)
router.post('/disconnect', ctrl.disconnect)

export default router
