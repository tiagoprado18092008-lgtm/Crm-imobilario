# Invite-Only Agency Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce invite-only access — no user can enter the CRM unless explicitly invited; agencies are fully isolated with no cross-contamination.

**Architecture:** The `User` DB row is created at invite time (inactive). Clerk is identity-only. `clerkExchange` only associates `clerkUserId` to existing users — never auto-provisions. `InviteAcceptPage` shows Clerk's `<SignUp>` instead of a password form.

**Tech Stack:** TypeScript, Prisma (PostgreSQL), Express, Clerk (`@clerk/backend`, `@clerk/clerk-react`), React

---

## Files to Modify

| File | Change |
|---|---|
| `backend/src/modules/invitations/invitations.service.ts` | Create User on invite, delete inactive User on revoke |
| `backend/src/modules/auth/clerk-exchange.service.ts` | Remove auto-provision; reject unknown emails with 401 |
| `frontend/src/pages/InviteAcceptPage.tsx` | Replace password form with Clerk `<SignUp>` |

---

### Task 1: Update `invitations.service.ts` — create User at invite time

**Files:**
- Modify: `backend/src/modules/invitations/invitations.service.ts`

- [ ] **Step 1: Replace the `create` function**

Open `backend/src/modules/invitations/invitations.service.ts` and replace the entire `create` function with the following. The key changes are: (a) check for existing User by email first (not just Invitation), (b) create the User row before creating the Invitation, (c) if User creation succeeds but Invitation creation fails, the transaction rolls back via Prisma `$transaction`.

```ts
export const create = async (email: string, role: string, invitedById: string, locationId?: string, permissions?: any, agencyId?: string) => {
  // Reject if email already belongs to any user (cross-agency protection)
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw Object.assign(new Error('Email já registado na plataforma'), { status: 409 });

  // Invalidate previous pending invitations for same email
  await prisma.invitation.updateMany({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Resolve agencyId from inviter if not provided
  let resolvedAgencyId = agencyId;
  let resolvedLocationId = locationId;
  if (!resolvedAgencyId && invitedById) {
    const inviter = await prisma.user.findUnique({
      where: { id: invitedById },
      select: { agencyId: true, locationId: true },
    });
    if (inviter?.agencyId) resolvedAgencyId = inviter.agencyId;
    if (inviter?.locationId && !resolvedLocationId) resolvedLocationId = inviter.locationId;
  }

  // Create user (inactive placeholder) and invitation atomically
  const [user, invitation] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: '',
        email,
        passwordHash: '',
        role: role as any,
        isActive: false,
        onboardingCompleted: false,
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
      },
    }),
    prisma.invitation.create({
      data: {
        email,
        role,
        token,
        invitedById,
        expiresAt,
        ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        ...(permissions ? { permissions } : {}),
      },
    }),
  ]);

  // Send invite email
  const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`;
  const transporter = getTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Convite para o CasaFlow',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#6366f1">Bem-vindo ao CasaFlow</h2>
          <p>Foi convidado para se juntar à plataforma.</p>
          <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600">Aceitar convite</a>
          <p style="color:#94a3b8;font-size:12px">Este convite expira em 7 dias. Se não pediu este convite, ignore este email.</p>
        </div>
      `,
    });
  } else {
    console.log(`[Invite] Link para ${email}: ${inviteUrl}`);
  }

  return invitation;
};
```

- [ ] **Step 2: Update the `revoke` function**

Replace the existing `revoke` function to also delete the associated inactive user (if they never logged in — `clerkUserId` is null):

```ts
export const revoke = async (id: string) => {
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (invitation) {
    // Delete the placeholder user only if they never logged in
    await prisma.user.deleteMany({
      where: {
        email: invitation.email,
        clerkUserId: null,
        isActive: false,
      },
    });
  }
  return prisma.invitation.delete({ where: { id } });
};
```

- [ ] **Step 3: Build the backend to check for TypeScript errors**

```bash
cd "backend" && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/invitations/invitations.service.ts
git commit -m "feat(invitations): create inactive User at invite time, delete on revoke"
```

---

### Task 2: Update `clerk-exchange.service.ts` — remove auto-provision

**Files:**
- Modify: `backend/src/modules/auth/clerk-exchange.service.ts`

- [ ] **Step 1: Replace the entire file content**

Replace `backend/src/modules/auth/clerk-exchange.service.ts` with the following. The critical change: remove the `prisma.agency.findFirst()` auto-provision block. Now if no user is found by `clerkUserId` or `email`, we throw 401.

```ts
import { verifyToken, createClerkClient } from '@clerk/backend';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export const clerkExchange = async (clerkToken: string): Promise<{ token: string; user: object }> => {
  let payload: any;
  try {
    payload = await verifyToken(clerkToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch {
    const err: any = new Error('Token Clerk inválido');
    err.status = 401;
    throw err;
  }

  const clerkUserId: string = payload.sub;

  // Try lookup by clerkUserId first (returning users)
  let user = await prisma.user.findUnique({ where: { clerkUserId } });

  if (!user) {
    // Fetch Clerk user to get email
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email: string | undefined = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (email) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user && user.clerkUserId === null) {
        // First-time Clerk login for an invited user — associate clerkUserId, activate, sync name
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkUserId,
            isActive: true,
            name: name || user.name || email.split('@')[0],
          },
        });

        // Mark the invitation as used
        await prisma.invitation.updateMany({
          where: { email, usedAt: null },
          data: { usedAt: new Date() },
        });
      }
    }
  }

  if (!user) {
    const err: any = new Error('Sem acesso. Contacte o administrador da agência.');
    err.status = 401;
    throw err;
  }

  if (!user.isActive) {
    const err: any = new Error('Conta desativada. Contacte o administrador.');
    err.status = 401;
    throw err;
  }

  const crmToken = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user as any;
  return { token: crmToken, user: userWithoutHash };
};
```

- [ ] **Step 2: Build backend to check for TypeScript errors**

```bash
cd "backend" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/auth/clerk-exchange.service.ts
git commit -m "feat(auth): enforce invite-only — clerkExchange never auto-provisions users"
```

---

### Task 3: Update `InviteAcceptPage.tsx` — replace form with Clerk SignUp

**Files:**
- Modify: `frontend/src/pages/InviteAcceptPage.tsx`

- [ ] **Step 1: Check which Clerk SignUp props are available**

The project already uses `@clerk/clerk-react`. The `<SignUp>` component accepts `initialValues={{ emailAddress: string }}` to pre-fill the email, and `routing="hash"` for SPA routing (same as the existing `<SignIn>` in `ClerkLoginPage.tsx`).

- [ ] **Step 2: Replace the entire `InviteAcceptPage.tsx` file**

```tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { SignUp } from '@clerk/clerk-react'
import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'

type Step = 'loading' | 'invalid' | 'signup'

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token inválido ou em falta.')
      setStep('invalid')
      return
    }
    axios
      .get(`${BASE}/invitations/verify/${token}`)
      .then(res => {
        const data = res.data?.data ?? res.data
        setEmail(data.email)
        setStep('signup')
      })
      .catch(err => {
        const msg = err?.response?.data?.error || 'Token inválido ou expirado.'
        setErrorMsg(msg)
        setStep('invalid')
      })
  }, [token])

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080d1a' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#818cf8' }} />
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4" style={{ background: '#080d1a' }}>
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={28} style={{ color: '#f87171' }} />
        </div>
        <h1 className="text-white font-bold text-xl">Convite inválido</h1>
        <p className="text-sm text-center max-w-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {errorMsg}
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Contacte o seu administrador para obter um novo convite.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', cursor: 'pointer' }}
        >
          Ir para o login
        </button>
      </div>
    )
  }

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignUp
        routing="hash"
        initialValues={{ emailAddress: email }}
      />
    </main>
  )
}
```

- [ ] **Step 3: Build frontend to check for TypeScript errors**

```bash
cd "frontend" && npx tsc --noEmit
```

Expected: no errors. If `initialValues` causes a type error, check `@clerk/clerk-react` version:
```bash
cd "frontend" && cat node_modules/@clerk/clerk-react/package.json | grep '"version"'
```
If version < 5, use `initialValues` as a prop directly. If version ≥ 5, the prop name is still `initialValues`. Fix accordingly.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/InviteAcceptPage.tsx
git commit -m "feat(invite): replace password form with Clerk SignUp on invite page"
```

---

### Task 4: Clean up stale contaminated users (production hygiene)

**Context:** The screenshot shows 2 users (`tiagoprado1620tp@gmail.com`, `tiagoprado18092008@gmail.com`) that were auto-provisioned into the wrong agency. These need to be removed from the DB.

**Files:**
- No code files — this is a DB operation

- [ ] **Step 1: Identify the contaminated users**

Connect to the production DB (Railway) and run:

```sql
SELECT id, email, "clerkUserId", "agencyId", "isActive", "createdAt"
FROM "User"
WHERE "isActive" = false
  AND ("clerkUserId" IS NULL OR "clerkUserId" != '')
ORDER BY "createdAt" DESC;
```

Verify which rows are the incorrectly auto-provisioned users (the ones that were created by `clerkExchange` with `findFirst()` in the past).

- [ ] **Step 2: Delete them**

Only delete users that were never legitimately invited (no matching `Invitation` row, `isActive = false`, and you recognise the emails as test accounts):

```sql
DELETE FROM "User"
WHERE email IN ('tiagoprado1620tp@gmail.com', 'tiagoprado18092008@gmail.com');
```

> **Warning:** Only run this if you are certain these are test/contaminated accounts and not real users with data.

- [ ] **Step 3: Push all commits to GitHub**

```bash
git push origin master
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Test rejected login (no invitation)**

1. Create a fresh Clerk account with an email that does NOT exist in the CRM DB
2. Try to log in at `/login`
3. Expected: `clerkExchange` returns 401, `ClerkLoginPage` signs out of Clerk and shows the SignIn form again with no redirect to dashboard

- [ ] **Step 2: Test invite flow**

1. As admin, go to Settings → Team → Convidar
2. Enter a fresh email address → send
3. Check the DB: `SELECT * FROM "User" WHERE email = '<that email>'` — should exist with `isActive=false`, `clerkUserId=null`
4. Open the invite link `/invite/:token`
5. Expected: Clerk SignUp form appears with email pre-filled
6. Create the Clerk account
7. Expected: redirected to `/login` → `clerkExchange` runs → user is activated → redirected to `/dashboard`
8. Check DB: `isActive=true`, `clerkUserId` set, `name` populated from Clerk

- [ ] **Step 3: Test invite revoke**

1. Send an invite to a new email
2. Revoke it from the admin panel
3. Check DB: the `User` row for that email should be deleted
4. Try to open the invite link → expected: "Convite inválido"
