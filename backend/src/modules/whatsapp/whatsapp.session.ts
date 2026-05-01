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

  // Only reuse creds if both creds AND keys are present (complete session state)
  // If keys are missing, starting with stale creds causes a 401 with no QR generated
  const hasCreds = row?.creds && row.creds !== '{}'
  const hasKeys = row?.keys && row.keys !== '{}'
  const canRestore = hasCreds && hasKeys

  let creds: any
  if (canRestore) {
    try {
      creds = JSON.parse(row!.creds, BufferJSON.reviver)
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

  const saveCreds = async () => {
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

  const saveKeys = async (data: Record<string, any>) => {
    Object.assign(keysData, data)
    try {
      await prisma.whatsAppSession.upsert({
        where: { agencyId_userId: { agencyId, userId: userId as any } },
        create: { agencyId, userId, creds: JSON.stringify(creds, BufferJSON.replacer), keys: JSON.stringify(keysData, BufferJSON.replacer), status: 'CONNECTING' },
        update: { keys: JSON.stringify(keysData, BufferJSON.replacer) },
      })
    } catch (err) {
      console.error('[WA] Failed to save keys:', err)
    }
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
          saveKeys(flat).catch(e => console.error('[WA] saveKeys error:', e))
        },
      },
    },
    saveCreds,
  }
}
