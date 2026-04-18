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
  initWhatsApp().catch(() => {})
  res.json({ ok: true })
}

export const disconnect = async (_req: Request, res: Response) => {
  await disconnectWhatsApp()
  res.json({ ok: true })
}
