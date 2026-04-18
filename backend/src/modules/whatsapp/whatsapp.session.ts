import { PrismaClient } from '@prisma/client'
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const SESSION_ID = 'singleton'
const KEYS_FILE = path.join('/tmp', 'wa-keys.json')

function readKeysFromFile(): Record<string, any> {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'), BufferJSON.reviver)
    }
  } catch {}
  return {}
}

function writeKeysToFile(data: Record<string, any>) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(data, BufferJSON.replacer))
  } catch (e) {
    console.error('[WA] Failed to write keys file:', e)
  }
}

export async function usePrismaAuthState() {
  const loadCreds = async () => {
    const row = await prisma.whatsAppSession.findUnique({ where: { id: SESSION_ID } })
    if (row?.creds && row.creds !== '{}') {
      try { return JSON.parse(row.creds, BufferJSON.reviver) } catch {}
    }
    return initAuthCreds()
  }

  const creds = await loadCreds()
  let keysData = readKeysFromFile()

  const saveCreds = async (updatedCreds: any) => {
    Object.assign(creds, updatedCreds)
    try {
      await prisma.whatsAppSession.upsert({
        where: { id: SESSION_ID },
        create: { id: SESSION_ID, creds: JSON.stringify(creds, BufferJSON.replacer), status: 'CONNECTING' },
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
      writeKeysToFile(keysData)
    },
  }

  return { state: { creds, keys }, saveCreds }
}
