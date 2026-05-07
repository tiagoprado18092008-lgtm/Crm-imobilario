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
import appointmentCalendarsRouter from './modules/appointment-calendars/appointment-calendars.router';
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
import pipelinesRouter from './modules/pipelines/pipelines.router';
import { ensureDefaultPipelines } from './modules/pipelines/pipelines.service';
import whatsappRouter from './modules/whatsapp/whatsapp.router';
import { restoreAllSessions } from './modules/whatsapp/whatsapp.service';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './utils/logger';
import prisma from './config/database';
import { eventBus } from './utils/event-bus';
import { startImapPolling } from './utils/imap.service';
import { registerEventListeners, registerV2EventListeners } from './utils/automation.engine';
import { startAutomationCron } from './jobs/automation-cron';
import { startCalendarCron } from './lib/calendar-cron';
import { loadSettingsFromDB } from './modules/settings/settings.service';
import { EmailService } from './lib/email';
import superAdminRouter from './modules/super-admin/super-admin.router';
import teamRouter from './modules/team/team.router';

const app = express();

// Trust the first proxy (required on Render — avoids ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://casaflow.pt',
  'https://www.casaflow.pt',
  'https://casaflow-frontend.onrender.com',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : []),
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow any *.casaflow.pt and *.onrender.com subdomain
      if (/^https:\/\/([a-z0-9-]+\.)?casaflow\.pt$/i.test(origin)) return cb(null, true);
      if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
// ─── Clerk Webhook (raw body required for svix signature verification) ──────
app.post('/webhook/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { Webhook } = await import('svix');
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) { res.status(500).json({ error: 'CLERK_WEBHOOK_SECRET not set' }); return; }

    const wh = new Webhook(secret);
    let evt: any;
    try {
      evt = wh.verify(req.body, {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      });
    } catch {
      res.status(400).json({ error: 'Invalid signature' }); return;
    }

    if (evt.type === 'user.created') {
      const clerkUser = evt.data;
      const email: string | undefined = clerkUser.email_addresses?.[0]?.email_address;
      if (!email) { res.status(200).json({ ok: true }); return; }

      const firstName = clerkUser.first_name || '';
      const lastName = clerkUser.last_name || '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
      const clerkUserId: string = clerkUser.id;

      // Skip super-admin — handled by clerk-exchange.service on first login
      if (email === process.env.SUPER_ADMIN_EMAIL) { res.status(200).json({ ok: true }); return; }

      // Check if user already exists (invited users may have a placeholder)
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Associate clerkUserId if not yet linked
        if (!existing.clerkUserId) {
          await prisma.user.update({ where: { id: existing.id }, data: { clerkUserId, isActive: true } });
        }
        res.status(200).json({ ok: true }); return;
      }

      // Find the default agency to assign new users
      const agency = await prisma.agency.findFirst();

      await prisma.user.create({
        data: {
          name,
          email,
          clerkUserId,
          role: 'AGENCY_OWNER',
          isActive: true,
          onboardingCompleted: false,
          ...(agency ? { agencyId: agency.id } : {}),
        },
      });
      console.log(`[Clerk Webhook] Created AGENCY_OWNER: ${email}`);
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[Clerk Webhook] Error:', err?.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

eventBus.on('whatsapp_qr', (payload: any) => {
  const data = `data: ${JSON.stringify({ type: 'whatsapp_qr', ...payload })}\n\n`
  sseClients.forEach((client) => {
    try { client.write(data) } catch {}
  })
})

eventBus.on('whatsapp_connected', (payload: any) => {
  const data = `data: ${JSON.stringify({ type: 'whatsapp_connected', ...payload })}\n\n`
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

// One-time: seed production DB with agency + users
app.get('/setup-prod', async (_req, res) => {
  try {
    // Ensure agency exists
    let agency = await prisma.agency.findFirst();
    if (!agency) {
      agency = await prisma.agency.create({ data: { name: 'AlphaScale AI', slug: 'alphascale-ai-' + Date.now() } });
    }

    // Ensure geral@alphascaleai.com exists as AGENCY_OWNER
    await prisma.user.upsert({
      where: { email: 'geral@alphascaleai.com' },
      update: { isActive: true },
      create: { name: 'Tiago', email: 'geral@alphascaleai.com', isActive: true, role: 'AGENCY_OWNER', onboardingCompleted: true },
    });

    // Ensure tiagoprado1620tp@gmail.com exists as AGENCY_OWNER
    const tiago = await prisma.user.upsert({
      where: { email: 'tiagoprado1620tp@gmail.com' },
      update: { isActive: true, role: 'AGENCY_OWNER', agencyId: agency.id },
      create: { name: 'Tiago Prado', email: 'tiagoprado1620tp@gmail.com', isActive: true, role: 'AGENCY_OWNER', agencyId: agency.id, onboardingCompleted: true },
    });

    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, isActive: true, clerkUserId: true, agencyId: true } });
    res.json({ ok: true, agencyId: agency.id, tiagoPrado: tiago.id, allUsers: users });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// One-time password reset for geral@alphascaleai.com (safe: bcrypt hash hardcoded, no user input)
app.get('/setup-admin', async (_req, res) => {
  try {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('Tiagoprado12', 10);
    const result = await prisma.user.upsert({
      where: { email: 'geral@alphascaleai.com' },
      update: { passwordHash: hash, isActive: true, role: 'AGENCY_OWNER' as any },
      create: {
        name: 'Tiago',
        email: 'geral@alphascaleai.com',
        passwordHash: hash,
        isActive: true,
        role: 'AGENCY_OWNER' as any,
      },
    });
    res.json({ ok: true, id: result.id, role: result.role });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas tentativas. Aguarde 15 minutos.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => process.env.NODE_ENV !== 'production',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Demasiados pedidos. Aguarde um momento.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
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
app.use('/api/appointment-calendars', appointmentCalendarsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/super-admin', superAdminRouter);
app.use('/api/team', teamRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/search', searchRouter);
app.use('/api/agency', agencyRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/calendar', calendarEventsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/whatsapp', whatsappRouter);

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

  let clientIdentities: string[] = [];
  let voicemailEnabled = false;
  let phoneNumberId: string | null = null;

  try {
    const pn = await prisma.phoneNumber.findFirst({
      where: { number: To, status: 'ACTIVE' },
      include: { user: { select: { id: true, email: true, agencyId: true } } },
    });
    if (pn) {
      phoneNumberId = pn.id;
      voicemailEnabled = pn.voicemailEnabled;
      if (pn.ringAll && pn.user?.agencyId) {
        const agencyUsers = await prisma.user.findMany({
          where: { isActive: true, agencyId: pn.user.agencyId },
          select: { email: true },
        });
        clientIdentities = agencyUsers
          .filter(u => !!u.email)
          .map(u => u.email!.replace(/[^a-zA-Z0-9]/g, '_'));
      } else if (pn.user?.email) {
        clientIdentities = [pn.user.email.replace(/[^a-zA-Z0-9]/g, '_')];
      }
    }
  } catch (err) {
    console.error('[Twilio Inbound Call] routing lookup failed', err);
  }

  // Backwards-compat fallback: no PhoneNumber matched, use first active user
  if (clientIdentities.length === 0) {
    const fallback = await prisma.user.findFirst({
      where: { isActive: true },
      select: { email: true },
    });
    if (fallback?.email) clientIdentities = [fallback.email.replace(/[^a-zA-Z0-9]/g, '_')];
  }

  const publicUrl = process.env.PUBLIC_URL || '';
  const voicemailAction = voicemailEnabled && publicUrl
    ? `${publicUrl}/webhook/twilio/voicemail-complete?phoneNumberId=${phoneNumberId || ''}&from=${encodeURIComponent(From)}`
    : '';

  let twiml: string;
  if (clientIdentities.length > 0) {
    const clientTags = clientIdentities.map(id => `<Client>${id}</Client>`).join('');
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Olá, obrigado por ligar. Aguarde um momento.</Say>
  <Dial timeout="30"${voicemailAction ? ` action="${voicemailAction}"` : ''}>
    ${clientTags}
  </Dial>
  ${voicemailEnabled ? `<Say language="pt-PT">Deixe a sua mensagem após o sinal.</Say>
  <Record maxLength="120" action="${voicemailAction}" playBeep="true"/>` : ''}
</Response>`;
  } else {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-PT">Serviço indisponível. Tente mais tarde.</Say>
</Response>`;
  }
  res.type('text/xml').send(twiml);
});

// ─── Voicemail completion ─────────────────────────────────────────────────────
app.post('/webhook/twilio/voicemail-complete', async (req, res) => {
  res.type('text/xml').send('<Response><Say language="pt-PT">Obrigado. Até breve.</Say></Response>');
  try {
    const { RecordingUrl, RecordingDuration } = req.body || {};
    const { phoneNumberId, from } = req.query as any;
    if (!RecordingUrl || !phoneNumberId) return;
    const pn = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
    if (!pn) return;
    const contact = await prisma.contact.findFirst({ where: { phone: from as string } });
    const fallbackContact = contact
      ? contact.id
      : (await prisma.contact.findFirst({ where: { assignedToId: pn.userId } }))?.id;
    if (!fallbackContact) return;
    await prisma.interaction.create({
      data: {
        type: 'CALL',
        direction: 'INBOUND',
        body: `Voicemail (${RecordingDuration || '?'}s): ${RecordingUrl}`,
        contactId: fallbackContact,
        createdById: pn.userId,
        metadata: JSON.stringify({
          voicemailUrl: RecordingUrl,
          duration: RecordingDuration,
          from,
          to: pn.number,
        }),
      },
    });
  } catch (err) {
    console.error('[Voicemail]', err);
  }
});

// TwiML for outbound calls (browser SDK)
app.post('/webhook/twilio/voice', async (req, res) => {
  const to = req.body.To || ''
  // Resolve callerId: prefer the number associated with this agency/user, fall back to env
  let callerId = process.env.TWILIO_PHONE_NUMBER || ''
  if (!callerId) {
    const pn = await prisma.phoneNumber.findFirst({ where: { status: 'ACTIVE' } })
    if (pn) callerId = pn.number
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}">
    <Number>${to}</Number>
  </Dial>
</Response>`
  res.type('text/xml').send(twiml)
})

// TwiML for browser client calls
app.post('/webhook/twilio/client', async (req, res) => {
  const to = req.body.To
  let callerId = req.body.From || process.env.TWILIO_PHONE_NUMBER || ''
  if (!callerId) {
    const pn = await prisma.phoneNumber.findFirst({ where: { status: 'ACTIVE' } })
    if (pn) callerId = pn.number
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}">
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
  EmailService.verify().catch((err) => console.error('[email] SMTP verify failed:', err.message));

  const server = app.listen(PORT, () => {
    console.log(`CRM Backend running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });

  // Repair WhatsAppSession schema if production drifted (db push silently failed
  // to add `userId`, breaking QR generation with "column ... does not exist").
  // Idempotent — no-op on a healthy DB.
  const fixWhatsAppSchema = async () => {
    const stmts = [
      // Add missing columns (idempotent)
      `ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "agencyId" TEXT`,
      `UPDATE "WhatsAppSession" SET "agencyId" = "id" WHERE "agencyId" IS NULL`,
      `DELETE FROM "WhatsAppSession" WHERE "agencyId" NOT IN (SELECT "id" FROM "Agency")`,
      `ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
      // Drop the old single-column unique index on agencyId — it blocks having both
      // an agency session (userId=NULL) and per-user sessions in the same agency,
      // and causes "Unique constraint failed on ['agencyId']" on every create/update.
      `DROP INDEX IF EXISTS "WhatsAppSession_agencyId_key"`,
      // Add the correct composite + partial unique indexes
      `CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_agencyId_userId_key" ON "WhatsAppSession"("agencyId", "userId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_agencyId_shared_key" ON "WhatsAppSession"("agencyId") WHERE "userId" IS NULL`,
    ];
    for (const sql of stmts) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log('[WA-fix] OK:', sql.slice(0, 80));
      } catch (e: any) {
        console.error('[WA-fix] FAIL:', sql.slice(0, 80), '|', e?.message || e);
      }
    }
  };

  // Load persisted settings from DB before starting background services.
  // Done outside the listen callback so async errors are properly catchable.
  loadSettingsFromDB()
    .then(async () => {
      await fixWhatsAppSchema();
      await ensureDefaultPipelines();
      startImapPolling();
      registerEventListeners();
      registerV2EventListeners();
      startAutomationCron();
      startCalendarCron();
      restoreAllSessions().catch(() => {});
    })
    .catch((err) => {
      console.error('[Boot] Fatal error loading settings from DB:', err);
      server.close(() => process.exit(1));
    });
}

export default app;
