import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import contactsRouter from './modules/contacts/contacts.router';
import propertiesRouter from './modules/properties/properties.router';
import opportunitiesRouter from './modules/opportunities/opportunities.router';
import interactionsRouter from './modules/interactions/interactions.router';
import tasksRouter from './modules/tasks/tasks.router';
import reportsRouter from './modules/reports/reports.router';
import conversationsRouter from './modules/conversations/conversations.router';
import templatesRouter from './modules/message-templates/templates.router';
import settingsRouter from './modules/settings/settings.router';
import callsRouter from './modules/calls/calls.router';
import automationsRouter from './modules/automations/automations.router';
import phoneNumbersRouter from './modules/phone-numbers/phone-numbers.router';
import appointmentsRouter from './modules/appointments/appointments.router';
import campaignsRouter from './modules/campaigns/campaigns.router';
import formsRouter from './modules/forms/forms.router';
import invitationsRouter from './modules/invitations/invitations.router';
import agencyRouter from './modules/agency/agency.router';
import notificationsRouter from './modules/notifications/notifications.router';
import exportsRouter from './modules/exports/exports.router';
import searchRouter from './modules/search/search.router';
import calendarRouter from './modules/calendar/calendar.router';
import calendarEventsRouter from './modules/calendar/calendar-events.router';
import webhooksRouter from './modules/webhooks/webhooks.router';
import locationsRouter from './modules/locations/locations.router';
import activityRouter from './modules/activity/activity.router';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './utils/logger';
import prisma from './config/database';
import { eventBus } from './utils/event-bus';
import { startImapPolling } from './utils/imap.service';
import { registerEventListeners, registerV2EventListeners } from './utils/automation.engine';
import { startAutomationCron } from './jobs/automation-cron';
import { startCalendarCron } from './lib/calendar-cron';
import { loadSettingsFromDB } from './modules/settings/settings.service';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map(u => u.trim())
      : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(requestLogger);

// Servir uploads estáticos
// ts-node (dev): __dirname = backend/src  → ../.. = repo root
// tsc (prod):    __dirname = backend/dist/src → ../../.. = repo root
const uploadsPath = (() => {
  const fromSrc = path.resolve(__dirname, '../../uploads');       // ts-node path
  const fromDist = path.resolve(__dirname, '../../../uploads');   // compiled path
  if (fs.existsSync(fromSrc + '/properties') || fs.existsSync(fromSrc)) return fromSrc;
  return fromDist;
})();
app.use('/uploads', express.static(uploadsPath));

// ─── SSE (Server-Sent Events) for real-time updates ────────────────────────────

const sseClients = new Map<string, any>()

app.get('/api/sse', (req, res) => {
  const token = (req.headers.authorization?.replace('Bearer ', '') || req.query.token) as string
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const clientId = `${Date.now()}-${Math.random()}`
  sseClients.set(clientId, res)

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  const ping = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
  }, 30000)

  req.on('close', () => {
    clearInterval(ping)
    sseClients.delete(clientId)
  })
})

eventBus.on('new_message', (payload: any) => {
  const data = `data: ${JSON.stringify({ type: 'new_message', ...payload })}\n\n`
  sseClients.forEach((client) => {
    try { client.write(data) } catch {}
  })
})

// Health check
app.get('/health', async (_req, res) => {
  let db = 'disconnected';
  try { await prisma.$queryRaw`SELECT 1`; db = 'connected'; } catch {}
  res.json({ status: 'ok', db, version: process.env.npm_package_version || '1.0.0', timestamp: new Date().toISOString() });
});

// ─── WhatsApp Webhook ───────────────────────────────────────────────────────

// Webhook verification (GET) — called by Meta when first configuring
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Incoming messages (POST)
app.post('/webhook/whatsapp', async (req, res) => {
  res.status(200).json({ status: 'ok' }); // Always respond 200 immediately

  try {
    const body = req.body;
    if (body?.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Handle status updates (delivered, read, failed) — no conversation needed
          for (const status of value?.statuses || []) {
            console.log(`[WhatsApp Status] id=${status.id} status=${status.status}`);
          }

          for (const msg of value?.messages || []) {
            const from = msg.from; // phone number
            const externalId = msg.id;
            const msgType: string = msg.type || 'text';

            // Extract content based on message type
            let text: string;
            switch (msgType) {
              case 'text':
                text = msg.text?.body || '';
                break;
              case 'image':
                text = msg.image?.caption ? `[Imagem] ${msg.image.caption}` : '[Imagem]';
                break;
              case 'video':
                text = msg.video?.caption ? `[Vídeo] ${msg.video.caption}` : '[Vídeo]';
                break;
              case 'audio':
                text = '[Áudio]';
                break;
              case 'voice':
                text = '[Mensagem de voz]';
                break;
              case 'document':
                text = msg.document?.filename
                  ? `[Documento] ${msg.document.filename}`
                  : '[Documento]';
                break;
              case 'location':
                text = msg.location
                  ? `[Localização] ${msg.location.name || ''} ${msg.location.address || ''} (${msg.location.latitude}, ${msg.location.longitude})`.trim()
                  : '[Localização]';
                break;
              case 'contacts':
                text = msg.contacts?.length
                  ? `[Contacto] ${msg.contacts.map((c: any) => c.name?.formatted_name || '').join(', ')}`
                  : '[Contacto]';
                break;
              case 'sticker':
                text = '[Sticker]';
                break;
              case 'reaction':
                // Reactions are on existing messages, skip creating a new message record
                continue;
              case 'interactive':
                text = msg.interactive?.button_reply?.title
                  || msg.interactive?.list_reply?.title
                  || '[Resposta interativa]';
                break;
              default:
                text = `[${msgType}]`;
            }

            // Extract profile name from contacts metadata if available
            const profileName = value?.contacts?.find((c: any) => c.wa_id === from)?.profile?.name;

            const { receiveInbound } = await import('./modules/conversations/conversations.service');
            await receiveInbound(
              'WHATSAPP',
              from,
              text,
              JSON.stringify({ messageId: externalId, type: msgType, profileName: profileName || null })
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook Error]', err);
  }
});

// ─── Instagram Webhook ──────────────────────────────────────────────────────

app.get('/webhook/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const igVerifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === igVerifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

app.post('/webhook/instagram', async (req, res) => {
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    for (const entry of body?.entry || []) {
      for (const messaging of entry?.messaging || []) {
        const senderId = messaging?.sender?.id;
        const text = messaging?.message?.text;
        if (senderId && text) {
          const { receiveInbound } = await import('./modules/conversations/conversations.service');
          await receiveInbound(
            'INSTAGRAM',
            senderId,
            text,
            JSON.stringify({ entryId: entry.id })
          );
        }
      }
    }
  } catch (err) {
    console.error('[Instagram Webhook Error]', err);
  }
});

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Demasiadas tentativas. Aguarde 15 minutos.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: { error: 'Demasiados pedidos. Aguarde um momento.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRouter);
app.use('/api', apiLimiter);
app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/message-templates', templatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/phone-numbers', phoneNumbersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/search', searchRouter);
app.use('/api/agency', agencyRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/calendar', calendarEventsRouter);
app.use('/api/webhooks', webhooksRouter);

// ─── Twilio Webhooks ─────────────────────────────────────────────────────────

// ─── Twilio Inbound SMS ───────────────────────────────────────────────────────
app.post('/webhook/twilio/sms', async (req, res) => {
  res.type('text/xml').send('<Response></Response>');
  try {
    const { From, To, Body } = req.body;
    const { receiveInbound } = await import('./modules/conversations/conversations.service');
    // Find which user owns this number
    await receiveInbound('SMS' as any, From, Body, JSON.stringify({ to: To }));
  } catch (err) { console.error('[Twilio SMS Webhook]', err); }
});

// ─── Twilio Inbound Call ──────────────────────────────────────────────────────
app.post('/webhook/twilio/inbound-call', async (req, res) => {
  const { From, To } = req.body;
  try {
    const { receiveInbound } = await import('./modules/conversations/conversations.service');
    await receiveInbound('CALL' as any, From, `Chamada recebida de ${From}`, JSON.stringify({ to: To }));
  } catch (err) { console.error('[Twilio Inbound Call]', err); }

  // Find the active agent to route the call to in the browser
  let clientIdentity: string | null = null;
  try {
    const agent = await prisma.user.findFirst({
      where: { role: 'AGENCY_OWNER', isActive: true },
      select: { email: true },
    }) || await prisma.user.findFirst({
      where: { isActive: true },
      select: { email: true },
    });
    if (agent?.email) {
      clientIdentity = agent.email.replace(/[^a-zA-Z0-9]/g, '_');
    }
  } catch (err) { console.error('[Twilio Inbound Call] Could not find agent', err); }

  let twiml: string;
  if (clientIdentity) {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Olá, obrigado por ligar. Aguarde um momento.</Say>
  <Dial timeout="30">
    <Client>${clientIdentity}</Client>
  </Dial>
</Response>`;
  } else {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Serviço indisponível. Tente mais tarde.</Say>
</Response>`;
  }
  res.type('text/xml').send(twiml);
});

// TwiML for outbound calls (browser SDK)
app.post('/webhook/twilio/voice', (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
    <Number>${req.body.To || ''}</Number>
  </Dial>
</Response>`
  res.type('text/xml').send(twiml)
})

// TwiML for browser client calls
app.post('/webhook/twilio/client', (req, res) => {
  const to = req.body.To
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
    ${to?.startsWith('client:') ? `<Client>${to.replace('client:', '')}</Client>` : `<Number>${to}</Number>`}
  </Dial>
</Response>`
  res.type('text/xml').send(twiml)
})

// Call status updates + Missed Call Text Back
app.post('/webhook/twilio/status', async (req, res) => {
  res.status(200).send('ok')
  const { CallSid, CallStatus, CallDuration, From, To } = req.body
  console.log(`[Twilio] Call ${CallSid}: ${CallStatus}, duration: ${CallDuration}s`)

  // Missed Call Text Back — envia SMS automático se chamada não foi atendida
  if (CallStatus === 'no-answer' || CallStatus === 'busy') {
    try {
      const { sendSMS } = await import('./utils/twilio.service')
      const callerNumber = From
      const consultorNumber = To
      const consultorName = 'o consultor'

      // Tenta encontrar o nome do consultor pela base de dados
      const user = await prisma.user.findFirst({ where: { phone: consultorNumber } })
      const name = user?.name || consultorName

      await sendSMS(
        callerNumber,
        `Olá! Sou ${name}. Estou numa visita agora, mas vi a sua chamada. O que procura exatamente? Responda aqui e entrarei em contacto brevemente.`
      )
      console.log(`[Missed Call Text Back] SMS enviado para ${callerNumber}`)
    } catch (err) {
      console.error('[Missed Call Text Back] Erro ao enviar SMS:', err)
    }
  }
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', status: 404 });
});

// Global error handler
app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT ?? '3000', 10);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`CRM Backend running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });

  // Load persisted settings from DB before starting background services.
  // Done outside the listen callback so async errors are properly catchable.
  loadSettingsFromDB()
    .then(() => {
      startImapPolling();
      registerEventListeners();
      registerV2EventListeners();
      startAutomationCron();
      startCalendarCron();
    })
    .catch((err) => {
      console.error('[Boot] Fatal error loading settings from DB:', err);
      server.close(() => process.exit(1));
    });
}

export default app;
