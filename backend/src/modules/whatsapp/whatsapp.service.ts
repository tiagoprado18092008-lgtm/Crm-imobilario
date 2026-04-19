import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import { PrismaClient } from '@prisma/client'
import { usePrismaAuthState } from './whatsapp.session'
import { eventBus } from '../../utils/event-bus'
import { receiveInbound } from '../conversations/conversations.service'

const prisma = new PrismaClient()

interface SessionState {
  sock: ReturnType<typeof makeWASocket> | null
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  phone: string | null
  qr: string | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

const sessions = new Map<string, SessionState>()

function getSession(agencyId: string): SessionState {
  if (!sessions.has(agencyId)) {
    sessions.set(agencyId, { sock: null, status: 'DISCONNECTED', phone: null, qr: null, reconnectTimer: null })
  }
  return sessions.get(agencyId)!
}

export function getStatus(agencyId: string) {
  const s = getSession(agencyId)
  return { status: s.status, phone: s.phone, qr: s.qr }
}

export async function initWhatsApp(agencyId: string): Promise<void> {
  const s = getSession(agencyId)
  if (s.sock) {
    console.log(`[WA:${agencyId}] Already initialised`)
    return
  }

  s.status = 'CONNECTING'
  s.qr = null
  console.log(`[WA:${agencyId}] Starting initWhatsApp...`)

  await prisma.whatsAppSession.upsert({
    where: { id: agencyId },
    create: { id: agencyId, creds: '{}', status: 'CONNECTING' },
    update: { status: 'CONNECTING' },
  })

  try {
    const { state, saveCreds } = await usePrismaAuthState(agencyId)
    console.log(`[WA:${agencyId}] Auth state loaded`)

    let version: [number, number, number] = [2, 3000, 1035194821]
    try {
      const v = await fetchLatestBaileysVersion()
      version = v.version
    } catch {
      console.log(`[WA:${agencyId}] Using fallback version`)
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
          eventBus.emit(`whatsapp_qr:${agencyId}`, { qr: s.qr })
          eventBus.emit('whatsapp_qr', { qr: s.qr, agencyId })
        } catch (e) {
          console.error(`[WA:${agencyId}] QR encode error:`, e)
        }
      }

      if (connection === 'open') {
        s.qr = null
        s.status = 'CONNECTED'
        const jid = sock?.user?.id || ''
        s.phone = jid.split(':')[0].replace('@s.whatsapp.net', '') || null
        await prisma.whatsAppSession.upsert({
          where: { id: agencyId },
          create: { id: agencyId, creds: '{}', status: 'CONNECTED', phone: s.phone },
          update: { status: 'CONNECTED', phone: s.phone },
        })
        eventBus.emit(`whatsapp_connected:${agencyId}`, { phone: s.phone })
        eventBus.emit('whatsapp_connected', { phone: s.phone, agencyId })
        console.log(`[WA:${agencyId}] Connected as`, s.phone)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        const isConflict = statusCode === DisconnectReason.connectionReplaced || statusCode === 440
        console.log(`[WA:${agencyId}] Closed, statusCode:`, statusCode)
        s.qr = null
        s.status = 'DISCONNECTED'
        s.sock = null
        await prisma.whatsAppSession.updateMany({
          where: { id: agencyId },
          data: { status: 'DISCONNECTED' },
        })
        if (!isLoggedOut && !isConflict) {
          if (s.reconnectTimer) clearTimeout(s.reconnectTimer)
          s.reconnectTimer = setTimeout(() => initWhatsApp(agencyId), 5000)
        }
        // On conflict (440): do NOT auto-reconnect — user must reconnect manually via Settings
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (type !== 'notify') continue
        if (msg.key.fromMe) continue
        await handleIncoming(msg, agencyId)
      }
    })
  } catch (err) {
    console.error(`[WA:${agencyId}] initWhatsApp error:`, err)
    s.status = 'DISCONNECTED'
    s.sock = null
  }
}

async function handleIncoming(msg: any, agencyId: string) {
  try {
    const jid = msg.key.remoteJid || ''
    if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@lid')) {
      return
    }
    const phone = jid.replace('@s.whatsapp.net', '')
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      ''
    if (!phone || !text) return

    await receiveInbound(
      'WHATSAPP',
      phone,
      text,
      JSON.stringify({ messageId: msg.key.id, profileName: msg.pushName }),
      agencyId,
    )
    console.log(`[WA:${agencyId}] receiveInbound done for`, phone)
  } catch (e) {
    console.error(`[WA:${agencyId}] handleIncoming error:`, e)
  }
}

export async function sendViaBaileys(agencyId: string, to: string, text: string): Promise<boolean> {
  const s = getSession(agencyId)
  if (!s.sock || s.status !== 'CONNECTED') return false
  try {
    let digits = to.replace(/\D/g, '')
    if (digits.length === 9) digits = '351' + digits
    const jid = digits + '@s.whatsapp.net'
    await s.sock.sendMessage(jid, { text })
    return true
  } catch (e) {
    console.error(`[WA:${agencyId}] sendViaBaileys error:`, e)
    return false
  }
}

export async function disconnectWhatsApp(agencyId: string): Promise<void> {
  const s = getSession(agencyId)
  if (s.reconnectTimer) clearTimeout(s.reconnectTimer)
  s.reconnectTimer = null
  if (s.sock) {
    try { await s.sock.logout() } catch {}
    s.sock = null
  }
  s.status = 'DISCONNECTED'
  s.phone = null
  await prisma.whatsAppSession.updateMany({
    where: { id: agencyId },
    data: { status: 'DISCONNECTED', phone: null, creds: '{}', keys: null },
  })
}

// Called on server startup — restore all connected sessions
export async function restoreAllSessions(): Promise<void> {
  const rows = await prisma.whatsAppSession.findMany({
    where: { status: 'CONNECTED' },
  })
  for (const row of rows) {
    console.log(`[WA] Restoring session for agency: ${row.id}`)
    initWhatsApp(row.id).catch(e => console.error(`[WA] Restore error for ${row.id}:`, e))
  }
}
