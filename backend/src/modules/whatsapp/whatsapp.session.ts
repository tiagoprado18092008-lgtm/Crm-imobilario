import { PrismaClient } from '@prisma/client'
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'

const prisma = new PrismaClient()
const SESSION_ID = 'singleton'

export async function usePrismaAuthState() {
  const loadCreds = async () => {
    const row = await prisma.whatsAppSession.findUnique({ where: { id: SESSION_ID } })
    if (row?.creds && row.creds !== '{}') {
      try { return JSON.parse(row.creds, BufferJSON.reviver) } catch {}
    }
    return initAuthCreds()
  }

  const loadKeys = async () => {
    const row = await prisma.whatsAppSession.findUnique({ where: { id: SESSION_ID } })
    if (row?.keys) {
      try { return JSON.parse(row.keys, BufferJSON.reviver) } catch {}
    }
    return {}
  }

  const creds = await loadCreds()
  let keysData = await loadKeys()

  const saveState = async (newCreds: any, newKeys?: any) => {
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: SESSION_ID },
        create: {
          id: SESSION_ID,
          creds: JSON.stringify(newCreds, BufferJSON.replacer),
          keys: newKeys ? JSON.stringify(newKeys, BufferJSON.replacer) : null,
          status: 'CONNECTING',
        },
        update: {
          creds: JSON.stringify(newCreds, BufferJSON.replacer),
          ...(newKeys !== undefined ? { keys: JSON.stringify(newKeys, BufferJSON.replacer) } : {}),
        },
      })
    } catch (err) {
      console.error('[WA] Failed to save session:', err)
    }
  }

  // Simple in-memory key store (no makeCacheableSignalKeyStore to avoid logger incompatibility)
  const keys = {
    get: async (type: string, ids: string[]) => {
      const data: Record<string, any> = {}
      for (const id of ids) {
        const val = keysData[`${type}-${id}`]
        if (val !== undefined) data[id] = val
      }
      return data
    },
    set: async (data: Record<string, Record<string, any>>) => {
      for (const type in data) {
        for (const id in data[type]) {
          if (data[type][id]) {
            keysData[`${type}-${id}`] = data[type][id]
          } else {
            delete keysData[`${type}-${id}`]
          }
        }
      }
      await saveState(creds, keysData)
    },
  }

  return {
    state: { creds, keys },
    saveCreds: async (updatedCreds: any) => {
      Object.assign(creds, updatedCreds)
      await saveState(creds, keysData)
    },
  }
}
