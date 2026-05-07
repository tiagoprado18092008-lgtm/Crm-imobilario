import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import prisma from '../../config/database'

function parseSessionKey(sessionKey: string): { agencyId: string; userId: string | null } {
  const parts = sessionKey.split(':')
  return { agencyId: parts[0], userId: parts[1] || null }
}

export async function usePrismaAuthState(sessionKey: string) {
  const { agencyId, userId } = parseSessionKey(sessionKey)

  const row = await prisma.whatsAppSession.findFirst({
    where: { agencyId, userId: userId ?? null },
  })
  console.log(`[WA:${sessionKey}] DB state: hasCreds=${!!(row?.creds && row.creds !== '{}')}, hasKeys=${!!(row?.keys && row.keys !== '{}')}${row?.creds && row.creds !== '{}' ? `, meId=${(() => { try { return JSON.parse(row!.creds)?.me?.id || 'null' } catch { return 'parse-err' } })()}` : ''}`)

  const hasCreds = row?.creds && row.creds !== '{}'
  const hasKeys = row?.keys && row.keys !== '{}'

  let creds: any
  let canRestore = false
  if (hasCreds) {
    try {
      const parsed = JSON.parse(row!.creds, BufferJSON.reviver)
      // Restore creds whenever me.id is present — this covers two cases:
      // 1. Fully paired session (registered=true, keys present) — normal restore
      // 2. Mid-pairing after QR scan: Baileys fires 515 before keys.set runs,
      //    so keys may not be in DB yet. Restoring creds lets the reconnect
      //    complete the handshake instead of generating a new QR.
      if (parsed?.me?.id) {
        creds = parsed
        canRestore = true
      } else {
        creds = initAuthCreds()
      }
    } catch {
      creds = initAuthCreds()
    }
  } else {
    creds = initAuthCreds()
  }

  let keysData: Record<string, any> = {}
  if (canRestore && row?.keys) {
    try {
      keysData = JSON.parse(row.keys as string, BufferJSON.reviver)
    } catch {
      keysData = {}
    }
  }

  // Prisma cannot upsert on a composite unique that includes a nullable column
  // (userId=null) via the generated `agencyId_userId` compound key — it throws
  // "Argument 'userId' must not be null". Use updateMany+create instead.
  const upsertSession = async (data: Record<string, any>) => {
    const updated = await prisma.whatsAppSession.updateMany({
      where: { agencyId, userId: userId ?? null },
      data,
    })
    if (updated.count === 0) {
      await prisma.whatsAppSession.create({
        data: { agencyId, userId: userId ?? null, creds: JSON.stringify(creds, BufferJSON.replacer), status: 'CONNECTING', ...data },
      })
    }
  }

  const saveCreds = async () => {
    try {
      await upsertSession({ creds: JSON.stringify(creds, BufferJSON.replacer) })
    } catch (err) {
      console.error('[WA] Failed to save creds:', err)
    }
  }

  // Track in-flight key writes so callers (e.g. the close handler) can flush
  // them before reconnecting — Baileys' keys.set API is sync, so the writes
  // must be fire-and-forget, but we need a way to wait for them to settle.
  let pendingKeyWrites: Promise<unknown> = Promise.resolve()

  const saveKeys = async (data: Record<string, any>) => {
    Object.assign(keysData, data)
    try {
      await upsertSession({ keys: JSON.stringify(keysData, BufferJSON.replacer) })
    } catch (err) {
      console.error('[WA] Failed to save keys:', err)
    }
  }

  const flushPendingWrites = () => pendingKeyWrites

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
          const p = saveKeys(flat).catch(e => console.error('[WA] saveKeys error:', e))
          pendingKeyWrites = pendingKeyWrites.then(() => p)
        },
      },
    },
    saveCreds,
    flushPendingWrites,
  }
}
