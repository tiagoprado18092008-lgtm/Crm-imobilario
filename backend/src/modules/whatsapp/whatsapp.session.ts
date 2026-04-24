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
