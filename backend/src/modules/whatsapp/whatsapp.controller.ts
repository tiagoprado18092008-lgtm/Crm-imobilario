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

function resolveUserId(req: Request): string | null {
  return (req.user as any)?.id || null
}

function isAdminOrOwner(req: Request): boolean {
  const role = (req.user as any)?.role
  return role === 'AGENCY_OWNER' || role === 'AGENCY_ADMIN'
}

// ─── Sessão pessoal (qualquer utilizador autenticado) ─────────────────────────

export const meStatus = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  res.json(getStatus(agencyId, userId))
}

export const meConnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  const current = getStatus(agencyId, userId)
  if (current.status === 'CONNECTED') return res.json({ ok: true, already: true })
  if (current.status === 'CONNECTING' && current.qr) return res.json({ ok: true })
  initWhatsApp(agencyId, userId).catch((e) => console.error('[WA] meConnect error:', e))
  res.json({ ok: true })
}

export const meDisconnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  await disconnectWhatsApp(agencyId, userId)
  res.json({ ok: true })
}

// ─── Sessão da agência (apenas AGENCY_OWNER / AGENCY_ADMIN) ──────────────────

export const agencyStatus = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  res.json(getStatus(agencyId, null))
}

export const agencyConnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  if (!isAdminOrOwner(req)) {
    return res.status(403).json({ error: 'Apenas administradores podem configurar o WhatsApp da agência' })
  }
  const current = getStatus(agencyId, null)
  if (current.status === 'CONNECTED') return res.json({ ok: true, already: true })
  if (current.status === 'CONNECTING' && current.qr) return res.json({ ok: true })
  initWhatsApp(agencyId, null).catch((e) => console.error('[WA] agencyConnect error:', e))
  res.json({ ok: true })
}

export const agencyDisconnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  if (!isAdminOrOwner(req)) {
    return res.status(403).json({ error: 'Apenas administradores podem desligar o WhatsApp da agência' })
  }
  await disconnectWhatsApp(agencyId, null)
  res.json({ ok: true })
}

// ─── Aliases legacy (mantêm compatibilidade com frontend existente) ───────────

export const status = agencyStatus
export const connect = agencyConnect
export const disconnect = agencyDisconnect
