# WhatsApp por Consultor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada consultor tenha a sua própria sessão WhatsApp pessoal, manter a opção de sessão partilhada da agência gerida pelo admin, e mover o separador "Integrações" para dentro de "Definições" na sidebar.

**Architecture:** A tabela `WhatsAppSession` passa a ter uma unique constraint composta `(agencyId, userId)` com `userId` nullable — null significa sessão da agência, preenchido significa sessão pessoal. O serviço Baileys usa uma `sessionKey` string (`agencyId` ou `agencyId:userId`) como identificador opaco. O router WhatsApp ganha endpoints separados `/whatsapp/me/*` e `/whatsapp/agency/*`. O frontend atualiza a SettingsPage para mostrar duas secções na tab WhatsApp e a sidebar remove a entrada "Integrações" autónoma.

**Tech Stack:** Prisma (PostgreSQL), Express, Baileys (@whiskeysockets/baileys), React, TypeScript

---

## File Map

**Modify:**
- `backend/prisma/schema.prisma` — alterar `WhatsAppSession`, `Agency`, `User`
- `backend/src/modules/whatsapp/whatsapp.session.ts` — `usePrismaAuthState` aceita `sessionKey`
- `backend/src/modules/whatsapp/whatsapp.service.ts` — todas as funções aceitam `{ agencyId, userId? }`, lógica de routing de mensagens
- `backend/src/modules/whatsapp/whatsapp.controller.ts` — novos handlers me/agency
- `backend/src/modules/whatsapp/whatsapp.router.ts` — novos endpoints + aliases
- `backend/src/modules/conversations/conversations.service.ts` — `receiveInbound` aceita `assignedToId?`, `findOrReopenForInbound` aceita `assignedToId?`
- `frontend/src/api/whatsapp.api.ts` — novas funções me/agency
- `frontend/src/components/layout/Sidebar.tsx` — remover entrada "Integrações" autónoma
- `frontend/src/App.tsx` — remover rota `/phone-numbers`, redirecionar para `/settings`
- `frontend/src/pages/SettingsPage.tsx` — duas secções na tab WhatsApp

**Create:**
- `backend/prisma/migrations/YYYYMMDD_whatsapp_per_user/migration.sql` — gerada pelo Prisma

---

### Task 1: Schema Prisma — adicionar userId a WhatsAppSession

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Editar o modelo WhatsAppSession**

Substituir o bloco `model WhatsAppSession` existente (linhas ~829-838) por:

```prisma
model WhatsAppSession {
  id        String   @id @default(cuid())
  agencyId  String
  agency    Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creds     String   @db.Text
  keys      String?  @db.Text
  status    String   @default("DISCONNECTED")
  phone     String?
  updatedAt DateTime @updatedAt

  @@unique([agencyId, userId])
}
```

- [ ] **Step 2: Atualizar relação na Agency**

Na `model Agency`, mudar:
```prisma
// de:
whatsappSession WhatsAppSession?
// para:
whatsappSessions WhatsAppSession[]
```

- [ ] **Step 3: Adicionar relação no User**

Na `model User`, adicionar após `calendarSlots CalendarSlot[]`:
```prisma
whatsappSession  WhatsAppSession?
```

- [ ] **Step 4: Gerar e aplicar a migration**

```bash
cd backend
npx prisma migrate dev --name whatsapp_per_user
```

Esperado: migration criada e aplicada sem erros. A constraint `@unique([agencyId, userId])` permite múltiplos `userId: null` porque PostgreSQL trata NULLs como distintos em unique constraints compostas — isto é o comportamento correto.

- [ ] **Step 5: Regenerar o cliente Prisma**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add userId to WhatsAppSession for per-consultant sessions"
```

---

### Task 2: whatsapp.session.ts — sessionKey opaco

**Files:**
- Modify: `backend/src/modules/whatsapp/whatsapp.session.ts`

- [ ] **Step 1: Refatorar usePrismaAuthState para aceitar sessionKey**

Substituir o conteúdo completo do ficheiro por:

```typescript
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import prisma from '../../config/database'

function keysFile(sessionKey: string) {
  const safe = sessionKey.replace(':', '_')
  return path.join('/tmp', `wa-keys-${safe}.json`)
}

function readKeysFromFile(sessionKey: string): Record<string, any> {
  try {
    const file = keysFile(sessionKey)
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'), BufferJSON.reviver)
    }
  } catch {}
  return {}
}

function writeKeysToFile(sessionKey: string, data: Record<string, any>) {
  try {
    fs.writeFileSync(keysFile(sessionKey), JSON.stringify(data, BufferJSON.replacer))
  } catch (e) {
    console.error('[WA] Failed to write keys file:', e)
  }
}

function parseSessionKey(sessionKey: string): { agencyId: string; userId: string | null } {
  const parts = sessionKey.split(':')
  return { agencyId: parts[0], userId: parts[1] || null }
}

export async function usePrismaAuthState(sessionKey: string) {
  const { agencyId, userId } = parseSessionKey(sessionKey)

  const loadCreds = async () => {
    const row = await prisma.whatsAppSession.findUnique({
      where: { agencyId_userId: { agencyId, userId: userId as any } },
    })
    if (row?.creds && row.creds !== '{}') {
      try { return JSON.parse(row.creds, BufferJSON.reviver) } catch {}
    }
    return initAuthCreds()
  }

  const creds = await loadCreds()
  let keysData = readKeysFromFile(sessionKey)

  const saveCreds = async (updatedCreds: any) => {
    Object.assign(creds, updatedCreds)
    try {
      await prisma.whatsAppSession.upsert({
        where: { agencyId_userId: { agencyId, userId: userId as any } },
        create: { agencyId, userId, creds: JSON.stringify(creds, BufferJSON.replacer), status: 'CONNECTING' },
        update: { creds: JSON.stringify(creds, BufferJSON.replacer) },
      })
    } catch (err) {
      console.error('[WA] Failed to save creds:', err)
    }
  }

  const saveKeys = (data: Record<string, any>) => {
    Object.assign(keysData, data)
    writeKeysToFile(sessionKey, keysData)
  }

  return {
    state: {
      creds,
      keys: {
        get: (type: string, ids: string[]) => {
          const result: Record<string, any> = {}
          for (const id of ids) {
            const val = keysData[`${type}-${id}`]
            if (val) result[id] = val
          }
          return result
        },
        set: (data: Record<string, Record<string, any>>) => {
          const flat: Record<string, any> = {}
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, val] of Object.entries(entries || {})) {
              flat[`${type}-${id}`] = val
            }
          }
          saveKeys(flat)
        },
      },
    },
    saveCreds,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/whatsapp/whatsapp.session.ts
git commit -m "feat(whatsapp): refactor session auth state to use opaque sessionKey"
```

---

### Task 3: whatsapp.service.ts — suporte a sessões pessoais e da agência

**Files:**
- Modify: `backend/src/modules/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Substituir o ficheiro completo**

```typescript
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
    where: { agencyId_userId: { agencyId, userId: userId ?? null } },
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
          where: { agencyId_userId: { agencyId, userId: userId ?? null } },
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
      // Sessão pessoal — atribuir sempre ao dono da sessão
      assignedToId = userId
    } else {
      // Sessão da agência — procurar consultor pelo contacto
      const digits = phone.replace(/\D/g, '')
      const variants = [phone, digits, `+${digits}`]
      const contact = await prisma.contact.findFirst({
        where: {
          AND: [
            { OR: variants.flatMap(v => [{ phone: v }, { whatsapp: v }]) },
            { location: { agencyId } },
          ],
          assignedToId: { not: null },
        },
        select: { assignedToId: true },
      })

      if (contact?.assignedToId) {
        assignedToId = contact.assignedToId
      } else {
        // Round-robin: consultor ativo com menos conversas abertas
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
```

- [ ] **Step 2: Verificar compilação TypeScript**

```bash
cd backend
npx tsc --noEmit
```

Esperado: sem erros relacionados com `whatsapp.service.ts` ou `whatsapp.session.ts`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/whatsapp/whatsapp.service.ts
git commit -m "feat(whatsapp): support per-consultant and agency-shared sessions"
```

---

### Task 4: conversations.service.ts — receiveInbound aceita assignedToId

**Files:**
- Modify: `backend/src/modules/conversations/conversations.service.ts`

- [ ] **Step 1: Adicionar assignedToId ao receiveInbound**

Localizar a assinatura de `receiveInbound` (linha ~318) e adicionar o parâmetro `assignedToId?`:

```typescript
export const receiveInbound = async (
  channel: string,
  externalId: string,
  content: string,
  metadata?: string,
  agencyId?: string,
  assignedToId?: string,
) => {
```

- [ ] **Step 2: Passar assignedToId ao findOrReopenForInbound**

Localizar a chamada a `findOrReopenForInbound` dentro de `receiveInbound` (linha ~377) e atualizar:

```typescript
const conversation = await findOrReopenForInbound(channel, externalId, resolvedContactId, resolvedLocationId, assignedToId)
```

- [ ] **Step 3: Atualizar findOrReopenForInbound para aceitar e aplicar assignedToId**

Atualizar a assinatura e a lógica de criação de conversa:

```typescript
export const findOrReopenForInbound = async (
  channel: string,
  externalId: string,
  contactId: string | undefined,
  locationId: string,
  assignedToId?: string,
) => {
```

Na criação da nova conversa dentro da transaction, adicionar `assignedToId`:

```typescript
return tx.conversation.create({
  data: {
    channel,
    externalId: canonical,
    status: 'OPEN',
    isRead: false,
    contactId: contactId || null,
    locationId,
    lastMessageAt: new Date(),
    ...(assignedToId ? { assignedToId } : {}),
  },
})
```

E no `update` de conversa existente sem `assignedToId`, aplicar se disponível:

```typescript
return tx.conversation.update({
  where: { id: existing.id },
  data: {
    status: 'OPEN',
    externalId: canonical,
    ...(contactId && !existing.contactId ? { contactId } : {}),
    ...(assignedToId && !existing.assignedToId ? { assignedToId } : {}),
  },
})
```

- [ ] **Step 4: Verificar compilação**

```bash
cd backend
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/conversations/conversations.service.ts
git commit -m "feat(conversations): receiveInbound accepts assignedToId for routing"
```

---

### Task 5: whatsapp.controller.ts e whatsapp.router.ts — endpoints me/agency

**Files:**
- Modify: `backend/src/modules/whatsapp/whatsapp.controller.ts`
- Modify: `backend/src/modules/whatsapp/whatsapp.router.ts`

- [ ] **Step 1: Substituir o controller completo**

```typescript
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
```

- [ ] **Step 2: Substituir o router completo**

```typescript
import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import * as ctrl from './whatsapp.controller'

const router = Router()
router.use(authenticate)

// Sessão pessoal
router.get('/me/status', ctrl.meStatus)
router.post('/me/connect', ctrl.meConnect)
router.post('/me/disconnect', ctrl.meDisconnect)

// Sessão da agência
router.get('/agency/status', ctrl.agencyStatus)
router.post('/agency/connect', ctrl.agencyConnect)
router.post('/agency/disconnect', ctrl.agencyDisconnect)

// Aliases legacy
router.get('/status', ctrl.status)
router.post('/connect', ctrl.connect)
router.post('/disconnect', ctrl.disconnect)

export default router
```

- [ ] **Step 3: Verificar compilação**

```bash
cd backend
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/whatsapp/whatsapp.controller.ts backend/src/modules/whatsapp/whatsapp.router.ts
git commit -m "feat(whatsapp): add me/agency endpoints for per-consultant sessions"
```

---

### Task 6: frontend/src/api/whatsapp.api.ts — novas funções

**Files:**
- Modify: `frontend/src/api/whatsapp.api.ts`

- [ ] **Step 1: Substituir o ficheiro completo**

```typescript
import api from './client'

// Sessão pessoal do consultor
export const getMyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null }>('/whatsapp/me/status')
export const connectMyWhatsApp = () => api.post('/whatsapp/me/connect')
export const disconnectMyWhatsApp = () => api.post('/whatsapp/me/disconnect')

// Sessão partilhada da agência
export const getAgencyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null }>('/whatsapp/agency/status')
export const connectAgencyWhatsApp = () => api.post('/whatsapp/agency/connect')
export const disconnectAgencyWhatsApp = () => api.post('/whatsapp/agency/disconnect')

// Aliases legacy (mantêm compatibilidade com código existente)
export const getWhatsAppStatus = getAgencyWhatsAppStatus
export const connectWhatsApp = connectAgencyWhatsApp
export const disconnectWhatsApp = disconnectAgencyWhatsApp
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/whatsapp.api.ts
git commit -m "feat(frontend): add me/agency WhatsApp API functions"
```

---

### Task 7: SettingsPage — duas secções na tab WhatsApp

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Adicionar imports das novas funções**

No topo do ficheiro, localizar a linha que importa de `whatsapp.api` e substituir por:

```typescript
import {
  getMyWhatsAppStatus, connectMyWhatsApp, disconnectMyWhatsApp,
  getAgencyWhatsAppStatus, connectAgencyWhatsApp, disconnectAgencyWhatsApp,
} from '../api/whatsapp.api'
```

- [ ] **Step 2: Adicionar estado para sessão pessoal**

Localizar onde está declarado o estado do WhatsApp da agência (procurar por `waStatus`, `waQrImage`, ou similar) e adicionar ao lado o estado da sessão pessoal. Adicionar após os estados existentes de WhatsApp:

```typescript
const [myWaStatus, setMyWaStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED')
const [myWaPhone, setMyWaPhone] = useState<string | null>(null)
const [myWaQr, setMyWaQr] = useState<string | null>(null)
const [myWaLoading, setMyWaLoading] = useState(false)
```

- [ ] **Step 3: Carregar estado da sessão pessoal no useEffect**

No `useEffect` onde se chama `getWhatsAppStatus` (ou equivalente para a agência), adicionar também o fetch da sessão pessoal:

```typescript
getMyWhatsAppStatus().then(r => {
  setMyWaStatus(r.data.status as any)
  setMyWaPhone(r.data.phone)
  if (r.data.status === 'CONNECTING') {
    // polling para QR da sessão pessoal — igual ao da agência, mas via SSE /whatsapp/me/status
  }
}).catch(() => {})
```

- [ ] **Step 4: Adicionar handlers para sessão pessoal**

Adicionar as funções de ligar/desligar para a sessão pessoal, análogas às existentes para a agência:

```typescript
const handleMyWaConnect = async () => {
  setMyWaLoading(true)
  try {
    await connectMyWhatsApp()
    // Iniciar polling de QR igual ao da agência
    const poll = setInterval(async () => {
      const r = await getMyWhatsAppStatus()
      setMyWaStatus(r.data.status as any)
      setMyWaPhone(r.data.phone)
      if (r.data.status === 'CONNECTED' || r.data.status === 'DISCONNECTED') {
        clearInterval(poll)
        setMyWaLoading(false)
      }
    }, 2000)
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Erro ao ligar WhatsApp pessoal', 'error')
    setMyWaLoading(false)
  }
}

const handleMyWaDisconnect = async () => {
  try {
    await disconnectMyWhatsApp()
    setMyWaStatus('DISCONNECTED')
    setMyWaPhone(null)
    setMyWaQr(null)
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Erro ao desligar WhatsApp pessoal', 'error')
  }
}
```

- [ ] **Step 5: Atualizar a tab WhatsApp para mostrar duas secções**

Dentro do bloco `{tab === 'whatsapp' && (`, localizar a secção de QR/status atual (que é da agência) e **antes dela** adicionar a secção pessoal. Estrutura:

```tsx
{tab === 'whatsapp' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

    {/* ── Secção: O meu WhatsApp ── */}
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>O meu WhatsApp</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
        Número pessoal — as conversas ficam atribuídas a si.
      </p>
      {myWaStatus === 'CONNECTED' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 14, color: 'var(--text)' }}>Ligado: +{myWaPhone}</span>
          <button
            onClick={handleMyWaDisconnect}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}
          >
            Desligar
          </button>
        </div>
      ) : (
        <button
          onClick={handleMyWaConnect}
          disabled={myWaLoading || myWaStatus === 'CONNECTING'}
          style={{ padding: '8px 20px', borderRadius: 8, background: '#25d366', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          {myWaStatus === 'CONNECTING' ? 'A ligar...' : 'Ligar o meu WhatsApp'}
        </button>
      )}
      {myWaQr && (
        <div style={{ marginTop: 16 }}>
          <img src={myWaQr} alt="QR Code pessoal" style={{ width: 200, height: 200 }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            Abre o WhatsApp → Dispositivos ligados → Ligar dispositivo
          </p>
        </div>
      )}
    </div>

    {/* ── Secção: WhatsApp da Agência (apenas admin/gestor) ── */}
    {/* Mover aqui o bloco existente de QR/status da agência, sem alterar o seu código interno */}
    {isAdminOrOwner && (
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>WhatsApp da Agência</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          Número partilhado — as mensagens são atribuídas ao consultor responsável pelo contacto.
        </p>
        {/* ... bloco existente de QR/status da agência ... */}
      </div>
    )}

  </div>
)}
```

**Nota:** `isAdminOrOwner` deve ser lido do store de autenticação existente (procurar como o resto da app verifica o role do utilizador, ex: `useAuthStore` ou `req.user.role`).

- [ ] **Step 6: Adicionar SSE/polling de QR para sessão pessoal**

O QR da sessão pessoal chega via SSE (event bus). Localizar onde o frontend subscreve o QR da agência (procurar por `EventSource`, `whatsapp_qr`, ou polling por `getWhatsAppStatus`) e adicionar subscrição equivalente para a sessão pessoal usando `/whatsapp/me/status` em polling ou o mesmo mecanismo SSE com um evento diferente.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/SettingsPage.tsx
git commit -m "feat(settings): add personal WhatsApp section alongside agency section"
```

---

### Task 8: Sidebar — mover Integrações para dentro de Definições

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Remover entrada "Números" e "Integrações" autónomas da Sidebar**

Em `Sidebar.tsx`, localizar a linha:
```typescript
{ to: '/phone-numbers', icon: Phone, label: 'Números' },
```
Remover esta entrada.

Localizar a linha do grupo "Sistema":
```typescript
navGroups.push({ label: 'Sistema', items: [{ to: '/settings', icon: Settings, label: 'Integrações' }] })
```
Mudar o label:
```typescript
navGroups.push({ label: 'Sistema', items: [{ to: '/settings', icon: Settings, label: 'Definições' }] })
```

- [ ] **Step 2: Adicionar redirect de /phone-numbers para /settings em App.tsx**

Em `App.tsx`, localizar:
```tsx
<Route path="phone-numbers" element={<PhoneNumbersPage />} />
```
Substituir por:
```tsx
<Route path="phone-numbers" element={<Navigate to="/settings" replace />} />
```

Adicionar o import de `Navigate` se não existir:
```tsx
import { Navigate } from 'react-router-dom'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/App.tsx
git commit -m "feat(nav): move Integrations into Settings, rename sidebar entry"
```

---

### Task 9: Build e verificação final

- [ ] **Step 1: Build do backend**

```bash
cd backend
npm run build
```

Esperado: sem erros de compilação TypeScript.

- [ ] **Step 2: Build do frontend**

```bash
cd frontend
npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Verificar a migration foi aplicada**

```bash
cd backend
npx prisma migrate status
```

Esperado: todas as migrations com status "Applied".

- [ ] **Step 4: Push final**

```bash
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ `WhatsAppSession` com `userId` nullable e unique `(agencyId, userId)` — Task 1
- ✅ `sessionKey` opaco `agencyId` vs `agencyId:userId` — Tasks 2 e 3
- ✅ Sessão pessoal: atribuição ao dono — Task 3 `handleIncoming`
- ✅ Sessão agência: atribuição por contacto ou round-robin — Task 3 `handleIncoming`
- ✅ `receiveInbound` aceita `assignedToId?` — Task 4
- ✅ Endpoints `/whatsapp/me/*` e `/whatsapp/agency/*` com proteção de role — Task 5
- ✅ Aliases legacy para não quebrar código existente — Tasks 5 e 6
- ✅ Frontend: duas secções na tab WhatsApp — Task 7
- ✅ Sidebar: "Integrações" → "Definições", remoção de "Números" — Task 8
- ✅ Redirect `/phone-numbers` → `/settings` — Task 8

**Placeholder scan:** Task 7 Steps 5 e 6 contêm notas de integração com código existente — são intencionais porque o código exato do bloco de QR da agência (±200 linhas) não foi reproduzido para evitar duplicação; o agente deve localizar e mover o bloco existente.

**Type consistency:** `toKey`, `sessionKey`, `agencyId_userId` (nome do índice Prisma para unique composta) usados de forma consistente nas Tasks 2, 3 e 4.
