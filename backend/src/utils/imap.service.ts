import Imap from 'imap'
import { simpleParser } from 'mailparser'

export function startImapPolling() {
  const host = process.env.IMAP_HOST
  const user = process.env.IMAP_USER
  const pass = process.env.IMAP_PASS
  const port = parseInt(process.env.IMAP_PORT || '993', 10)

  if (!host || !user || !pass) {
    console.log('[IMAP] Not configured — skipping email receive polling')
    return
  }

  const poll = async () => {
    try {
      await fetchUnreadEmails(host, user, pass, port)
    } catch (err) {
      console.error('[IMAP Poll Error]', err)
    }
  }

  poll()
  setInterval(poll, 60 * 1000)
  console.log('[IMAP] Email polling started')
}

function fetchUnreadEmails(host: string, user: string, pass: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user,
      password: pass,
      host,
      port,
      tls: port === 993,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000,
    })

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        imap.search(['UNSEEN'], async (err2, results) => {
          if (err2 || !results || results.length === 0) {
            imap.end()
            return resolve()
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: true })
          const emails: string[] = []

          fetch.on('message', (msg) => {
            let rawEmail = ''
            msg.on('body', (stream) => {
              stream.on('data', (chunk: Buffer) => { rawEmail += chunk.toString() })
            })
            msg.once('end', () => emails.push(rawEmail))
          })

          fetch.once('end', async () => {
            imap.end()
            for (const raw of emails) {
              try {
                const parsed = await simpleParser(raw)
                const fromAddr = parsed.from?.value?.[0]?.address || 'unknown@unknown.com'
                const subject = parsed.subject || '(sem assunto)'
                const text = parsed.text || (parsed.html as string || '').replace(/<[^>]+>/g, '') || ''

                const { receiveInbound } = await import('../modules/conversations/conversations.service')
                await receiveInbound('EMAIL', fromAddr, text, JSON.stringify({ subject, from: fromAddr }))
                console.log(`[IMAP] New email from ${fromAddr}: ${subject}`)
              } catch (e) {
                console.error('[IMAP Parse Error]', e)
              }
            }
            resolve()
          })

          fetch.once('error', (e: Error) => {
            imap.end()
            reject(e)
          })
        })
      })
    })

    imap.once('error', reject)
    imap.connect()
  })
}
