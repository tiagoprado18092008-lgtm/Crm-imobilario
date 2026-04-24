import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import { usePrismaAuthState } from './whatsapp.session'
import { eventBus } from '../../utils/event-bus'
import { receiveInbound } from '../conversations/conversations.service'
import prisma from '../../config/database'

interface SessionState {
  sock: ReturnType<typeof makeWASocket> | null
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  phone: string | null
  qr: string | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

const sessions = new Map<string, SessionState>()

function toKey(agencyId: string, userId?: string | null): string {
  return userId ? `${agencyId}:${userId}` : agencyId
}

function getSession(sessionKey: string): SessionState {
  if (!sessions.has(sessionKey)) {
    sessions.set(sessionKey, { sock: null, status: 'DISCONNECTED', phone: null, qr: null, reconnectTimer: null })
  }
  return sessions.get(sessionKey)!
}

export function getStatus(agencyId: string, userId?: string | null) {
  const s = getSession(toKey(agencyId, userId))
  return { status: s.status, phone: s.phone, qr: s.qr }
}

export async function initWhatsApp(agencyId: string, userId?: string | null): Promise<void> {
  const sessionKey = toKey(agencyId, userId)
  const s = getSession(sessionKey)
  if (s.sock) {
    console.log(`[WA:${sessionKey}] Already initialised`)
    return
  }

  s.status = 'CONNECTING'
  s.qr = null
  console.log(`[WA:${sessionKey}] Starting initWhatsApp...`)

  await prisma.whatsAppSession.upsert({
    where: { agencyId_userId: { agencyId, userId: userId ?? null } } as any,
    create: { agencyId, userId: userId ?? null, creds: '{}', status: 'CONNECTING' },
    update: { status: 'CONNECTING' },
  })

  try {
    const { state, saveCreds } = await usePrismaAuthState(sessionKey)
    console.log(`[WA:${sessionKey}] Auth state loaded`)

    let version: [number, number, number] = [2, 3000, 1035194821]
    try {
      const v = await fetchLatestBaileysVersion()
      version = v.version
    } catch {
      console.log(`[WA:${sessionKey}] Using fallback version`)
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['CasaFlow CRM', 'Chrome', '1.0.0'],
      connectTimeoutMs: 30000,
    })
    s.sock = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          s.qr = await QRCode.toDataURL(qr)
          eventBus.emit(`whatsapp_qr:${sessionKey}`, { qr: s.qr })
        } catch (e) {
          console.error(`[WA:${sessionKey}] QR encode error:`, e)
        }
      }

      if (connection === 'open') {
        s.qr = null
        s.status = 'CONNECTED'
        const jid = sock?.user?.id || ''
        s.phone = jid.split(':')[0].replace('@s.whatsapp.net', '') || null
        await prisma.whatsAppSession.upsert({
          where: { agencyId_userId: { agencyId, userId: userId ?? null } } as any,
          create: { agencyId, userId: userId ?? null, creds: '{}', status: 'CONNECTED', phone: s.phone },
          update: { status: 'CONNECTED', phone: s.phone },
        })
        eventBus.emit(`whatsapp_connected:${sessionKey}`, { phone: s.phone })
        console.log(`[WA:${sessionKey}] Connected as`, s.phone)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        const isConflict = statusCode === DisconnectReason.connectionReplaced || statusCode === 440
        console.log(`[WA:${sessionKey}] Closed, statusCode:`, statusCode)
        s.qr = null
        s.status = 'DISCONNECTED'
        s.sock = null
        await prisma.whatsAppSession.updateMany({
          where: { agencyId, userId: userId ?? null },
          data: { status: 'DISCONNECTED' },
        })
        if (!isLoggedOut && !isConflict) {
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
  const s = getSession(toKey(agencyId, userId))
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
  const s = getSession(sessionKey)
  if (s.reconnectTimer) clearTimeout(s.reconnectTimer)
  s.reconnectTimer = null
  if (s.sock) {
    try { await s.sock.logout() } catch {}
    s.sock = null
  }
  s.status = 'DISCONNECTED'
  s.phone = null
  await prisma.whatsAppSession.updateMany({
    where: { agencyId, userId: userId ?? null },
    data: { status: 'DISCONNECTED', phone: null, creds: '{}', keys: null },
  })
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
