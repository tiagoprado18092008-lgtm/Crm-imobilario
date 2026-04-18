import { Request, Response } from 'express'
import { getStatus, initWhatsApp, disconnectWhatsApp } from './whatsapp.service'

function resolveAgencyId(req: Request): string {
  return (req.user as any)?.agencyId || (req.user as any)?.id || 'default'
}

export const status = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req)
  res.json(getStatus(agencyId))
}

export const connect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req)
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
  const agencyId = resolveAgencyId(req)
  await disconnectWhatsApp(agencyId)
  res.json({ ok: true })
}
