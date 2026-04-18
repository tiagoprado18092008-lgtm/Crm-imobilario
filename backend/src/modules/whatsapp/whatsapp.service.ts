import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import { PrismaClient } from '@prisma/client'
import { usePrismaAuthState } from './whatsapp.session'
import { eventBus } from '../../utils/event-bus'
import { receiveInbound } from '../conversations/conversations.service'

const prisma = new PrismaClient()
const SESSION_ID = 'singleton'

let sock: ReturnType<typeof makeWASocket> | null = null
let currentStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED'
let currentPhone: string | null = null
let currentQR: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function getStatus() {
  return { status: currentStatus, phone: currentPhone, qr: currentQR }
}

export async function initWhatsApp(): Promise<void> {
  if (sock) {
    console.log('[WA] Already initialised, sock exists')
    return
  }

  currentStatus = 'CONNECTING'
  currentQR = null
  console.log('[WA] Starting initWhatsApp...')

  await prisma.whatsAppSession.upsert({
    where: { id: SESSION_ID },
    create: { id: SESSION_ID, creds: '{}', status: 'CONNECTING' },
    update: { status: 'CONNECTING' },
  })

  try {
    const { state, saveCreds } = await usePrismaAuthState()
    console.log('[WA] Auth state loaded')

    let version: [number, number, number] = [2, 3000, 1035194821]
    try {
      const v = await fetchLatestBaileysVersion()
      version = v.version
      console.log('[WA] Using version:', version)
    } catch {
      console.log('[WA] Using fallback version:', version)
    }

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: ['CasaFlow CRM', 'Chrome', '1.0.0'],
      connectTimeoutMs: 30000,
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log('[WA] QR received, encoding...')
        try {
          currentQR = await QRCode.toDataURL(qr)
          console.log('[WA] QR encoded, length:', currentQR?.length)
          eventBus.emit('whatsapp_qr', { qr: currentQR })
        } catch (e) {
          console.error('[WA] QR encode error:', e)
        }
      }

      if (connection === 'open') {
        currentQR = null
        currentStatus = 'CONNECTED'
        const jid = sock?.user?.id || ''
        currentPhone = jid.split(':')[0].replace('@s.whatsapp.net', '') || null
        await prisma.whatsAppSession.upsert({
          where: { id: SESSION_ID },
          create: { id: SESSION_ID, creds: '{}', status: 'CONNECTED', phone: currentPhone },
          update: { status: 'CONNECTED', phone: currentPhone },
        })
        eventBus.emit('whatsapp_connected', { phone: currentPhone })
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        currentQR = null
        currentStatus = 'DISCONNECTED'
        sock = null
        await prisma.whatsAppSession.updateMany({
          where: { id: SESSION_ID },
          data: { status: 'DISCONNECTED' },
        })
        if (shouldReconnect) {
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => initWhatsApp(), 5000)
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        if (msg.key.fromMe) continue
        await handleIncoming(msg)
      }
    })
  } catch (err) {
    console.error('[WA] initWhatsApp error:', err)
    currentStatus = 'DISCONNECTED'
    sock = null
  }
}

async function handleIncoming(msg: any) {
  try {
    const jid = msg.key.remoteJid || ''
    const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      ''
    if (!text || !phone) return

    await receiveInbound(
      'WHATSAPP',
      phone,
      text,
      JSON.stringify({ messageId: msg.key.id, profileName: msg.pushName }),
    )
  } catch {}
}

export async function sendViaBaileys(to: string, text: string): Promise<boolean> {
  if (!sock || currentStatus !== 'CONNECTED') return false
  try {
    let digits = to.replace(/\D/g, '')
    // Add Portugal country code if 9-digit number
    if (digits.length === 9) digits = '351' + digits
    const jid = digits + '@s.whatsapp.net'
    console.log('[WA] sending to jid:', jid)
    await sock.sendMessage(jid, { text })
    return true
  } catch (e) {
    console.error('[WA] sendViaBaileys error:', e)
    return false
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  if (sock) {
    try {
      await sock.logout()
    } catch {}
    sock = null
  }
  currentStatus = 'DISCONNECTED'
  currentPhone = null
  await prisma.whatsAppSession.updateMany({
    where: { id: SESSION_ID },
    data: { status: 'DISCONNECTED', phone: null, creds: '{}', keys: null },
  })
}
