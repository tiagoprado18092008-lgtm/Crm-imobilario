# Telefonia completa — Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable full phone telephony in the CRM — make/receive calls from the browser, auto-configure Twilio, verify personal numbers as caller IDs, with a global floating dialer widget and a call history page.

**Architecture:** Backend extends existing `phone-numbers` and `calls` modules. Frontend gets a new global `CallWidget` (Zustand-managed), a new `CallsPage`, and a new aba in `PhoneNumbersPage` for external verified numbers. Twilio Voice SDK (`@twilio/voice-sdk`) handles browser audio. Inbound routing reads `PhoneNumber` to find the owner (optionally ring-all).

**Tech Stack:** Express + Prisma (PostgreSQL), React + TypeScript + Vite, Zustand, Twilio SDK (node + voice web), Jest for tests. Spec: [2026-04-19-telefonia-completa-design.md](../specs/2026-04-19-telefonia-completa-design.md).

---

## File Structure

**Backend:**
- Modify: `backend/prisma/schema.prisma` — `PhoneNumber` gets `source`, `ringAll`, `voicemailEnabled`, nullable `twilioSid`
- Create: `backend/prisma/migrations/<timestamp>_phone_number_external_and_routing/migration.sql`
- Modify: `backend/src/modules/phone-numbers/phone-numbers.service.ts` — add `autoProvisionTwilio`, `verifyPersonalNumber`, `confirmPersonalNumber`, `updateRoutingSettings`
- Modify: `backend/src/modules/phone-numbers/phone-numbers.controller.ts` — controllers for the new endpoints
- Modify: `backend/src/modules/phone-numbers/phone-numbers.router.ts` — routes
- Modify: `backend/src/modules/calls/calls.service.ts` — extend `initiateCall` with `fromNumberId`; extend `listCalls` with metadata
- Modify: `backend/src/utils/twilio.service.ts` — accept `fromNumber` parameter in `makeOutboundCall`
- Modify: `backend/src/server.ts` — inbound-call webhook reads `PhoneNumber`, adds voicemail TwiML, new `/webhook/twilio/voicemail-complete` endpoint
- Create: `backend/src/__tests__/phone-numbers.test.ts` — unit tests for new service functions
- Create: `backend/src/__tests__/calls-routing.test.ts` — tests for `fromNumberId` and route auth

**Frontend:**
- Modify: `frontend/package.json` — add `@twilio/voice-sdk`
- Create: `frontend/src/store/call.store.ts` — global Zustand store for calls
- Create: `frontend/src/components/CallWidget/CallWidget.tsx` — floating FAB + dialer
- Create: `frontend/src/components/CallWidget/IncomingCallModal.tsx` — popup
- Create: `frontend/src/components/CallWidget/ActiveCallPanel.tsx` — active call UI
- Create: `frontend/src/components/CallWidget/useTwilioDevice.ts` — hook to init/destroy Device
- Modify: `frontend/src/App.tsx` — mount `<CallWidget />` inside authenticated layout
- Create: `frontend/src/pages/CallsPage.tsx` — history table
- Modify: `frontend/src/pages/PhoneNumbersPage.tsx` — "Números externos" tab + ringAll/voicemail toggles
- Modify: `frontend/src/pages/ContactDetailPage.tsx` — "Ligar" button uses callStore
- Modify: `frontend/src/api/calls.api.ts` — add endpoints
- Modify: `frontend/src/api/phone-numbers.api.ts` — add `autoProvision`, `verifyPersonal`, `confirmPersonal`, `updateRouting`
- Modify: `frontend/src/App.tsx` — add `/calls` route
- Modify: `frontend/src/components/layout/AppShell.tsx` — add sidebar link to `/calls` (if sidebar nav is used here)

---

## Ground Rules for the Executing Engineer

- Run backend tests with `cd backend && npm test` (Jest). Run specific file with `npm test -- <file>`.
- Frontend has no test suite configured — for frontend tasks, verify by building (`cd frontend && npm run build`) and a checklist of manual browser steps at the end.
- Commit after every task that passes tests/build. Use `feat:`, `fix:`, `refactor:` prefixes consistent with the repo.
- Backend uses `prisma` client from `backend/src/config/database.ts` — always import from there, never instantiate.
- Frontend uses axios via `frontend/src/api/client.ts` with auth header pre-configured.
- All Portuguese-user-facing strings use pt-PT. Code/identifiers in English.
- Per user's deploy memory: after each task group's commit, `git push origin master`.

---

## Task 1: Prisma schema — extend PhoneNumber

**Files:**
- Modify: `backend/prisma/schema.prisma` (lines 485-501)
- Create: `backend/prisma/migrations/<timestamp>_phone_number_external_and_routing/migration.sql`

- [ ] **Step 1: Update schema**

Replace the `PhoneNumber` model in `backend/prisma/schema.prisma` with:

```prisma
model PhoneNumber {
  id           String  @id @default(cuid())
  number       String  @unique
  friendlyName String?
  twilioSid    String?
  status       String  @default("ACTIVE") // ACTIVE, RELEASED
  countryCode  String
  numberType   String  @default("LOCAL") // LOCAL, TOLLFREE, MOBILE
  capabilities String  @default("{\"voice\":true,\"sms\":true}")
  monthlyPrice Float   @default(1.15)
  source       String  @default("TWILIO") // TWILIO, EXTERNAL_VERIFIED
  ringAll      Boolean @default(false)
  voicemailEnabled Boolean @default(true)

  userId String
  user   User   @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate migration**

Run from `backend/`:
```bash
npx prisma migrate dev --name phone_number_external_and_routing
```
Expected: new migration file created; `twilioSid` becomes nullable; three new columns added with defaults.

- [ ] **Step 3: Verify by inspecting the generated SQL**

Open the new `migration.sql`. Confirm it contains:
- `ALTER COLUMN "twilioSid" DROP NOT NULL`
- `ADD COLUMN "source" TEXT NOT NULL DEFAULT 'TWILIO'`
- `ADD COLUMN "ringAll" BOOLEAN NOT NULL DEFAULT false`
- `ADD COLUMN "voicemailEnabled" BOOLEAN NOT NULL DEFAULT true`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): extend PhoneNumber with source, ringAll, voicemailEnabled"
```

---

## Task 2: Backend service — autoProvisionTwilio

**Files:**
- Modify: `backend/src/modules/phone-numbers/phone-numbers.service.ts`
- Create: `backend/src/__tests__/phone-numbers.test.ts`

- [ ] **Step 1: Write failing test**

Create `backend/src/__tests__/phone-numbers.test.ts`:

```ts
import * as service from '../modules/phone-numbers/phone-numbers.service';

jest.mock('twilio', () => {
  const mApps = { list: jest.fn(), create: jest.fn() };
  const mKeys = { list: jest.fn(), create: jest.fn() };
  const mClient = { applications: mApps, newKeys: mKeys, api: { accounts: () => ({ fetch: jest.fn().mockResolvedValue({ sid: 'AC123' }) }) } };
  const fn: any = jest.fn(() => mClient);
  fn.__mock = { mApps, mKeys, mClient };
  return fn;
});

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    systemSettings: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

const twilio = require('twilio');

describe('autoProvisionTwilio', () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.PUBLIC_URL = 'https://crm.example.com';
    twilio.__mock.mApps.list.mockReset();
    twilio.__mock.mApps.create.mockReset();
    twilio.__mock.mKeys.list.mockReset();
    twilio.__mock.mKeys.create.mockReset();
  });

  it('creates new TwiML App and API Key when none exist', async () => {
    twilio.__mock.mApps.list.mockResolvedValue([]);
    twilio.__mock.mApps.create.mockResolvedValue({ sid: 'APxxx' });
    twilio.__mock.mKeys.list.mockResolvedValue([]);
    twilio.__mock.mKeys.create.mockResolvedValue({ sid: 'SKxxx', secret: 'secret' });

    const result = await service.autoProvisionTwilio();

    expect(twilio.__mock.mApps.create).toHaveBeenCalledWith(expect.objectContaining({
      friendlyName: 'CRM Voice',
      voiceUrl: 'https://crm.example.com/webhook/twilio/client',
      voiceMethod: 'POST',
    }));
    expect(result.twimlAppSid).toBe('APxxx');
    expect(result.apiKey).toBe('SKxxx');
  });

  it('reuses existing TwiML App with friendlyName CRM Voice', async () => {
    twilio.__mock.mApps.list.mockResolvedValue([{ sid: 'APexist', friendlyName: 'CRM Voice' }]);
    twilio.__mock.mKeys.list.mockResolvedValue([]);
    twilio.__mock.mKeys.create.mockResolvedValue({ sid: 'SKxxx', secret: 'secret' });

    const result = await service.autoProvisionTwilio();

    expect(twilio.__mock.mApps.create).not.toHaveBeenCalled();
    expect(result.twimlAppSid).toBe('APexist');
  });

  it('throws if PUBLIC_URL missing', async () => {
    delete process.env.PUBLIC_URL;
    await expect(service.autoProvisionTwilio()).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('PUBLIC_URL'),
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd backend && npm test -- phone-numbers.test.ts
```
Expected: FAIL with "autoProvisionTwilio is not a function".

- [ ] **Step 3: Implement autoProvisionTwilio**

Add to `backend/src/modules/phone-numbers/phone-numbers.service.ts` (after existing `getClient`):

```ts
export const autoProvisionTwilio = async () => {
  const client = getClient();
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) {
    throw Object.assign(
      new Error('Define PUBLIC_URL nas Definições antes de fazer o setup automático.'),
      { status: 400 }
    );
  }

  // 1. TwiML App — reuse or create
  const apps = await client.applications.list({ limit: 50 });
  let twimlApp = apps.find((a: any) => a.friendlyName === 'CRM Voice');
  if (!twimlApp) {
    twimlApp = await client.applications.create({
      friendlyName: 'CRM Voice',
      voiceUrl: `${publicUrl}/webhook/twilio/client`,
      voiceMethod: 'POST',
    });
  }

  // 2. API Key — always create new (can't read secret of existing key)
  const keys = await client.newKeys.list({ limit: 50 });
  const existing = keys.find((k: any) => k.friendlyName === 'CRM Voice Key');
  let apiKey: any;
  if (existing) {
    // Can't recover secret — must create a fresh one
    apiKey = await client.newKeys.create({ friendlyName: `CRM Voice Key ${Date.now()}` });
  } else {
    apiKey = await client.newKeys.create({ friendlyName: 'CRM Voice Key' });
  }

  // 3. Persist
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_TWIML_APP_SID' },
    update: { value: twimlApp.sid },
    create: { key: 'TWILIO_TWIML_APP_SID', value: twimlApp.sid },
  });
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_API_KEY' },
    update: { value: apiKey.sid },
    create: { key: 'TWILIO_API_KEY', value: apiKey.sid },
  });
  await prisma.systemSettings.upsert({
    where: { key: 'TWILIO_API_SECRET' },
    update: { value: apiKey.secret },
    create: { key: 'TWILIO_API_SECRET', value: apiKey.secret },
  });
  process.env.TWILIO_TWIML_APP_SID = twimlApp.sid;
  process.env.TWILIO_API_KEY = apiKey.sid;
  process.env.TWILIO_API_SECRET = apiKey.secret;

  return {
    twimlAppSid: twimlApp.sid,
    apiKey: apiKey.sid,
  };
};
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npm test -- phone-numbers.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/phone-numbers/phone-numbers.service.ts backend/src/__tests__/phone-numbers.test.ts
git commit -m "feat(phone-numbers): auto-provision Twilio TwiML App and API Keys"
```

---

## Task 3: Backend service — verifyPersonalNumber / confirmPersonalNumber

**Files:**
- Modify: `backend/src/modules/phone-numbers/phone-numbers.service.ts`
- Modify: `backend/src/__tests__/phone-numbers.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `backend/src/__tests__/phone-numbers.test.ts`:

```ts
describe('verifyPersonalNumber', () => {
  beforeEach(() => {
    (twilio.__mock.mClient as any).validationRequests = { create: jest.fn() };
  });

  it('rejects invalid E.164 number', async () => {
    await expect(service.verifyPersonalNumber('user1', '12345', 'sms')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('calls Twilio validationRequests.create with a valid number', async () => {
    (twilio.__mock.mClient as any).validationRequests.create.mockResolvedValue({
      validationCode: '123456',
      friendlyName: '+351912345678',
    });
    const result = await service.verifyPersonalNumber('user1', '+351912345678', 'sms');
    expect(result.validationCode).toBe('123456');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend && npm test -- phone-numbers.test.ts
```
Expected: FAIL with "verifyPersonalNumber is not a function".

- [ ] **Step 3: Implement**

Append to `backend/src/modules/phone-numbers/phone-numbers.service.ts`:

```ts
const E164 = /^\+[1-9]\d{6,14}$/;

export const verifyPersonalNumber = async (
  _userId: string,
  phoneNumber: string,
  channel: 'sms' | 'call' = 'call'
) => {
  if (!E164.test(phoneNumber)) {
    throw Object.assign(
      new Error('Número inválido. Usa o formato internacional, ex: +351912345678'),
      { status: 400 }
    );
  }
  const client = getClient();
  const req = await (client as any).validationRequests.create({
    phoneNumber,
    friendlyName: phoneNumber,
    callDelay: channel === 'call' ? 5 : undefined,
  });
  return { validationCode: req.validationCode, phoneNumber: req.phoneNumber };
};

export const confirmPersonalNumber = async (
  userId: string,
  phoneNumber: string,
  friendlyName?: string
) => {
  if (!E164.test(phoneNumber)) {
    throw Object.assign(new Error('Número inválido.'), { status: 400 });
  }
  const client = getClient();
  // Twilio Outgoing Caller IDs list — if number is there, it's verified
  const outgoing = await (client as any).outgoingCallerIds.list({ phoneNumber, limit: 5 });
  if (outgoing.length === 0) {
    throw Object.assign(
      new Error('Número ainda não verificado. Confirma o código recebido e tenta de novo.'),
      { status: 400 }
    );
  }
  // Avoid duplicates
  const existing = await prisma.phoneNumber.findUnique({ where: { number: phoneNumber } });
  if (existing) {
    return prisma.phoneNumber.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', source: 'EXTERNAL_VERIFIED', friendlyName: friendlyName || existing.friendlyName },
    });
  }
  return prisma.phoneNumber.create({
    data: {
      number: phoneNumber,
      friendlyName: friendlyName || phoneNumber,
      twilioSid: null,
      status: 'ACTIVE',
      countryCode: phoneNumber.substring(1, 3),
      numberType: 'LOCAL',
      capabilities: JSON.stringify({ voice: true, sms: false }),
      monthlyPrice: 0,
      source: 'EXTERNAL_VERIFIED',
      user: { connect: { id: userId } },
    },
  });
};
```

Also extend the prisma mock in the test file top-matter to include `phoneNumber`:

```ts
// Update the mock at top of phone-numbers.test.ts:
jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    systemSettings: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    phoneNumber: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pn1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pn1', ...data })),
    },
  },
}));
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npm test -- phone-numbers.test.ts
```
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/phone-numbers/phone-numbers.service.ts backend/src/__tests__/phone-numbers.test.ts
git commit -m "feat(phone-numbers): verify and confirm external personal caller IDs"
```

---

## Task 4: Backend service — updateRoutingSettings

**Files:**
- Modify: `backend/src/modules/phone-numbers/phone-numbers.service.ts`

- [ ] **Step 1: Add failing test**

Append to `backend/src/__tests__/phone-numbers.test.ts`:

```ts
describe('updateRoutingSettings', () => {
  it('updates ringAll and voicemailEnabled for a user-owned number', async () => {
    const pn = require('../config/database').default.phoneNumber;
    pn.findFirst = jest.fn().mockResolvedValue({ id: 'pn1', userId: 'user1' });
    pn.update = jest.fn().mockResolvedValue({ id: 'pn1', ringAll: true, voicemailEnabled: false });

    const result = await service.updateRoutingSettings('pn1', 'user1', { ringAll: true, voicemailEnabled: false });
    expect(result.ringAll).toBe(true);
    expect(pn.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pn1' },
      data: { ringAll: true, voicemailEnabled: false },
    }));
  });
});
```

- [ ] **Step 2: Implement**

Append to `phone-numbers.service.ts`:

```ts
export const updateRoutingSettings = async (
  id: string,
  userId: string,
  updates: { ringAll?: boolean; voicemailEnabled?: boolean }
) => {
  const num = await prisma.phoneNumber.findFirst({ where: { id, userId } });
  if (!num) throw Object.assign(new Error('Número não encontrado'), { status: 404 });
  return prisma.phoneNumber.update({ where: { id }, data: updates });
};
```

- [ ] **Step 3: Run tests + commit**

```bash
cd backend && npm test -- phone-numbers.test.ts
git add backend/src/modules/phone-numbers/phone-numbers.service.ts backend/src/__tests__/phone-numbers.test.ts
git commit -m "feat(phone-numbers): update routing settings (ringAll, voicemailEnabled)"
```

---

## Task 5: Backend controllers + routes for new service functions

**Files:**
- Modify: `backend/src/modules/phone-numbers/phone-numbers.controller.ts`
- Modify: `backend/src/modules/phone-numbers/phone-numbers.router.ts`

- [ ] **Step 1: Extend controller**

Append to `backend/src/modules/phone-numbers/phone-numbers.controller.ts`:

```ts
export const autoProvision = async (_req: Request, res: Response) => {
  try {
    const result = await service.autoProvisionTwilio();
    res.json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const verifyPersonal = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, channel } = req.body;
    const result = await service.verifyPersonalNumber((req as any).user.id, phoneNumber, channel);
    res.json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const confirmPersonal = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    const result = await service.confirmPersonalNumber((req as any).user.id, phoneNumber, friendlyName);
    res.status(201).json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};

export const updateRouting = async (req: Request, res: Response) => {
  try {
    const { ringAll, voicemailEnabled } = req.body;
    const result = await service.updateRoutingSettings(req.params.id, (req as any).user.id, {
      ringAll, voicemailEnabled,
    });
    res.json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
};
```

- [ ] **Step 2: Extend router**

Replace `backend/src/modules/phone-numbers/phone-numbers.router.ts` body with:

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './phone-numbers.controller';

const router = Router();
router.use(authenticate);

router.get('/search', ctrl.search);
router.get('/', ctrl.list);
router.post('/payment-intent', ctrl.createPaymentIntent);
router.post('/', ctrl.purchase);
router.post('/auto-provision', ctrl.autoProvision);
router.post('/verify-personal', ctrl.verifyPersonal);
router.post('/confirm-personal', ctrl.confirmPersonal);
router.patch('/:id/routing', ctrl.updateRouting);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.release);

export default router;
```

- [ ] **Step 3: Sanity test — auth check**

Add to `backend/src/__tests__/api.test.ts` inside the describe block:

```ts
it('POST /api/phone-numbers/auto-provision should return 401 without token', async () => {
  const res = await request(app).post('/api/phone-numbers/auto-provision');
  expect(res.status).toBe(401);
});

it('POST /api/phone-numbers/verify-personal should return 401 without token', async () => {
  const res = await request(app).post('/api/phone-numbers/verify-personal').send({});
  expect(res.status).toBe(401);
});
```

Run:
```bash
cd backend && npm test -- api.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/phone-numbers/phone-numbers.controller.ts backend/src/modules/phone-numbers/phone-numbers.router.ts backend/src/__tests__/api.test.ts
git commit -m "feat(phone-numbers): expose auto-provision, verify-personal, routing endpoints"
```

---

## Task 6: Backend — extend calls.service with fromNumberId

**Files:**
- Modify: `backend/src/utils/twilio.service.ts`
- Modify: `backend/src/modules/calls/calls.service.ts`
- Create: `backend/src/__tests__/calls-routing.test.ts`

- [ ] **Step 1: Write failing test**

Create `backend/src/__tests__/calls-routing.test.ts`:

```ts
import * as callsService from '../modules/calls/calls.service';

jest.mock('../utils/twilio.service', () => ({
  generateTwilioToken: jest.fn().mockReturnValue('tok'),
  isTwilioConfigured: jest.fn().mockReturnValue(true),
  makeOutboundCall: jest.fn().mockResolvedValue({ sid: 'CA1', status: 'queued' }),
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }) },
    phoneNumber: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    interaction: { create: jest.fn().mockResolvedValue({ id: 'i1' }) },
  },
}));

const twilio = require('../utils/twilio.service');
const db = require('../config/database').default;

describe('initiateCall with fromNumberId', () => {
  beforeEach(() => {
    twilio.makeOutboundCall.mockClear();
    db.phoneNumber.findFirst.mockReset();
  });

  it('uses PhoneNumber.number as callerId when fromNumberId provided', async () => {
    db.phoneNumber.findFirst.mockResolvedValue({ id: 'pn1', number: '+351910000000', userId: 'u1' });
    await callsService.initiateCall({ to: '+351911111111', userId: 'u1', fromNumberId: 'pn1' });
    expect(twilio.makeOutboundCall).toHaveBeenCalledWith('+351911111111', '+351910000000');
  });

  it('falls back to env TWILIO_PHONE_NUMBER when fromNumberId not provided', async () => {
    await callsService.initiateCall({ to: '+351911111111', userId: 'u1' });
    expect(twilio.makeOutboundCall).toHaveBeenCalledWith('+351911111111', undefined);
  });

  it('rejects when fromNumberId does not belong to user', async () => {
    db.phoneNumber.findFirst.mockResolvedValue(null);
    await expect(
      callsService.initiateCall({ to: '+351911111111', userId: 'u1', fromNumberId: 'other' })
    ).rejects.toMatchObject({ status: 403 });
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd backend && npm test -- calls-routing.test.ts
```
Expected: FAIL (signature doesn't accept fromNumberId).

- [ ] **Step 3: Update twilio.service.ts**

In `backend/src/utils/twilio.service.ts`, replace `makeOutboundCall` with:

```ts
export async function makeOutboundCall(
  to: string,
  from?: string
): Promise<{ sid: string; status: string }> {
  if (!isTwilioConfigured()) {
    console.log(`[Twilio SIM] Calling ${to} from ${from || process.env.TWILIO_PHONE_NUMBER}`)
    return { sid: `sim_call_${Date.now()}`, status: 'queued' }
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const call = await client.calls.create({
    to,
    from: from || process.env.TWILIO_PHONE_NUMBER!,
    url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/webhook/twilio/voice`,
    statusCallback: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/webhook/twilio/status`,
    statusCallbackMethod: 'POST',
  })

  return { sid: call.sid, status: call.status }
}
```
(Signature stays the same — already accepts `from`. No change needed here if already present. Re-verify the file.)

- [ ] **Step 4: Update calls.service.ts**

Replace `initiateCall` in `backend/src/modules/calls/calls.service.ts` with:

```ts
export async function initiateCall(opts: {
  to: string
  contactId?: string
  opportunityId?: string
  userId: string
  fromNumberId?: string
}): Promise<any> {
  let fromNumber: string | undefined = undefined
  if (opts.fromNumberId) {
    const pn = await prisma.phoneNumber.findFirst({
      where: { id: opts.fromNumberId, userId: opts.userId, status: 'ACTIVE' },
    })
    if (!pn) {
      throw Object.assign(new Error('Número de origem não encontrado ou não pertence a ti'), { status: 403 })
    }
    fromNumber = pn.number
  }

  const result = await makeOutboundCall(opts.to, fromNumber)

  let contactId = opts.contactId
  if (!contactId) {
    contactId = await getDefaultContact(opts.userId)
  }

  if (!contactId) {
    return { ...result, interactionId: null }
  }

  const interaction = await prisma.interaction.create({
    data: {
      type: 'CALL',
      body: `Chamada para ${opts.to} | SID: ${result.sid} | Status: ${result.status}`,
      direction: 'OUTBOUND',
      contactId,
      createdById: opts.userId,
      opportunityId: opts.opportunityId,
      metadata: JSON.stringify({
        sid: result.sid,
        status: result.status,
        fromNumber: fromNumber || process.env.TWILIO_PHONE_NUMBER,
        toNumber: opts.to,
      }),
    },
  })

  return { ...result, interactionId: interaction.id }
}
```

Also update the controller to pass `fromNumberId`. In `backend/src/modules/calls/calls.controller.ts`, find `initiate` and add `fromNumberId`:

```ts
export const initiate = async (req: Request, res: Response) => {
  try {
    const { to, contactId, opportunityId, fromNumberId } = req.body
    const result = await callsService.initiateCall({
      to, contactId, opportunityId, fromNumberId,
      userId: (req as any).user.id,
    })
    res.status(201).json(result)
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }) }
}
```

Read the existing `calls.controller.ts` first to confirm the exact function signature before editing.

- [ ] **Step 5: Run tests**

```bash
cd backend && npm test -- calls-routing.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/calls/ backend/src/utils/twilio.service.ts backend/src/__tests__/calls-routing.test.ts
git commit -m "feat(calls): accept fromNumberId to use a specific number as caller ID"
```

---

## Task 7: Backend — inbound routing by PhoneNumber

**Files:**
- Modify: `backend/src/server.ts` (the `/webhook/twilio/inbound-call` handler around lines 389-427)

- [ ] **Step 1: Replace the inbound-call handler**

In `backend/src/server.ts`, find `app.post('/webhook/twilio/inbound-call', ...)` and replace the whole handler with:

```ts
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
      include: { user: { select: { id: true, email: true } } },
    });
    if (pn) {
      phoneNumberId = pn.id;
      voicemailEnabled = pn.voicemailEnabled;
      if (pn.ringAll) {
        const users = await prisma.user.findMany({
          where: { isActive: true, agencyId: pn.user ? (await prisma.user.findUnique({ where: { id: pn.userId } }))?.agencyId : undefined },
          select: { email: true },
        });
        clientIdentities = users
          .filter(u => u.email)
          .map(u => u.email!.replace(/[^a-zA-Z0-9]/g, '_'));
      } else if (pn.user?.email) {
        clientIdentities = [pn.user.email.replace(/[^a-zA-Z0-9]/g, '_')];
      }
    }
  } catch (err) {
    console.error('[Twilio Inbound Call] routing lookup failed', err);
  }

  // Fallback to first active user if no PhoneNumber matched (backwards compat)
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
```

- [ ] **Step 2: Add voicemail completion handler**

In `backend/src/server.ts`, just after the inbound-call handler, add:

```ts
app.post('/webhook/twilio/voicemail-complete', async (req, res) => {
  res.type('text/xml').send('<Response><Say language="pt-PT">Obrigado. Até breve.</Say></Response>');
  try {
    const { RecordingUrl, RecordingDuration } = req.body;
    const { phoneNumberId, from } = req.query as any;
    if (!RecordingUrl || !phoneNumberId) return;
    const pn = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
    if (!pn) return;
    // find contact by from number
    const contact = await prisma.contact.findFirst({ where: { phone: from as string } });
    await prisma.interaction.create({
      data: {
        type: 'CALL',
        direction: 'INBOUND',
        body: `Voicemail (${RecordingDuration}s): ${RecordingUrl}`,
        contactId: contact?.id || (await prisma.contact.findFirst({ where: { assignedToId: pn.userId } }))?.id || '',
        createdById: pn.userId,
        metadata: JSON.stringify({ voicemailUrl: RecordingUrl, duration: RecordingDuration, from, to: pn.number }),
      },
    });
  } catch (err) {
    console.error('[Voicemail]', err);
  }
});
```

- [ ] **Step 3: Smoke-test the code compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat(twilio): inbound routing reads PhoneNumber owner with ring-all and voicemail"
```

---

## Task 8: Backend — client.ts webhook respects From parameter

**Files:**
- Modify: `backend/src/server.ts` (the `/webhook/twilio/client` handler ~line 441)

Background: when the browser Device dials out, Twilio POSTs to `/webhook/twilio/client`. The current TwiML uses `process.env.TWILIO_PHONE_NUMBER` as callerId. We need to accept `From` from the request and use that instead, falling back to the env var.

- [ ] **Step 1: Replace the handler**

In `backend/src/server.ts`, replace `app.post('/webhook/twilio/client', ...)` with:

```ts
app.post('/webhook/twilio/client', (req, res) => {
  const to = req.body.To;
  const from = req.body.From || process.env.TWILIO_PHONE_NUMBER || '';
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${from}">
    ${to?.startsWith('client:') ? `<Client>${to.replace('client:', '')}</Client>` : `<Number>${to}</Number>`}
  </Dial>
</Response>`
  res.type('text/xml').send(twiml)
})
```

- [ ] **Step 2: Compile check + commit**

```bash
cd backend && npx tsc --noEmit
git add backend/src/server.ts
git commit -m "fix(twilio): client webhook uses From parameter as callerId when provided"
```

---

## Task 9: Deploy backend changes

**Files:**
- None (uses existing deploy flow from repo memory: `git push origin master`)

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && npm test
```
Expected: all existing tests plus new ones PASS.

- [ ] **Step 2: Push**

```bash
git push origin master
```

Expected: Render/Railway auto-deploys. Wait until backend is up (check `/api/health`).

---

## Task 10: Frontend — install Twilio Voice SDK

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install**

```bash
cd frontend && npm install @twilio/voice-sdk
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): install @twilio/voice-sdk for browser calls"
```

---

## Task 11: Frontend — call store

**Files:**
- Create: `frontend/src/store/call.store.ts`

- [ ] **Step 1: Create the store**

```ts
import { create } from 'zustand'
import type { Device, Call } from '@twilio/voice-sdk'

export type CallStatus = 'idle' | 'connecting' | 'active' | 'incoming'

interface CallState {
  device: Device | null
  status: CallStatus
  activeCall: Call | null
  incomingCall: Call | null
  dialerOpen: boolean
  prefillNumber: string
  prefillContactId: string | null
  fromNumberId: string | null
  error: string | null

  setDevice: (d: Device | null) => void
  setStatus: (s: CallStatus) => void
  setActiveCall: (c: Call | null) => void
  setIncomingCall: (c: Call | null) => void
  openDialer: (number?: string, contactId?: string) => void
  closeDialer: () => void
  setFromNumberId: (id: string | null) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useCallStore = create<CallState>((set) => ({
  device: null,
  status: 'idle',
  activeCall: null,
  incomingCall: null,
  dialerOpen: false,
  prefillNumber: '',
  prefillContactId: null,
  fromNumberId: null,
  error: null,

  setDevice: (device) => set({ device }),
  setStatus: (status) => set({ status }),
  setActiveCall: (activeCall) => set({ activeCall, status: activeCall ? 'active' : 'idle' }),
  setIncomingCall: (incomingCall) => set({ incomingCall, status: incomingCall ? 'incoming' : 'idle' }),
  openDialer: (number, contactId) => set({
    dialerOpen: true,
    prefillNumber: number || '',
    prefillContactId: contactId || null,
  }),
  closeDialer: () => set({ dialerOpen: false }),
  setFromNumberId: (fromNumberId) => set({ fromNumberId }),
  setError: (error) => set({ error }),
  reset: () => set({
    device: null, status: 'idle', activeCall: null, incomingCall: null,
    dialerOpen: false, prefillNumber: '', prefillContactId: null, fromNumberId: null, error: null,
  }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/call.store.ts
git commit -m "feat(frontend): zustand call store for global telephony state"
```

---

## Task 12: Frontend — useTwilioDevice hook

**Files:**
- Create: `frontend/src/components/CallWidget/useTwilioDevice.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useRef } from 'react'
import { Device } from '@twilio/voice-sdk'
import { useCallStore } from '../../store/call.store'
import { getCallToken } from '../../api/calls.api'
import { useAuthStore } from '../../store/auth.store'

export function useTwilioDevice() {
  const { user } = useAuthStore()
  const { setDevice, setIncomingCall, setActiveCall, setError } = useCallStore()
  const refreshTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    let device: Device | null = null
    let cancelled = false

    const init = async () => {
      try {
        const res = await getCallToken()
        if (cancelled) return
        if (!res.data?.configured || !res.data?.token) {
          return // twilio not configured — silently do nothing
        }
        device = new Device(res.data.token, {
          logLevel: 1,
          codecPreferences: ['opus' as any, 'pcmu' as any],
        })

        device.on('registered', () => { /* ready */ })
        device.on('error', (e: Error) => { setError(e.message) })
        device.on('incoming', (call: any) => { setIncomingCall(call) })

        await device.register()
        if (!cancelled) setDevice(device)

        // refresh token ~55min
        refreshTimer.current = window.setInterval(async () => {
          try {
            const r = await getCallToken()
            if (r.data?.token && device) device.updateToken(r.data.token)
          } catch { /* noop */ }
        }, 55 * 60 * 1000)
      } catch (err: any) {
        setError(err?.message || 'Erro a iniciar o telefone')
      }
    }

    init()

    return () => {
      cancelled = true
      if (refreshTimer.current) window.clearInterval(refreshTimer.current)
      if (device) {
        try { device.destroy() } catch { /* noop */ }
      }
      setDevice(null)
      setActiveCall(null)
      setIncomingCall(null)
    }
  }, [user, setDevice, setIncomingCall, setActiveCall, setError])
}
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CallWidget/useTwilioDevice.ts
git commit -m "feat(frontend): useTwilioDevice hook — init, incoming events, token refresh"
```

---

## Task 13: Frontend — API client helpers

**Files:**
- Modify: `frontend/src/api/phone-numbers.api.ts`
- Modify: `frontend/src/api/calls.api.ts`

- [ ] **Step 1: Replace phone-numbers.api.ts**

```ts
import api from './client';

export const searchNumbers = (country: string, areaCode?: string, type?: string) =>
  api.get('/phone-numbers/search', { params: { country, areaCode, type } });

export const listNumbers = () => api.get('/phone-numbers');
export const createPaymentIntent = (phoneNumber: string, monthlyPrice: number) =>
  api.post('/phone-numbers/payment-intent', { phoneNumber, monthlyPrice });
export const purchaseNumber = (phoneNumber: string, friendlyName?: string) =>
  api.post('/phone-numbers', { phoneNumber, friendlyName });
export const releaseNumber = (id: string) => api.delete(`/phone-numbers/${id}`);
export const updateNumber = (id: string, friendlyName: string) =>
  api.patch(`/phone-numbers/${id}`, { friendlyName });

export const autoProvisionTwilio = () => api.post('/phone-numbers/auto-provision');
export const verifyPersonalNumber = (phoneNumber: string, channel: 'sms' | 'call' = 'call') =>
  api.post('/phone-numbers/verify-personal', { phoneNumber, channel });
export const confirmPersonalNumber = (phoneNumber: string, friendlyName?: string) =>
  api.post('/phone-numbers/confirm-personal', { phoneNumber, friendlyName });
export const updateRouting = (id: string, updates: { ringAll?: boolean; voicemailEnabled?: boolean }) =>
  api.patch(`/phone-numbers/${id}/routing`, updates);
```

- [ ] **Step 2: Replace calls.api.ts**

```ts
import api from './client'

export const getCallToken = () => api.get('/calls/token')
export const initiateCall = (data: { to: string; contactId?: string; opportunityId?: string; fromNumberId?: string }) =>
  api.post('/calls', data)
export const getCalls = (params?: any) => api.get('/calls', { params })
export const updateCallNotes = (id: string, notes: string) =>
  api.patch(`/calls/${id}`, { notes })
```

- [ ] **Step 3: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/api/phone-numbers.api.ts frontend/src/api/calls.api.ts
git commit -m "feat(frontend): api helpers for auto-provision, verify personal, routing, fromNumberId"
```

---

## Task 14: Frontend — IncomingCallModal

**Files:**
- Create: `frontend/src/components/CallWidget/IncomingCallModal.tsx`

- [ ] **Step 1: Create component**

```tsx
import React from 'react'
import { Phone, PhoneOff } from 'lucide-react'
import { useCallStore } from '../../store/call.store'

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, setIncomingCall, setActiveCall } = useCallStore()

  if (!incomingCall) return null

  const caller = (incomingCall as any).parameters?.From || 'Desconhecido'

  const accept = () => {
    try {
      (incomingCall as any).accept()
      setActiveCall(incomingCall as any)
      setIncomingCall(null)
    } catch {
      setIncomingCall(null)
    }
  }

  const reject = () => {
    try { (incomingCall as any).reject() } catch {}
    setIncomingCall(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', animation: 'pulse 1.2s infinite',
        }}>
          <Phone size={32} style={{ color: '#6366f1' }} />
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Chamada a receber</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 24px', fontFamily: 'monospace' }}>
          {caller}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={reject} style={{
            width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#ef4444', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PhoneOff size={24} />
          </button>
          <button onClick={accept} style={{
            width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#22c55e', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CallWidget/IncomingCallModal.tsx
git commit -m "feat(frontend): incoming call modal with accept/reject"
```

---

## Task 15: Frontend — ActiveCallPanel

**Files:**
- Create: `frontend/src/components/CallWidget/ActiveCallPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
import React, { useEffect, useState } from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import { useCallStore } from '../../store/call.store'

export const ActiveCallPanel: React.FC = () => {
  const { activeCall, setActiveCall } = useCallStore()
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    if (!activeCall) return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)

    const onDisconnect = () => {
      setActiveCall(null)
      setSeconds(0)
      setMuted(false)
    }
    ;(activeCall as any).on?.('disconnect', onDisconnect)
    ;(activeCall as any).on?.('cancel', onDisconnect)
    ;(activeCall as any).on?.('error', onDisconnect)

    return () => {
      clearInterval(interval)
    }
  }, [activeCall, setActiveCall])

  if (!activeCall) return null

  const fmt = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const remote = (activeCall as any).parameters?.To || (activeCall as any).customParameters?.get?.('To') || 'Chamada'

  const toggleMute = () => {
    try {
      const next = !muted
      ;(activeCall as any).mute(next)
      setMuted(next)
    } catch {}
  }

  const hangup = () => {
    try { (activeCall as any).disconnect() } catch {}
    setActiveCall(null)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
      width: 320, padding: 20, borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Em chamada</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0', fontFamily: 'monospace' }}>
        {String(remote)}
      </p>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#22c55e', margin: '8px 0 20px', fontVariantNumeric: 'tabular-nums' }}>
        {fmt}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={toggleMute} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: muted ? '#ef4444' : 'var(--bg-page)',
          color: muted ? '#fff' : 'var(--text-primary)',
        }}>
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button onClick={hangup} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#ef4444', color: '#fff',
        }}>
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CallWidget/ActiveCallPanel.tsx
git commit -m "feat(frontend): active call panel with mute, hangup and timer"
```

---

## Task 16: Frontend — CallWidget (FAB + dialer)

**Files:**
- Create: `frontend/src/components/CallWidget/CallWidget.tsx`

- [ ] **Step 1: Create component**

```tsx
import React, { useEffect, useState } from 'react'
import { Phone, X } from 'lucide-react'
import { useCallStore } from '../../store/call.store'
import { useTwilioDevice } from './useTwilioDevice'
import { IncomingCallModal } from './IncomingCallModal'
import { ActiveCallPanel } from './ActiveCallPanel'
import { listNumbers } from '../../api/phone-numbers.api'

export const CallWidget: React.FC = () => {
  useTwilioDevice()
  const { device, status, dialerOpen, openDialer, closeDialer, prefillNumber, prefillContactId, fromNumberId, setFromNumberId, setActiveCall, setError } = useCallStore()
  const [number, setNumber] = useState('')
  const [myNumbers, setMyNumbers] = useState<any[]>([])

  useEffect(() => {
    if (dialerOpen && prefillNumber) setNumber(prefillNumber)
  }, [dialerOpen, prefillNumber])

  useEffect(() => {
    if (dialerOpen) listNumbers().then(r => setMyNumbers(r.data || [])).catch(() => {})
  }, [dialerOpen])

  const dial = async () => {
    if (!device || !number.trim()) return
    try {
      const params: Record<string, string> = { To: number.trim() }
      if (fromNumberId) {
        const n = myNumbers.find(m => m.id === fromNumberId)
        if (n) params.From = n.number
      }
      const call = await (device as any).connect({ params })
      setActiveCall(call)
      closeDialer()
    } catch (err: any) {
      setError(err?.message || 'Erro ao ligar')
    }
  }

  return (
    <>
      <button
        onClick={() => openDialer()}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: status === 'active' ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
        title={device ? 'Abrir dialer' : 'Telefone não configurado'}
      >
        <Phone size={22} />
      </button>

      {dialerOpen && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 9997,
          width: 320, padding: 20, borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Nova chamada</p>
            <button onClick={closeDialer} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <input
            type="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="+351 91 234 5678"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text-primary)', fontSize: 15, fontFamily: 'monospace', outline: 'none',
              marginBottom: 12,
            }}
          />
          {myNumbers.length > 0 && (
            <select
              value={fromNumberId || ''}
              onChange={e => setFromNumberId(e.target.value || null)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 10,
                border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                color: 'var(--text-primary)', fontSize: 13, marginBottom: 12,
              }}
            >
              <option value="">A partir de (default)</option>
              {myNumbers.map(n => (
                <option key={n.id} value={n.id}>{n.friendlyName || n.number} ({n.number})</option>
              ))}
            </select>
          )}
          <button
            onClick={dial}
            disabled={!device || !number.trim()}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: !device || !number.trim() ? 'var(--bg-page)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
              color: !device || !number.trim() ? 'var(--text-muted)' : '#fff',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Phone size={14} /> {device ? 'Ligar' : 'Telefone não configurado'}
          </button>
          {!!prefillContactId && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
              Chamada será associada ao contacto
            </p>
          )}
        </div>
      )}

      <IncomingCallModal />
      <ActiveCallPanel />
    </>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/components/CallWidget/CallWidget.tsx
git commit -m "feat(frontend): CallWidget — FAB, dialer panel with fromNumber selector"
```

---

## Task 17: Mount CallWidget globally

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Import and mount**

In `frontend/src/App.tsx`, add the import near the top (after other imports):

```tsx
import { CallWidget } from './components/CallWidget/CallWidget'
```

Inside the `<Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>` section, we need the widget to appear only when authenticated. Change `AppShell` rendering: actually the cleanest is to put the widget inside `AppShell`. Alternative: place it outside the routes but conditionally rendered on auth.

Simplest: put inside `AppShell`. First check current AppShell.

Read `frontend/src/components/layout/AppShell.tsx` and add inside its JSX (at the end, before the closing tag):

```tsx
<CallWidget />
```

and import it at the top of AppShell.tsx:

```tsx
import { CallWidget } from '../CallWidget/CallWidget'
```

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(frontend): mount CallWidget globally in AppShell"
```

---

## Task 18: Contact page "Ligar" uses callStore

**Files:**
- Modify: `frontend/src/pages/ContactDetailPage.tsx`

- [ ] **Step 1: Inspect the file**

Read `frontend/src/pages/ContactDetailPage.tsx`, find the existing "Ligar" button (search for `Ligar`, `Phone`, or `tel:`). If a click handler already calls an ad-hoc function, replace it to call `useCallStore.getState().openDialer(contact.phone, contact.id)`.

- [ ] **Step 2: Add the handler**

Add import at top:
```tsx
import { useCallStore } from '../store/call.store'
```

Inside the component:
```tsx
const openDialer = useCallStore(s => s.openDialer)
```

Replace the "Ligar" button's `onClick` with:
```tsx
onClick={() => contact.phone && openDialer(contact.phone, contact.id)}
```

If no such button exists, add one next to the contact's phone row:

```tsx
<button onClick={() => openDialer(contact.phone, contact.id)} disabled={!contact.phone} style={{ ... }}>
  <Phone size={14} /> Ligar
</button>
```

- [ ] **Step 3: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/pages/ContactDetailPage.tsx
git commit -m "feat(frontend): contact Ligar button opens global dialer"
```

---

## Task 19: CallsPage — history route

**Files:**
- Create: `frontend/src/pages/CallsPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create page**

```tsx
import React, { useEffect, useState } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { getCalls } from '../api/calls.api'
import { useCallStore } from '../store/call.store'

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const openDialer = useCallStore(s => s.openDialer)

  const load = async (p: number) => {
    setLoading(true)
    try {
      const res = await getCalls({ page: p, limit: 20 })
      setCalls(res.data.data || [])
      setTotal(res.data.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page])

  const parseMeta = (c: any) => {
    try { return JSON.parse(c.metadata || '{}') } catch { return {} }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Histórico de chamadas</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
        {total} chamada{total !== 1 ? 's' : ''} no total
      </p>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border-color)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>A carregar...</div>
        ) : calls.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <Phone size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Sem chamadas ainda</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>As chamadas feitas e recebidas aparecem aqui</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Direção', 'Contacto', 'Número', 'Data', 'Duração', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(c => {
                const meta = parseMeta(c)
                const target = c.direction === 'OUTBOUND' ? meta.toNumber : meta.fromNumber
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      {c.direction === 'OUTBOUND'
                        ? <PhoneOutgoing size={14} style={{ color: '#60a5fa' }} />
                        : <PhoneIncoming size={14} style={{ color: '#4ade80' }} />}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                      {c.contact?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {target || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {meta.duration ? `${meta.duration}s` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => target && openDialer(target, c.contactId || undefined)}
                        disabled={!target}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none', cursor: target ? 'pointer' : 'not-allowed',
                          background: target ? 'rgba(99,102,241,0.1)' : 'var(--bg-page)',
                          color: target ? '#6366f1' : 'var(--text-muted)', fontSize: 12, fontWeight: 600,
                        }}
                      >
                        Ligar de volta
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Anterior
          </button>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add route**

In `frontend/src/App.tsx`:
- Add import: `import { CallsPage } from './pages/CallsPage'`
- Inside the protected routes section, add: `<Route path="calls" element={<CallsPage />} />`

- [ ] **Step 3: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/pages/CallsPage.tsx frontend/src/App.tsx
git commit -m "feat(frontend): /calls route with history table and Ligar de volta"
```

---

## Task 20: PhoneNumbersPage — auto-provision button + Externos tab

**Files:**
- Modify: `frontend/src/pages/PhoneNumbersPage.tsx`

- [ ] **Step 1: Add state and tab switcher**

Add inside the `PhoneNumbersPage` component (at the top of state declarations):

```tsx
const [tab, setTab] = useState<'twilio' | 'external'>('twilio')
const [autoProvisioning, setAutoProvisioning] = useState(false)
const [autoProvisionMsg, setAutoProvisionMsg] = useState<{ ok: boolean; text: string } | null>(null)
const [showExternalForm, setShowExternalForm] = useState(false)
const [extPhone, setExtPhone] = useState('')
const [extChannel, setExtChannel] = useState<'sms' | 'call'>('call')
const [extCode, setExtCode] = useState('')
const [extStep, setExtStep] = useState<'input' | 'waiting'>('input')
const [extError, setExtError] = useState('')
const [extLoading, setExtLoading] = useState(false)
```

Import new api helpers at top:
```tsx
import { autoProvisionTwilio, verifyPersonalNumber, confirmPersonalNumber, updateRouting } from '../api/phone-numbers.api'
```

- [ ] **Step 2: Add auto-provision handler and UI section**

Add handler inside the component:
```tsx
const handleAutoProvision = async () => {
  setAutoProvisioning(true)
  setAutoProvisionMsg(null)
  try {
    const res = await autoProvisionTwilio()
    setAutoProvisionMsg({ ok: true, text: `Setup concluído. TwiML App: ${res.data.twimlAppSid}` })
  } catch (e: any) {
    setAutoProvisionMsg({ ok: false, text: e.response?.data?.error || 'Erro no setup' })
  } finally { setAutoProvisioning(false) }
}
```

Insert this UI block right after the Stats grid and before the SetupGuide:

```tsx
{twilioStatus?.phone === 'configured' && (
  <div style={{ ...card, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Setup automático do Twilio</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
        Cria TwiML App e API Keys automaticamente. Necessário para chamadas no browser.
      </p>
      {autoProvisionMsg && (
        <p style={{ fontSize: 12, color: autoProvisionMsg.ok ? '#10b981' : '#f87171', margin: '6px 0 0' }}>
          {autoProvisionMsg.text}
        </p>
      )}
    </div>
    <button
      onClick={handleAutoProvision}
      disabled={autoProvisioning}
      style={{
        padding: '9px 16px', borderRadius: 10, border: 'none',
        background: autoProvisioning ? 'var(--bg-page)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: autoProvisioning ? 'not-allowed' : 'pointer',
      }}
    >
      {autoProvisioning ? 'A configurar...' : 'Configurar automaticamente'}
    </button>
  </div>
)}
```

- [ ] **Step 3: Add tab switcher above the table**

Just before `{/* Numbers list */}`, add:

```tsx
<div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
  {[
    { key: 'twilio' as const, label: 'Números Twilio' },
    { key: 'external' as const, label: 'Números externos (pessoal)' },
  ].map(t => (
    <button
      key={t.key}
      onClick={() => setTab(t.key)}
      style={{
        padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
        color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 13, fontWeight: 600,
        borderBottom: tab === t.key ? '2px solid #c9a84c' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {t.label}
    </button>
  ))}
</div>
```

Change the numbers filter: find the `numbers.length === 0 ?` block and the table that follows. Wrap the existing list rendering so it only shows when `tab === 'twilio'` and applies the filter `numbers.filter(n => (n.source || 'TWILIO') === (tab === 'twilio' ? 'TWILIO' : 'EXTERNAL_VERIFIED'))`. Update both `.length === 0` check and `.map` to use this filtered array.

Specifically, near the existing `numbers.length === 0 ?` line, replace with:

```tsx
{(() => {
  const visible = numbers.filter(n => (n.source || 'TWILIO') === (tab === 'twilio' ? 'TWILIO' : 'EXTERNAL_VERIFIED'));
  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>A carregar...</div>;
  if (visible.length === 0) {
    return (
      <div style={{ padding: 56, textAlign: 'center' }}>
        <Phone size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {tab === 'twilio' ? 'Sem números Twilio' : 'Sem números externos verificados'}
        </p>
        <button
          onClick={() => tab === 'twilio' ? setShowSearch(true) : setShowExternalForm(true)}
          style={{
            padding: '9px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {tab === 'twilio' ? 'Comprar primeiro número' : 'Adicionar número pessoal'}
        </button>
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      {/* existing thead + tbody — rewrite tbody to iterate `visible` not `numbers` */}
    </table>
  );
})()}
```

Refactor the existing `<table>` section so `tbody` iterates `visible` instead of `numbers`. Keep existing columns and add routing toggles (ringAll, voicemailEnabled) with `<input type="checkbox" checked={n.ringAll} onChange={(e) => updateRouting(n.id, { ringAll: e.target.checked }).then(() => load())} />` inline near Ações — or in a new "Roteamento" column.

Add a header button for the external tab to add new external number (show when tab === 'external'): button that sets `setShowExternalForm(true)`.

- [ ] **Step 4: Add External verification form (modal)**

Add near the end of the JSX (before the closing `</div>` of the page root):

```tsx
{showExternalForm && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Adicionar número pessoal
        </h2>
        <button onClick={() => { setShowExternalForm(false); setExtStep('input'); setExtPhone(''); setExtCode(''); setExtError('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {extError && (
        <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>{extError}</div>
      )}

      {extStep === 'input' && (
        <>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Número (formato internacional)
          </label>
          <input
            value={extPhone}
            onChange={e => setExtPhone(e.target.value)}
            placeholder="+351912345678"
            style={inputStyle}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {(['call', 'sms'] as const).map(c => (
              <button key={c} onClick={() => setExtChannel(c)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                border: `1px solid ${extChannel === c ? '#c9a84c' : 'var(--border-color)'}`,
                background: extChannel === c ? 'rgba(201,168,76,0.1)' : 'var(--bg-page)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {c === 'call' ? 'Receber chamada' : 'Receber SMS'}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              setExtLoading(true); setExtError('')
              try {
                const res = await verifyPersonalNumber(extPhone, extChannel)
                setExtCode(res.data.validationCode)
                setExtStep('waiting')
              } catch (e: any) {
                setExtError(e.response?.data?.error || 'Erro ao iniciar verificação')
              } finally { setExtLoading(false) }
            }}
            disabled={extLoading || !extPhone}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 14,
            }}
          >
            {extLoading ? 'A enviar...' : `Enviar código via ${extChannel === 'call' ? 'chamada' : 'SMS'}`}
          </button>
        </>
      )}

      {extStep === 'waiting' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            O Twilio vai {extChannel === 'call' ? 'ligar-te' : 'enviar-te um SMS'} com o código:
          </p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#c9a84c', textAlign: 'center', margin: '16px 0', letterSpacing: '0.2em', fontFamily: 'monospace' }}>
            {extCode}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Introduz este código no teclado do telemóvel quando te ligarem (ou aguarda o SMS).
            Depois carrega em "Confirmar".
          </p>
          <button
            onClick={async () => {
              setExtLoading(true); setExtError('')
              try {
                await confirmPersonalNumber(extPhone)
                await load()
                setShowExternalForm(false)
                setExtStep('input'); setExtPhone(''); setExtCode('')
              } catch (e: any) {
                setExtError(e.response?.data?.error || 'Ainda não verificado. Completa a chamada e tenta de novo.')
              } finally { setExtLoading(false) }
            }}
            disabled={extLoading}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 14,
            }}
          >
            {extLoading ? 'A confirmar...' : 'Confirmar'}
          </button>
        </>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/pages/PhoneNumbersPage.tsx
git commit -m "feat(frontend): PhoneNumbers — auto-provision, external tab, verify personal"
```

---

## Task 21: AppShell sidebar link to /calls

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add link**

Read the file. Locate the navigation menu. Add a nav item pointing to `/calls` with `Phone` icon from `lucide-react`, labelled "Chamadas". Follow the existing pattern for other nav items (e.g., `/contacts`, `/conversations`).

- [ ] **Step 2: Build + commit**

```bash
cd frontend && npm run build
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(frontend): sidebar link to /calls"
```

---

## Task 22: Deploy frontend + manual E2E checklist

**Files:** none (validation)

- [ ] **Step 1: Push**

```bash
git push origin master
```

Wait for frontend deploy (Netlify/Vercel).

- [ ] **Step 2: Manual E2E checklist — go through each on the deployed environment**

1. Login to production CRM.
2. Navigate to Configurações → Telefone. Paste a valid Twilio SID + Auth Token → Save.
3. Navigate to Números de Telefone. Click "Configurar automaticamente" → expect green success message with TwiML App SID.
4. Click "Comprar número" → select PT → purchase → number appears in the "Números Twilio" tab.
5. Switch to "Números externos" tab → click "Adicionar número pessoal" → enter own Portuguese mobile `+351...` → choose "Receber chamada" → note the code shown → answer the Twilio call and key in the code → click "Confirmar" → number appears in the external tab.
6. Open a contact with a phone number → click "Ligar" → dialer widget opens pre-filled → choose one of your numbers as "From" → click Ligar → verify audio works bidirectionally in the browser.
7. From another phone, call one of the Twilio numbers → verify `IncomingCallModal` appears in the browser → accept → audio works.
8. Reject or leave unanswered another inbound call → verify SMS missed-call auto-reply arrives on the caller's phone. If `voicemailEnabled=true`, verify a `Voicemail` Interaction was created for the contact (check the contact history).
9. Navigate to `/calls` → confirm recent outbound and inbound calls appear with direction, duration, contact.
10. On a PhoneNumber row, toggle `ringAll` on (if shown) — call the number again from another phone → confirm it rings for multiple users of the same agency.

- [ ] **Step 3: Fix any failures**

For each failing step, diagnose and patch; commit and redeploy; re-run the step. Do not mark the plan complete until all 10 steps pass.

---

## Final self-review

- **Spec coverage:**
  - Widget global → Tasks 11, 12, 14, 15, 16, 17
  - Auto-provision Twilio → Tasks 2, 5, 20
  - Caller ID externo (verify personal) → Tasks 3, 5, 20
  - Botão Ligar em contactos → Task 18
  - Página /calls → Task 19, sidebar link Task 21
  - Roteamento (ringAll, voicemail) → Tasks 4, 5, 7, 20
  - Missed-call SMS já existente + voicemail → Task 7
  - Modelo de dados → Task 1
- **No placeholders:** All code blocks contain full implementations.
- **Type consistency:** `autoProvisionTwilio` returns `{ twimlAppSid, apiKey }` consistently; `callStore` uses `prefillNumber` / `prefillContactId` in both store and CallWidget / ContactDetailPage.
- **Push after each group:** Task 9 (backend), Task 22 (frontend+final).
