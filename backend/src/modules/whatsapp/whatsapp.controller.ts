import { Request, Response } from 'express'
import { getStatus, initWhatsApp, disconnectWhatsApp } from './whatsapp.service'

export const status = async (_req: Request, res: Response) => {
  res.json(getStatus())
}

export const connect = async (_req: Request, res: Response) => {
  const current = getStatus()
  if (current.status === 'CONNECTED') {
    return res.json({ ok: true, already: true })
  }
  // If already connecting with a QR available, just return ok (polling will pick it up)
  if (current.status === 'CONNECTING' && current.qr) {
    return res.json({ ok: true })
  }
  initWhatsApp().catch((e) => console.error('[WA] connect error:', e))
  res.json({ ok: true })
}

export const disconnect = async (_req: Request, res: Response) => {
  await disconnectWhatsApp()
  res.json({ ok: true })
}
