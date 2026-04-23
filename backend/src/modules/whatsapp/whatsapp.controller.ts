import { Request, Response } from 'express'
import { getStatus, initWhatsApp, disconnectWhatsApp } from './whatsapp.service'

function resolveAgencyId(req: Request, res: Response): string | null {
  const agencyId = (req.user as any)?.agencyId
  if (!agencyId || typeof agencyId !== 'string') {
    res.status(400).json({ error: 'User is not associated with an agency', status: 400 })
    return null
  }
  return agencyId
}

export const status = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  res.json(getStatus(agencyId))
}

export const connect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const current = getStatus(agencyId)
  if (current.status === 'CONNECTED') {
    return res.json({ ok: true, already: true })
  }
  if (current.status === 'CONNECTING' && current.qr) {
    return res.json({ ok: true })
  }
  initWhatsApp(agencyId).catch((e) => console.error('[WA] connect error:', e))
  res.json({ ok: true })
}

export const disconnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  await disconnectWhatsApp(agencyId)
  res.json({ ok: true })
}
