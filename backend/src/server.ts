import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

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
import settingsRouter from './modules/settings/settings.router';
import callsRouter from './modules/calls/calls.router';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map(u => u.trim())
      : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
          for (const msg of value?.messages || []) {
            const from = msg.from; // phone number
            const text = msg.text?.body || '[media message]';
            const externalId = msg.id;

            const { receiveInbound } = await import('./modules/conversations/conversations.service');
            await receiveInbound(
              'WHATSAPP',
              from,
              text,
              JSON.stringify({ messageId: externalId })
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

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
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

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/calls', callsRouter);

// ─── Twilio Webhooks ─────────────────────────────────────────────────────────

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

// Call status updates
app.post('/webhook/twilio/status', async (req, res) => {
  res.status(200).send('ok')
  const { CallSid, CallStatus, CallDuration } = req.body
  console.log(`[Twilio] Call ${CallSid}: ${CallStatus}, duration: ${CallDuration}s`)
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', status: 404 });
});

// Global error handler
app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
