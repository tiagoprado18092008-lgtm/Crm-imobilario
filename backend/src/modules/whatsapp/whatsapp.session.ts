import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import prisma from '../../config/database'

function parseSessionKey(sessionKey: string): { agencyId: string; userId: string | null } {
  const parts = sessionKey.split(':')
  return { agencyId: parts[0], userId: parts[1] || null }
}

export async function usePrismaAuthState(sessionKey: string) {
  const { agencyId, userId } = parseSessionKey(sessionKey)

  const loadRow = async () => {
    return prisma.whatsAppSession.findUnique({
      where: { agencyId_userId: { agencyId, userId: userId as any } },
    })
  }

  const row = await loadRow()
  let creds: any
  try {
    creds = row?.creds && row.creds !== '{}' ? JSON.parse(row.creds, BufferJSON.reviver) : initAuthCreds()
  } catch {
    creds = initAuthCreds()
  }

  let keysData: Record<string, any> = {}
  try {
    keysData = row?.keys ? JSON.parse(row.keys as string, BufferJSON.reviver) : {}
  } catch {
    keysData = {}
  }

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
