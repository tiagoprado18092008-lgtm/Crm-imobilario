import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import prisma from '../../config/database'

function keysFile(agencyId: string) {
  return path.join('/tmp', `wa-keys-${agencyId}.json`)
}

function readKeysFromFile(agencyId: string): Record<string, any> {
  try {
    const file = keysFile(agencyId)
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'), BufferJSON.reviver)
    }
  } catch {}
  return {}
}

function writeKeysToFile(agencyId: string, data: Record<string, any>) {
  try {
    fs.writeFileSync(keysFile(agencyId), JSON.stringify(data, BufferJSON.replacer))
  } catch (e) {
    console.error('[WA] Failed to write keys file:', e)
  }
}

export async function usePrismaAuthState(agencyId: string) {
  const loadCreds = async () => {
    const row = await prisma.whatsAppSession.findUnique({ where: { id: agencyId } })
    if (row?.creds && row.creds !== '{}') {
      try { return JSON.parse(row.creds, BufferJSON.reviver) } catch {}
    }
    return initAuthCreds()
  }

  const creds = await loadCreds()
  let keysData = readKeysFromFile(agencyId)

  const saveCreds = async (updatedCreds: any) => {
    Object.assign(creds, updatedCreds)
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: agencyId },
        create: { id: agencyId, creds: JSON.stringify(creds, BufferJSON.replacer), status: 'CONNECTING' },
        update: { creds: JSON.stringify(creds, BufferJSON.replacer) },
      })
    } catch (err) {
      console.error('[WA] Failed to save creds:', err)
    }
  }

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
          if (data[type][id] != null) {
            keysData[`${type}-${id}`] = data[type][id]
          } else {
            delete keysData[`${type}-${id}`]
          }
        }
      }
      writeKeysToFile(agencyId, keysData)
    },
  }

  return { state: { creds, keys }, saveCreds }
}
