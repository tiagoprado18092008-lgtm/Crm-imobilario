import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import P from 'pino'
import { usePrismaAuthState } from './whatsapp.session'
import { eventBus } from '../../utils/event-bus'
import { receiveInbound } from '../conversations/conversations.service'
import prisma from '../../config/database'

const waLogger = P({ level: 'silent' })

interface SessionState {
  sock: ReturnType<typeof makeWASocket> | null
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  phone: string | null
  qr: string | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  qrWatchdog: ReturnType<typeof setTimeout> | null
  agencyId: string
  userId: string | null
}

const sessions = new Map<string, SessionState>()

function toKey(agencyId: string, userId?: string | null): string {
  return userId ? `${agencyId}:${userId}` : agencyId
}

function getSession(agencyId: string, userId?: string | null): SessionState {
  const key = toKey(agencyId, userId)
  if (!sessions.has(key)) {
    sessions.set(key, { sock: null, status: 'DISCONNECTED', phone: null, qr: null, reconnectTimer: null, qrWatchdog: null, agencyId, userId: userId ?? null })
  }
  return sessions.get(key)!
}

export function getStatus(agencyId: string, userId?: string | null) {
  const s = getSession(agencyId, userId)
  return { status: s.status, phone: s.phone, qr: s.qr }
}

async function clearCredsInDb(agencyId: string, userId: string | null) {
  try {
    await prisma.whatsAppSession.updateMany({
      where: { agencyId, userId: userId ?? null },
      data: { creds: '{}', keys: null, status: 'DISCONNECTED', phone: null },
    })
  } catch {}
}

export async function initWhatsApp(agencyId: string, userId?: string | null): Promise<void> {
  const sessionKey = toKey(agencyId, userId)
  const s = getSession(agencyId, userId)

  // If socket already active, don't restart
  if (s.sock) {
    console.log(`[WA:${sessionKey}] Already initialised`)
    return
  }

  s.status = 'CONNECTING'
  s.qr = null
  console.log(`[WA:${sessionKey}] Starting initWhatsApp...`)

  try {
    const { state, saveCreds } = await usePrismaAuthState(sessionKey)
    console.log(`[WA:${sessionKey}] Auth state loaded, has me.id: ${!!state.creds.me?.id}`)

    // Recent known-good WA Web version (May 2026). Try to fetch fresh in parallel
    // with a short timeout — if the fetch hangs (Railway egress to web.whatsapp.com),
    // we still create the socket promptly with this version.
    // ⚠️ WhatsApp rejects the QR as "invalid" when the client version is too old —
    // bump this manually if QRs start being rejected after a long time without redeploys.
    let version: [number, number, number] = [2, 3000, 1023223821]
    try {
      const v = await Promise.race<{ version: [number, number, number] } | null>([
        fetchLatestWaWebVersion({ timeout: 5000 }).catch(() => null),
        new Promise(r => setTimeout(() => r(null), 5000)),
      ])
      if (v?.version) {
        version = v.version
        console.log(`[WA:${sessionKey}] Using WA web version: ${version.join('.')}`)
      } else {
        const v2 = await Promise.race<{ version: [number, number, number] } | null>([
          fetchLatestBaileysVersion().catch(() => null),
          new Promise(r => setTimeout(() => r(null), 5000)),
        ])
        if (v2?.version) {
          version = v2.version
          console.log(`[WA:${sessionKey}] Using Baileys cached version: ${version.join('.')}`)
        } else {
          console.log(`[WA:${sessionKey}] Using known-good fallback version: ${version.join('.')}`)
        }
      }
    } catch {
      console.log(`[WA:${sessionKey}] Using known-good fallback version: ${version.join('.')}`)
    }

    const sock = makeWASocket({
      version,
      logger: waLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, waLogger),
      },
      printQRInTerminal: false,
      browser: ['CasaFlow CRM', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 60000,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      getMessage: async () => undefined,
    })
    s.sock = sock

    // Watchdog: if no QR nor connection-open within 30s, force a reset so the
    // UI doesn't get stuck on "A gerar QR code..." forever (handshake limbo).
    if (s.qrWatchdog) clearTimeout(s.qrWatchdog)
    s.qrWatchdog = setTimeout(() => {
      if (!s.qr && s.status !== 'CONNECTED') {
        console.warn(`[WA:${sessionKey}] Watchdog: no QR after 30s, forcing reset`)
        try { sock.end?.(undefined) } catch {}
        s.sock = null
        s.status = 'DISCONNECTED'
        // Auto-retry once after watchdog trips
        if (s.reconnectTimer) clearTimeout(s.reconnectTimer)
        s.reconnectTimer = setTimeout(() => initWhatsApp(agencyId, userId), 2000)
      }
    }, 30000)

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          s.qr = await QRCode.toDataURL(qr)
          s.status = 'CONNECTING'
          if (s.qrWatchdog) { clearTimeout(s.qrWatchdog); s.qrWatchdog = null }
          console.log(`[WA:${sessionKey}] QR generated`)
          eventBus.emit(`whatsapp_qr:${sessionKey}`, { qr: s.qr, sessionKey })
        } catch (e) {
          console.error(`[WA:${sessionKey}] QR encode error:`, e)
        }
      }

      if (connection === 'open') {
        s.qr = null
        s.status = 'CONNECTED'
        if (s.qrWatchdog) { clearTimeout(s.qrWatchdog); s.qrWatchdog = null }
        const jid = sock?.user?.id || ''
        s.phone = jid.split(':')[0].replace('@s.whatsapp.net', '') || null
        console.log(`[WA:${sessionKey}] Connected as`, s.phone)
        try {
          await prisma.whatsAppSession.upsert({
            where: { agencyId_userId: { agencyId, userId: userId ?? null } } as any,
            create: { agencyId, userId: userId ?? null, creds: '{}', status: 'CONNECTED', phone: s.phone },
            update: { status: 'CONNECTED', phone: s.phone },
          })
        } catch {}
        eventBus.emit(`whatsapp_connected:${sessionKey}`, { phone: s.phone, sessionKey })
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        const isUnauthorized = statusCode === 401
        const isConflict = statusCode === DisconnectReason.connectionReplaced || statusCode === 440
        console.log(`[WA:${sessionKey}] Closed, statusCode: ${statusCode}, isLoggedOut: ${isLoggedOut}, isUnauthorized: ${isUnauthorized}`)

        s.qr = null
        s.status = 'DISCONNECTED'
        s.sock = null
        if (s.qrWatchdog) { clearTimeout(s.qrWatchdog); s.qrWatchdog = null }

        if (isLoggedOut || isUnauthorized) {
          // Session expired/rejected by WhatsApp — clear creds so next connect generates fresh QR
          console.log(`[WA:${sessionKey}] Clearing creds due to ${isLoggedOut ? 'logout' : '401'}`)
          await clearCredsInDb(agencyId, userId ?? null)
        } else {
          try {
            await prisma.whatsAppSession.updateMany({
              where: { agencyId, userId: userId ?? null },
              data: { status: 'DISCONNECTED' },
            })
          } catch {}
        }

        if (!isLoggedOut && !isUnauthorized && !isConflict) {
          if (s.reconnectTimer) clearTimeout(s.reconnectTimer)
          s.reconnectTimer = setTimeout(() => initWhatsApp(agencyId, userId), 5000)
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (type !== 'notify') continue
        if (msg.key.fromMe) continue
        await handleIncoming(msg, agencyId, userId ?? null)
      }
    })
  } catch (err) {
    console.error(`[WA:${sessionKey}] initWhatsApp error:`, err)
    s.status = 'DISCONNECTED'
    s.sock = null
    await clearCredsInDb(agencyId, userId ?? null)
  }
}

async function handleIncoming(msg: any, agencyId: string, userId: string | null) {
  try {
    const jid = msg.key.remoteJid || ''
    if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@lid')) return

    const phone = jid.replace('@s.whatsapp.net', '')
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      ''
    if (!phone || !text) return

    let assignedToId: string | undefined

    if (userId) {
      // Personal session — always assign to the owner of the session
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } })
      if (!u || u.agencyId !== agencyId) return  // Security: session owner must belong to this agency
      assignedToId = userId
    } else {
      const digits = phone.replace(/\D/g, '')
      const variants = [phone, digits, `+${digits}`]
      const contact = await prisma.contact.findFirst({
        where: {
          AND: [
            { OR: variants.flatMap(v => [{ phone: v }, { whatsapp: v }]) },
            { location: { agencyId } },
          ],
          assignedToId: { not: undefined },
        },
        select: { assignedToId: true },
      })

      if (contact?.assignedToId) {
        assignedToId = contact.assignedToId
      } else {
        const consultants = await prisma.user.findMany({
          where: { agencyId, isActive: true, role: { in: ['CONSULTANT', 'LOCATION_ADMIN', 'AGENCY_ADMIN', 'AGENCY_OWNER'] } },
          select: {
            id: true,
            _count: { select: { assignedConversations: { where: { status: 'OPEN' } } } },
          },
          orderBy: { createdAt: 'asc' },
        })
        const sorted = consultants.sort((a, b) => a._count.assignedConversations - b._count.assignedConversations)
        assignedToId = sorted[0]?.id
      }
    }

    await receiveInbound(
      'WHATSAPP',
      phone,
      text,
      JSON.stringify({ messageId: msg.key.id, profileName: msg.pushName }),
      agencyId,
      assignedToId,
    )
    console.log(`[WA:${toKey(agencyId, userId)}] receiveInbound done for`, phone)
  } catch (e) {
    console.error(`[WA:${toKey(agencyId, userId)}] handleIncoming error:`, e)
  }
}

export async function sendViaBaileys(agencyId: string, to: string, text: string, userId?: string | null): Promise<boolean> {
  const s = getSession(agencyId, userId)
  if (!s.sock || s.status !== 'CONNECTED') return false
  try {
    let digits = to.replace(/\D/g, '')
    if (digits.length === 9) digits = '351' + digits
    const jid = digits + '@s.whatsapp.net'
    await s.sock.sendMessage(jid, { text })
    return true
  } catch (e) {
    console.error(`[WA:${toKey(agencyId, userId)}] sendViaBaileys error:`, e)
    return false
  }
}

export async function disconnectWhatsApp(agencyId: string, userId?: string | null): Promise<void> {
  const sessionKey = toKey(agencyId, userId)
  const s = getSession(agencyId, userId)
  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null }
  if (s.qrWatchdog) { clearTimeout(s.qrWatchdog); s.qrWatchdog = null }
  if (s.sock) {
    // Don't await logout — if WhatsApp doesn't ack, await hangs for ~30s blocking the next connect
    try {
      const sock = s.sock
      Promise.race([
        sock.logout().catch(() => {}),
        new Promise(r => setTimeout(r, 2000)),
      ]).catch(() => {})
      try { sock.end?.(undefined) } catch {}
    } catch {}
    s.sock = null
  }
  s.status = 'DISCONNECTED'
  s.qr = null
  s.phone = null
  await clearCredsInDb(agencyId, userId ?? null)
  console.log(`[WA:${sessionKey}] Disconnected and creds cleared`)
}

export async function restoreAllSessions(): Promise<void> {
  const rows = await prisma.whatsAppSession.findMany({
    where: { status: 'CONNECTED' },
    select: { agencyId: true, userId: true },
  })
  for (const row of rows) {
    const key = toKey(row.agencyId, row.userId)
    console.log(`[WA] Restoring session: ${key}`)
    await initWhatsApp(row.agencyId, row.userId).catch(e => console.error(`[WA] Restore error for ${key}:`, e))
    await new Promise(r => setTimeout(r, 3000))
  }
}
