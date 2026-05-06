import { Request, Response } from 'express'
import { getStatus, initWhatsApp, disconnectWhatsApp } from './whatsapp.service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveAgencyId(req: Request, res: Response): string | null {
  const agencyId = (req.user as any)?.agencyId
  if (!agencyId || typeof agencyId !== 'string') {
    res.status(400).json({ error: 'User is not associated with an agency', status: 400 })
    return null
  }
  return agencyId
}

function resolveUserId(req: Request): string {
  return (req.user as any)?.id
}

function isAdminOrOwner(req: Request): boolean {
  const role = (req.user as any)?.role
  return role === 'AGENCY_OWNER' || role === 'AGENCY_ADMIN'
}

// ─── Sessão pessoal (qualquer utilizador autenticado) ─────────────────────────
// Each user's session is isolated: key = agencyId:userId
// A user can only access their own personal session (enforced by using req.user.id)

export const meStatus = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.json(getStatus(agencyId, userId))
}

export const meConnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  const current = getStatus(agencyId, userId)
  if (current.status === 'CONNECTED') return res.json({ ok: true, already: true })
  if (current.status === 'CONNECTING') return res.json({ ok: true })
  // initWhatsApp is now idempotent (per-session lock); just kick it off in the
  // background and let the UI poll. Don't disconnect first — that would clear
  // any in-flight pairing if the user double-clicks.
  ;(async () => {
    try {
      await initWhatsApp(agencyId, userId)
    } catch (e) {
      console.error('[WA] meConnect bg error:', e)
    }
  })()
  res.json({ ok: true })
}

export const meDisconnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  const userId = resolveUserId(req)
  await disconnectWhatsApp(agencyId, userId, { force: true })
  res.json({ ok: true })
}

// ─── Sessão da agência (apenas AGENCY_OWNER / AGENCY_ADMIN) ──────────────────
// Agency session key = agencyId (no userId), shared across all agency users
// Only admins/owners can connect/disconnect the agency session

export const agencyStatus = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
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
  if (current.status === 'CONNECTING') return res.json({ ok: true })
  ;(async () => {
    try {
      await initWhatsApp(agencyId, null)
    } catch (e) {
      console.error('[WA] agencyConnect bg error:', e)
    }
  })()
  res.json({ ok: true })
}

export const agencyDisconnect = async (req: Request, res: Response) => {
  const agencyId = resolveAgencyId(req, res)
  if (!agencyId) return
  if (!isAdminOrOwner(req)) {
    return res.status(403).json({ error: 'Apenas administradores podem desligar o WhatsApp da agência' })
  }
  await disconnectWhatsApp(agencyId, null, { force: true })
  res.json({ ok: true })
}

// ─── Aliases legacy ───────────────────────────────────────────────────────────

export const status = agencyStatus
export const connect = agencyConnect
export const disconnect = agencyDisconnect
