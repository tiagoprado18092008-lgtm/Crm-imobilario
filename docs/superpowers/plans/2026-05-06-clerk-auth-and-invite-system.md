# Clerk Auth + Sistema de Convites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar 100% para Clerk como única fonte de autenticação, fechar registo público, criar painel super-admin para gestão de agências, e ter sistema de convites funcional com envio real de email validado end-to-end.

**Architecture:** Clerk frontend para login/signup → exchange para JWT da API (já existe) → middlewares e RBAC continuam iguais. Adicionamos role `SUPER_ADMIN`, type de convite (OWNER vs CONSULTANT), endpoints `/api/super-admin/agencies` e `/api/team/*`, consolidação do email service, painel super-admin no frontend, e desativação dos endpoints legados de password/Google login.

**Tech Stack:** Backend: Express + Prisma + Postgres (Neon) + `@clerk/backend` + nodemailer (Gmail SMTP). Frontend: React 19 + Vite + `@clerk/clerk-react` + Zustand + react-router-dom 7. Testes: Jest + Supertest no backend.

**Spec:** `docs/superpowers/specs/2026-05-06-clerk-auth-and-invite-system-design.md`

---

## File Structure

### Backend — novos
- `backend/src/lib/auth.ts` — helpers `getCurrentUser`, `requireRoleHelper`, `isSuperAdmin`
- `backend/src/lib/email.ts` — `EmailService` consolidado
- `backend/src/lib/email-templates.ts` — templates HTML PT-PT
- `backend/src/modules/super-admin/super-admin.router.ts`
- `backend/src/modules/super-admin/super-admin.controller.ts`
- `backend/src/modules/super-admin/super-admin.service.ts`
- `backend/src/modules/team/team.router.ts`
- `backend/src/modules/team/team.controller.ts`
- `backend/src/modules/team/team.service.ts`
- `backend/prisma/migrations/<timestamp>_add_super_admin_and_invitation_type/migration.sql` (gerado)
- `backend/src/__tests__/super-admin.test.ts`
- `backend/src/__tests__/team.test.ts`
- `backend/src/__tests__/invitations-resend.test.ts`

### Backend — modificados
- `backend/prisma/schema.prisma` — `UserRole` ganha `SUPER_ADMIN`; `Invitation` ganha `type`
- `backend/prisma/seed.ts` — seed do super-admin
- `backend/src/middleware/rbac.middleware.ts` — adicionar `SUPER_ADMIN` à `ROLES`
- `backend/src/modules/auth/auth.controller.ts` — desativar `login`, `register`, `googleAuth`
- `backend/src/modules/auth/auth.router.ts` — manter apenas `clerk-exchange` e `me`
- `backend/src/modules/auth/clerk-exchange.service.ts` — auto-criar Agency quando convite type=OWNER
- `backend/src/modules/invitations/invitations.controller.ts` — endpoint `resend`
- `backend/src/modules/invitations/invitations.service.ts` — usar `EmailService` consolidado, tratar `type`
- `backend/src/modules/invitations/invitations.router.ts` — rota `POST /:id/resend`
- `backend/src/server.ts` — registar `super-admin` e `team` routers, validar SMTP no boot
- `backend/.env` — adicionar `CLERK_SECRET_KEY`, `SUPER_ADMIN_EMAIL`

### Frontend — novos
- `frontend/src/api/super-admin.api.ts`
- `frontend/src/api/team.api.ts`
- `frontend/src/pages/super-admin/SuperAdminLayout.tsx`
- `frontend/src/pages/super-admin/SuperAdminAgenciesPage.tsx`
- `frontend/src/pages/super-admin/SuperAdminAgencyDetailPage.tsx`
- `frontend/src/components/auth/RoleGuard.tsx`

### Frontend — modificados
- `frontend/.env.local` — adicionar `VITE_CLERK_PUBLISHABLE_KEY`
- `frontend/src/App.tsx` — substituir `ClerkLoginPage` import por `LoginPage`, adicionar rotas super-admin, remover rotas legadas
- `frontend/src/pages/LoginPage.tsx` — substituído pelo conteúdo Clerk (atualmente em ClerkLoginPage); o ficheiro antigo de email/password é removido
- `frontend/src/pages/ClerkLoginPage.tsx` — eliminado
- `frontend/src/pages/RegisterPage.tsx` — eliminado
- `frontend/src/pages/InviteAcceptPage.tsx` — mostrar agencyName e mensagem por type
- `frontend/src/pages/settings/TeamPage.tsx` — botão reenviar convite, ações alterar role/desativar
- `frontend/src/store/auth.store.ts` — remover login email/password (não é usado mas há tipos)
- `frontend/src/api/auth.api.ts` — remover `login`, `register`, `googleLogin`
- `frontend/src/types/index.ts` — adicionar `SUPER_ADMIN` ao tipo `Role`
- `frontend/src/utils/constants.ts` — adicionar label `SUPER_ADMIN`

---

## Pre-flight checks

- [ ] **Step 0.1: Verify clean working tree**

```bash
git status --short
```

Expected: working tree may have unrelated modifications, but no conflicting changes in the files this plan touches. If uncertain, stash or commit existing changes before starting.

- [ ] **Step 0.2: Verify dev environment runs**

```bash
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

Expected: both builds succeed with zero TypeScript errors. If errors exist, fix them before starting (they are not from this plan).

---

## Task 1: Configure environment variables (fix immediate Clerk bugs)

**Files:**
- Modify: `backend/.env`
- Modify: `frontend/.env.local`

- [ ] **Step 1.1: Add Clerk secret to backend env**

Open `backend/.env` and append at the end:

```env

# Clerk
CLERK_SECRET_KEY=sk_test_abzKGfTaLBAQd7B8qCLzTYz1yABdqvwQOdUzpxAepI

# Super-admin (AlphaScaleAI platform owner)
SUPER_ADMIN_EMAIL=geral@alphascaleai.com
```

- [ ] **Step 1.2: Add Clerk publishable key to frontend env**

Open `frontend/.env.local` and append at the end:

```env

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZW1lcmdpbmctamFja2FsLTQzLmNsZXJrLmFjY291bnRzLmRldiQ
```

- [ ] **Step 1.3: Verify backend boots without warnings**

```bash
cd backend && npm run dev
```

Expected: console shows `CRM Backend running on http://localhost:3000` with no Clerk-related warnings. Stop the server with Ctrl+C.

- [ ] **Step 1.4: Verify frontend boots and login page loads**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/login` in a browser. Expected: Clerk SignIn widget renders (not a blank page). Stop the server.

- [ ] **Step 1.5: Commit**

```bash
git add backend/.env frontend/.env.local
git commit -m "chore(env): add Clerk publishable + secret keys, SUPER_ADMIN_EMAIL"
git push
```

> Note: `.env` files may be gitignored. If `git add` reports the file as ignored, skip the commit and document the values in a separate note for production deployment.

---

## Task 2: Add SUPER_ADMIN role and Invitation.type to schema

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_super_admin_and_invitation_type/migration.sql` (auto-generated)

- [ ] **Step 2.1: Add SUPER_ADMIN to UserRole enum**

In `backend/prisma/schema.prisma`, find the `enum UserRole` block (around line 12) and edit to:

```prisma
enum UserRole {
  SUPER_ADMIN
  AGENCY_OWNER
  AGENCY_ADMIN
  LOCATION_ADMIN
  TEAM_LEADER
  CONSULTANT
  USER
}
```

- [ ] **Step 2.2: Add `type` field to Invitation model**

In `backend/prisma/schema.prisma`, find the `model Invitation` block (around line 631) and add the `type` field:

```prisma
model Invitation {
  id          String    @id @default(cuid())
  email       String
  role        String    @default("CONSULTANT")
  type        String    @default("CONSULTANT")
  token       String    @unique
  invitedById String
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  locationId  String?
  permissions Json?
  agencyId    String?
}
```

- [ ] **Step 2.3: Generate migration**

```bash
cd backend && npx prisma migrate dev --name add_super_admin_and_invitation_type
```

Expected: migration file created under `backend/prisma/migrations/`, schema applied to local DB without errors, Prisma Client regenerated.

- [ ] **Step 2.4: Verify migration content**

Open the generated `migration.sql` and confirm it:
- Adds `'SUPER_ADMIN'` to the `UserRole` enum.
- Adds `"type" TEXT NOT NULL DEFAULT 'CONSULTANT'` to `Invitation`.

If anything else is in the migration, investigate (it may be unrelated drift).

- [ ] **Step 2.5: Backfill type for existing invitations**

In the Prisma Studio or via psql, update existing rows:

```bash
cd backend && npx prisma studio
# OR run via psql:
# UPDATE "Invitation" SET "type" = 'OWNER' WHERE role IN ('AGENCY_OWNER','AGENCY_ADMIN');
```

If using psql, run:

```sql
UPDATE "Invitation" SET "type" = 'OWNER' WHERE role IN ('AGENCY_OWNER','AGENCY_ADMIN');
```

Expected: rows updated successfully (count varies; possibly 0 if no historical owner invites).

- [ ] **Step 2.6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add SUPER_ADMIN role + Invitation.type"
git push
```

---

## Task 3: Seed super-admin user

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 3.1: Read current seed file**

Open `backend/prisma/seed.ts` and inspect its structure. The new seed logic must coexist with whatever else is there.

- [ ] **Step 3.2: Add super-admin upsert**

At the end of the `main` function (or equivalent entry function) in `backend/prisma/seed.ts`, before the `await prisma.$disconnect()`, add:

```typescript
  // Ensure platform super-admin exists
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'geral@alphascaleai.com';
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { role: 'SUPER_ADMIN' as any, isActive: true, agencyId: null },
    create: {
      name: 'Tiago (Platform Admin)',
      email: superAdminEmail,
      role: 'SUPER_ADMIN' as any,
      isActive: true,
      passwordHash: null,
      agencyId: null,
    },
  });
  console.log(`[seed] super-admin ensured for ${superAdminEmail}`);
```

If the existing seed already has a hard-coded `geral@alphascaleai.com` user with `role=AGENCY_OWNER`, **replace** that block with the upsert above (do not duplicate).

- [ ] **Step 3.3: Run seed**

```bash
cd backend && npm run db:seed
```

Expected: log line `[seed] super-admin ensured for geral@alphascaleai.com`. No errors.

- [ ] **Step 3.4: Verify in DB**

```bash
cd backend && npx prisma studio
```

Find `User` table, locate row with email `geral@alphascaleai.com`. Expected: `role = SUPER_ADMIN`, `isActive = true`, `agencyId = null`.

- [ ] **Step 3.5: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat(seed): ensure SUPER_ADMIN user for platform owner"
git push
```

---

## Task 4: Consolidated EmailService

**Files:**
- Create: `backend/src/lib/email.ts`
- Create: `backend/src/lib/email-templates.ts`
- Test: `backend/src/__tests__/email.test.ts`

- [ ] **Step 4.1: Write the failing test**

Create `backend/src/__tests__/email.test.ts`:

```typescript
import { EmailService } from '../lib/email';
import { inviteOwnerTemplate, inviteConsultantTemplate } from '../lib/email-templates';

describe('EmailService', () => {
  describe('templates', () => {
    it('inviteOwnerTemplate produces HTML with agency name and CTA url', () => {
      const html = inviteOwnerTemplate({
        agencyName: 'Imobiliária Teste',
        inviteUrl: 'https://example.com/invite/abc123',
        expiresAt: new Date('2026-05-13T00:00:00Z'),
      });
      expect(html).toContain('Imobiliária Teste');
      expect(html).toContain('https://example.com/invite/abc123');
      expect(html).toContain('Aceitar');
    });

    it('inviteConsultantTemplate includes inviter name', () => {
      const html = inviteConsultantTemplate({
        agencyName: 'Imobiliária Teste',
        inviterName: 'Tiago',
        inviteUrl: 'https://example.com/invite/xyz',
        expiresAt: new Date('2026-05-13T00:00:00Z'),
      });
      expect(html).toContain('Tiago');
      expect(html).toContain('Imobiliária Teste');
      expect(html).toContain('https://example.com/invite/xyz');
    });
  });

  describe('send', () => {
    it('returns success=false when SMTP not configured and NODE_ENV=test', async () => {
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      const result = await EmailService.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>hi</p>',
      });
      // In dev mode without SMTP, EmailService should NOT throw — it logs and returns success.
      expect(typeof result.success).toBe('boolean');
      if (originalHost) process.env.SMTP_HOST = originalHost;
    });
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/email.test.ts --forceExit
```

Expected: FAIL with "Cannot find module '../lib/email'" (file does not exist yet).

- [ ] **Step 4.3: Create email-templates.ts**

Create `backend/src/lib/email-templates.ts`:

```typescript
const navy = '#0f2553';
const gold = '#b8963e';
const muted = '#6b7a99';

function baseLayout(opts: { title: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${opts.title}</title></head>
<body style="margin:0;background:#f8f9fc;font-family:'Helvetica Neue',Arial,sans-serif;color:${navy};">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e9f2;">
    <div style="padding:24px 32px;border-bottom:1px solid #e5e9f2;background:${navy};color:#fff;">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;">CASA<span style="font-weight:400">FLOW</span></div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.14em;text-transform:uppercase;margin-top:2px;">CRM Imobiliário</div>
    </div>
    <div style="padding:32px;">${opts.bodyHtml}</div>
    <div style="padding:16px 32px;border-top:1px solid #e5e9f2;font-size:11px;color:${muted};">
      © ${new Date().getFullYear()} CasaFlow · Se não pediste este email, ignora-o.
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:13px 26px;background:${navy};color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;border-bottom:3px solid ${gold};">${label}</a>`;
}

function formatExpires(d: Date): string {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function inviteOwnerTemplate(opts: { agencyName: string; inviteUrl: string; expiresAt: Date }): string {
  const body = `
    <h1 style="font-size:22px;margin:0 0 16px;letter-spacing:-0.02em;">Bem-vindo ao CasaFlow</h1>
    <p style="font-size:15px;line-height:1.6;color:${navy};margin:0 0 12px;">
      Foste convidado para gerir a agência <strong>${opts.agencyName}</strong> no CasaFlow.
    </p>
    <p style="font-size:14px;line-height:1.6;color:${muted};margin:0 0 28px;">
      Clica no botão abaixo para criares a tua conta e começares a usar a plataforma.
    </p>
    <div style="margin:0 0 24px;">${ctaButton(opts.inviteUrl, 'Aceitar convite')}</div>
    <p style="font-size:12px;color:${muted};margin:0;">
      Este convite expira em ${formatExpires(opts.expiresAt)}.
    </p>`;
  return baseLayout({ title: 'Convite CasaFlow', bodyHtml: body });
}

export function inviteConsultantTemplate(opts: { agencyName: string; inviterName: string; inviteUrl: string; expiresAt: Date }): string {
  const body = `
    <h1 style="font-size:22px;margin:0 0 16px;letter-spacing:-0.02em;">Foste convidado para uma equipa</h1>
    <p style="font-size:15px;line-height:1.6;color:${navy};margin:0 0 12px;">
      <strong>${opts.inviterName}</strong> convidou-te para te juntares à agência <strong>${opts.agencyName}</strong> no CasaFlow.
    </p>
    <p style="font-size:14px;line-height:1.6;color:${muted};margin:0 0 28px;">
      Clica no botão abaixo para criares a tua conta. Após login, terás acesso à equipa, contactos e propriedades partilhadas.
    </p>
    <div style="margin:0 0 24px;">${ctaButton(opts.inviteUrl, 'Aceitar convite')}</div>
    <p style="font-size:12px;color:${muted};margin:0;">
      Este convite expira em ${formatExpires(opts.expiresAt)}.
    </p>`;
  return baseLayout({ title: 'Convite CasaFlow', bodyHtml: body });
}

export function accountActivatedTemplate(opts: { name: string; dashboardUrl: string }): string {
  const body = `
    <h1 style="font-size:22px;margin:0 0 16px;letter-spacing:-0.02em;">Olá ${opts.name}</h1>
    <p style="font-size:15px;line-height:1.6;color:${navy};margin:0 0 28px;">
      A tua conta CasaFlow foi ativada. Já podes começar a trabalhar.
    </p>
    <div>${ctaButton(opts.dashboardUrl, 'Abrir dashboard')}</div>`;
  return baseLayout({ title: 'Conta ativada', bodyHtml: body });
}
```

- [ ] **Step 4.4: Create EmailService**

Create `backend/src/lib/email.ts`:

```typescript
import nodemailer, { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { rejectUnauthorized: false },
  });
  return cachedTransporter;
}

function getFrom(): string {
  const fromName = process.env.SMTP_FROM_NAME || process.env.FROM_NAME || 'CasaFlow';
  const fromAddr = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@casaflow.pt';
  return `"${fromName}" <${fromAddr}>`;
}

export class EmailService {
  static async send(opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    template?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const transporter = getTransporter();
    const template = opts.template || 'generic';

    if (!transporter) {
      console.log(`[Email DEMO] template=${template} to=${opts.to} subject="${opts.subject}"`);
      return { success: true, messageId: `demo_${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: getFrom(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      console.log(`[Email OK] template=${template} to=${opts.to} messageId=${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[Email FAIL] template=${template} to=${opts.to} error=${err?.message || err}`);
      return { success: false, error: err?.message || String(err) };
    }
  }

  static async verify(): Promise<boolean> {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('[Email] SMTP not configured — emails will be logged to console only.');
      return false;
    }
    try {
      await transporter.verify();
      console.log('[Email] SMTP transporter verified OK.');
      return true;
    } catch (err: any) {
      console.error('[Email] SMTP verify FAILED:', err?.message || err);
      return false;
    }
  }
}
```

- [ ] **Step 4.5: Run test to verify it passes**

```bash
cd backend && npx jest src/__tests__/email.test.ts --forceExit
```

Expected: 3 tests pass.

- [ ] **Step 4.6: Commit**

```bash
git add backend/src/lib/email.ts backend/src/lib/email-templates.ts backend/src/__tests__/email.test.ts
git commit -m "feat(email): consolidated EmailService with PT-PT templates"
git push
```

---

## Task 5: Wire EmailService into server boot

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 5.1: Add SMTP verify on boot**

Open `backend/src/server.ts`. Find the `loadSettingsFromDB().then(async () => { ... })` block (around line 603).

Add the following import at the top (with the other imports near line 50):

```typescript
import { EmailService } from './lib/email';
```

Inside the `.then(async () => { ... })` callback, after `await fixWhatsAppSchema();` and before `await ensureDefaultPipelines();`, add:

```typescript
      await EmailService.verify();
```

- [ ] **Step 5.2: Run server and observe**

```bash
cd backend && npm run dev
```

Expected log line: `[Email] SMTP transporter verified OK.`

If you see `[Email] SMTP verify FAILED: ...`, copy the error message — likely Gmail rejecting the app password. Fix the credentials before continuing.

- [ ] **Step 5.3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat(boot): verify SMTP on server start"
git push
```

---

## Task 6: Auth helpers (lib/auth.ts)

**Files:**
- Create: `backend/src/lib/auth.ts`
- Test: `backend/src/__tests__/auth-helpers.test.ts`

- [ ] **Step 6.1: Write the failing test**

Create `backend/src/__tests__/auth-helpers.test.ts`:

```typescript
import { isSuperAdmin, isOwnerLevel, hierarchyRank } from '../lib/auth';

describe('auth helpers', () => {
  it('isSuperAdmin true only for SUPER_ADMIN', () => {
    expect(isSuperAdmin({ role: 'SUPER_ADMIN' } as any)).toBe(true);
    expect(isSuperAdmin({ role: 'AGENCY_OWNER' } as any)).toBe(false);
    expect(isSuperAdmin({ role: 'CONSULTANT' } as any)).toBe(false);
  });

  it('isOwnerLevel true for SUPER_ADMIN, AGENCY_OWNER, AGENCY_ADMIN', () => {
    expect(isOwnerLevel({ role: 'SUPER_ADMIN' } as any)).toBe(true);
    expect(isOwnerLevel({ role: 'AGENCY_OWNER' } as any)).toBe(true);
    expect(isOwnerLevel({ role: 'AGENCY_ADMIN' } as any)).toBe(true);
    expect(isOwnerLevel({ role: 'CONSULTANT' } as any)).toBe(false);
    expect(isOwnerLevel({ role: 'TEAM_LEADER' } as any)).toBe(false);
  });

  it('hierarchyRank orders roles correctly', () => {
    expect(hierarchyRank('SUPER_ADMIN')).toBeGreaterThan(hierarchyRank('AGENCY_OWNER'));
    expect(hierarchyRank('AGENCY_OWNER')).toBeGreaterThan(hierarchyRank('CONSULTANT'));
    expect(hierarchyRank('CONSULTANT')).toBeGreaterThan(hierarchyRank('USER'));
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/auth-helpers.test.ts --forceExit
```

Expected: FAIL with "Cannot find module '../lib/auth'".

- [ ] **Step 6.3: Implement helpers**

Create `backend/src/lib/auth.ts`:

```typescript
import type { Request } from 'express';
import prisma from '../config/database';

export type AuthRole =
  | 'SUPER_ADMIN'
  | 'AGENCY_OWNER'
  | 'AGENCY_ADMIN'
  | 'LOCATION_ADMIN'
  | 'TEAM_LEADER'
  | 'CONSULTANT'
  | 'USER';

const RANK: Record<AuthRole, number> = {
  SUPER_ADMIN: 100,
  AGENCY_OWNER: 80,
  AGENCY_ADMIN: 70,
  LOCATION_ADMIN: 60,
  TEAM_LEADER: 50,
  CONSULTANT: 30,
  USER: 10,
};

export function hierarchyRank(role: string): number {
  return RANK[(role as AuthRole)] ?? 0;
}

export function isSuperAdmin(user: { role: string } | null | undefined): boolean {
  return !!user && user.role === 'SUPER_ADMIN';
}

export function isOwnerLevel(user: { role: string } | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN';
}

export async function getCurrentUser(req: Request) {
  if (!req.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: req.user.id },
    include: { agency: true },
  });
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireRoleHelper(req: Request, ...roles: AuthRole[]) {
  const user = await getCurrentUser(req);
  if (!user) throw new AuthError('Não autenticado', 401);
  if (!roles.includes(user.role as AuthRole)) {
    throw new AuthError('Sem permissões', 403);
  }
  return user;
}
```

- [ ] **Step 6.4: Run test to verify it passes**

```bash
cd backend && npx jest src/__tests__/auth-helpers.test.ts --forceExit
```

Expected: 3 tests pass.

- [ ] **Step 6.5: Add SUPER_ADMIN to existing rbac middleware**

Open `backend/src/middleware/rbac.middleware.ts`. Find the `ROLES` const (line 4) and add `SUPER_ADMIN`:

```typescript
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  AGENCY_OWNER: 'AGENCY_OWNER',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  LOCATION_ADMIN: 'LOCATION_ADMIN',
  TEAM_LEADER: 'TEAM_LEADER',
  CONSULTANT: 'CONSULTANT',
  USER: 'USER',
} as const;
```

Update the `withPermission` middleware (line 57) so SUPER_ADMIN bypasses all permission checks. Add at the top of the inner function, just after the `req.user` null check:

```typescript
    if (user.role === ROLES.SUPER_ADMIN) {
      next();
      return;
    }
```

(Place it before the existing `AGENCY_OWNER || AGENCY_ADMIN` check.)

- [ ] **Step 6.6: Commit**

```bash
git add backend/src/lib/auth.ts backend/src/__tests__/auth-helpers.test.ts backend/src/middleware/rbac.middleware.ts
git commit -m "feat(auth): add lib/auth helpers + SUPER_ADMIN bypass in rbac"
git push
```

---

## Task 7: Disable legacy auth endpoints (login, register, google)

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.router.ts`
- Test: `backend/src/__tests__/auth-legacy-disabled.test.ts`

- [ ] **Step 7.1: Write the failing test**

Create `backend/src/__tests__/auth-legacy-disabled.test.ts`:

```typescript
import request from 'supertest';
import app from '../server';

describe('Legacy auth endpoints disabled', () => {
  it('POST /api/auth/login returns 410 Gone', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'a@b.com',
      password: 'whatever',
    });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/Clerk/i);
  });

  it('POST /api/auth/register returns 410 Gone', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X',
      email: 'a@b.com',
      password: '123456',
    });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/convite/i);
  });

  it('POST /api/auth/google returns 410 Gone', async () => {
    const res = await request(app).post('/api/auth/google').send({ idToken: 'x' });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/Clerk/i);
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/auth-legacy-disabled.test.ts --forceExit
```

Expected: FAIL — current endpoints return 400/401/etc, not 410.

- [ ] **Step 7.3: Replace controllers with 410 responses**

Open `backend/src/modules/auth/auth.controller.ts` and replace the bodies of `register`, `login`, `googleAuth` so they read:

```typescript
export const register = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  res.status(410).json({
    error: 'Registo apenas por convite. Pede um convite ao administrador da agência.',
    status: 410,
  });
};

export const login = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  res.status(410).json({
    error: 'Login email/password descontinuado. Usa o login Clerk.',
    status: 410,
  });
};

export const googleAuth = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  res.status(410).json({
    error: 'Login Google direto descontinuado. Usa o login Clerk (que suporta Google).',
    status: 410,
  });
};
```

Keep `getMe` and `clerkExchange` unchanged.

Also remove the unused imports `authService` and `clerkExchangeService` only if **no other** function references them. `clerkExchange` still uses `clerkExchangeService`, so keep that import. `authService` becomes unused — remove the line `import * as authService from './auth.service';`.

- [ ] **Step 7.4: Update auth.router to drop validate(loginSchema)**

Open `backend/src/modules/auth/auth.router.ts`. Replace its content with:

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', authController.login);          // returns 410
router.post('/register', authController.register);    // returns 410
router.post('/google', authController.googleAuth);    // returns 410
router.get('/me', authenticate, authController.getMe);
router.post('/clerk-exchange', authController.clerkExchange);

export default router;
```

(We keep the routes registered so callers get a clear 410 instead of 404.)

- [ ] **Step 7.5: Run test to verify it passes**

```bash
cd backend && npx jest src/__tests__/auth-legacy-disabled.test.ts --forceExit
```

Expected: 3 tests pass.

- [ ] **Step 7.6: Run pre-existing auth.test.ts to confirm we didn't break it**

```bash
cd backend && npx jest src/__tests__/auth.test.ts --forceExit
```

The existing test expects 400/401 from /login. It will now FAIL. Edit `backend/src/__tests__/auth.test.ts` to assert 410 instead, or delete it (the new test replaces its purpose). Recommended: **delete** `auth.test.ts` since `auth-legacy-disabled.test.ts` covers the new behavior.

```bash
rm backend/src/__tests__/auth.test.ts
```

Re-run all tests to confirm:

```bash
cd backend && npm test
```

Expected: all tests pass (or only fail for pre-existing unrelated reasons; do not fix unrelated failures).

- [ ] **Step 7.7: Commit**

```bash
git add backend/src/modules/auth/auth.controller.ts backend/src/modules/auth/auth.router.ts backend/src/__tests__/
git commit -m "feat(auth): disable legacy login/register/google (410 Gone)"
git push
```

---

## Task 8: Migrate invitations.service to EmailService + add type field

**Files:**
- Modify: `backend/src/modules/invitations/invitations.service.ts`

- [ ] **Step 8.1: Replace inline transporter with EmailService**

Open `backend/src/modules/invitations/invitations.service.ts`.

Replace the top of the file (imports + `getTransporter` helper, lines 1-17) with:

```typescript
import prisma from '../../config/database';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from '../../lib/email';
import { inviteOwnerTemplate, inviteConsultantTemplate } from '../../lib/email-templates';
```

- [ ] **Step 8.2: Update create() to accept and persist type**

Change the `create` function signature (line 19) to:

```typescript
export const create = async (
  email: string,
  role: string,
  invitedById: string,
  locationId?: string,
  permissions?: any,
  agencyId?: string,
  type: 'OWNER' | 'CONSULTANT' = 'CONSULTANT',
) => {
```

Inside the function, in the `prisma.invitation.create` data block (around line 64), add `type`:

```typescript
    prisma.invitation.create({
      data: {
        email, role, type, token, invitedById, expiresAt,
        ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        ...(permissions ? { permissions } : {}),
      },
    }),
```

Replace the email sending block (lines 73-97) with:

```typescript
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').pop()!.trim();
  const inviteUrl = `${clientUrl}/invite/${token}`;

  const inviter = await prisma.user.findUnique({
    where: { id: invitedById },
    select: { name: true, agency: { select: { name: true } } },
  });
  const agencyName = inviter?.agency?.name
    || (resolvedAgencyId ? (await prisma.agency.findUnique({ where: { id: resolvedAgencyId }, select: { name: true } }))?.name : '')
    || 'CasaFlow';
  const inviterName = inviter?.name || 'Administrador';

  const html = type === 'OWNER'
    ? inviteOwnerTemplate({ agencyName, inviteUrl, expiresAt })
    : inviteConsultantTemplate({ agencyName, inviterName, inviteUrl, expiresAt });

  const subject = type === 'OWNER'
    ? `Convite para gerir a agência ${agencyName} no CasaFlow`
    : `Foste convidado para a equipa de ${agencyName}`;

  await EmailService.send({
    to: email,
    subject,
    html,
    template: type === 'OWNER' ? 'invite-owner' : 'invite-consultant',
  });

  return invitation;
};
```

- [ ] **Step 8.3: Add resend function**

At the end of `backend/src/modules/invitations/invitations.service.ts`, after `revoke`, append:

```typescript
export const resend = async (invitationId: string, requestUserId: string) => {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw Object.assign(new Error('Convite não encontrado'), { status: 404 });
  if (invitation.usedAt) throw Object.assign(new Error('Convite já foi aceite'), { status: 410 });

  const newToken = crypto.randomUUID();
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: { token: newToken, expiresAt: newExpires },
  });

  // Resend email reusing create()'s template logic
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').pop()!.trim();
  const inviteUrl = `${clientUrl}/invite/${newToken}`;

  const inviter = await prisma.user.findUnique({
    where: { id: requestUserId },
    select: { name: true, agency: { select: { name: true } } },
  });
  const agencyName = inviter?.agency?.name
    || (invitation.agencyId ? (await prisma.agency.findUnique({ where: { id: invitation.agencyId }, select: { name: true } }))?.name : '')
    || 'CasaFlow';
  const inviterName = inviter?.name || 'Administrador';
  const isOwner = (invitation as any).type === 'OWNER';

  const html = isOwner
    ? inviteOwnerTemplate({ agencyName, inviteUrl, expiresAt: newExpires })
    : inviteConsultantTemplate({ agencyName, inviterName, inviteUrl, expiresAt: newExpires });

  await EmailService.send({
    to: invitation.email,
    subject: isOwner
      ? `Convite (reenviado) para gerir a agência ${agencyName}`
      : `Convite (reenviado) para a equipa de ${agencyName}`,
    html,
    template: isOwner ? 'invite-owner-resend' : 'invite-consultant-resend',
  });

  return updated;
};
```

- [ ] **Step 8.4: Build to confirm types are OK**

```bash
cd backend && npm run build
```

Expected: build succeeds. If TypeScript complains about `invitation as any` for `.type`, that's expected because Prisma Client cache may be stale. Re-run:

```bash
cd backend && npx prisma generate && npm run build
```

- [ ] **Step 8.5: Commit**

```bash
git add backend/src/modules/invitations/invitations.service.ts
git commit -m "feat(invitations): use EmailService + persist type + resend()"
git push
```

---

## Task 9: Add resend endpoint to invitations router

**Files:**
- Modify: `backend/src/modules/invitations/invitations.controller.ts`
- Modify: `backend/src/modules/invitations/invitations.router.ts`
- Test: `backend/src/__tests__/invitations-resend.test.ts`

- [ ] **Step 9.1: Add controller**

Open `backend/src/modules/invitations/invitations.controller.ts`. Append at the end:

```typescript
export const resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await invitationsService.resend(req.params.id, req.user.id);
    res.status(200).json(updated);
  } catch (err) { next(err); }
};
```

- [ ] **Step 9.2: Add route**

Open `backend/src/modules/invitations/invitations.router.ts`. After the `router.delete(...)` line (line 17), add:

```typescript
router.post('/:id/resend', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN', 'SUPER_ADMIN'), ctrl.resend);
```

Also add `'SUPER_ADMIN'` to the role lists of the existing list/create/delete routes:

```typescript
router.get('/', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN', 'SUPER_ADMIN'), ctrl.list);
router.post('/', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN', 'SUPER_ADMIN'), validate(createInvitationSchema), ctrl.create);
router.delete('/:id', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'SUPER_ADMIN'), ctrl.revoke);
```

- [ ] **Step 9.3: Build and test endpoints exist**

```bash
cd backend && npm run build
```

Expected: build succeeds.

- [ ] **Step 9.4: Commit**

```bash
git add backend/src/modules/invitations/
git commit -m "feat(invitations): POST /:id/resend endpoint + SUPER_ADMIN access"
git push
```

---

## Task 10: Update clerk-exchange to handle OWNER invites (auto-create Agency)

**Files:**
- Modify: `backend/src/modules/auth/clerk-exchange.service.ts`

- [ ] **Step 10.1: Read current file**

Open `backend/src/modules/auth/clerk-exchange.service.ts` and re-read the full file to remember where to insert.

- [ ] **Step 10.2: Replace the email-lookup block to handle OWNER type**

Find the block starting at line 36:

```typescript
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
```

Replace from line 36 down through line 56 (the `await prisma.invitation.updateMany(...)` block) with:

```typescript
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });

      // Find a matching pending invitation (any type)
      const pendingInvite = await prisma.invitation.findFirst({
        where: { email, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      const inviteType = (pendingInvite as any)?.type as 'OWNER' | 'CONSULTANT' | undefined;

      if (user && user.clerkUserId === null) {
        // First-time Clerk login for an invited user
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkUserId,
            isActive: true,
            name: name || user.name || email.split('@')[0],
          },
        });

        if (pendingInvite) {
          await prisma.invitation.update({
            where: { id: pendingInvite.id },
            data: { usedAt: new Date() },
          });
        }
      } else if (!user && pendingInvite && inviteType === 'OWNER' && pendingInvite.agencyId) {
        // OWNER invite path: no User row exists yet (agency was created by super-admin
        // without an inactive placeholder). Create the user now and link to the agency.
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];
        user = await prisma.user.create({
          data: {
            clerkUserId,
            email,
            name,
            role: 'AGENCY_OWNER' as any,
            isActive: true,
            agencyId: pendingInvite.agencyId,
          },
        });
        await prisma.invitation.update({
          where: { id: pendingInvite.id },
          data: { usedAt: new Date() },
        });
      }
    }
```

- [ ] **Step 10.3: Build to confirm types**

```bash
cd backend && npm run build
```

Expected: build succeeds.

- [ ] **Step 10.4: Commit**

```bash
git add backend/src/modules/auth/clerk-exchange.service.ts
git commit -m "feat(auth): clerk-exchange handles OWNER invite auto-link"
git push
```

---

## Task 11: super-admin module (agencies CRUD + invite owner)

**Files:**
- Create: `backend/src/modules/super-admin/super-admin.service.ts`
- Create: `backend/src/modules/super-admin/super-admin.controller.ts`
- Create: `backend/src/modules/super-admin/super-admin.router.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/src/__tests__/super-admin.test.ts`

- [ ] **Step 11.1: Write the failing test**

Create `backend/src/__tests__/super-admin.test.ts`:

```typescript
import request from 'supertest';
import app from '../server';
import prisma from '../config/database';
import { signToken } from '../utils/jwt';

async function ensureSuperAdmin() {
  const user = await prisma.user.upsert({
    where: { email: 'superadmin-test@test.com' },
    update: { role: 'SUPER_ADMIN' as any, isActive: true, agencyId: null },
    create: {
      email: 'superadmin-test@test.com',
      name: 'Super',
      role: 'SUPER_ADMIN' as any,
      isActive: true,
    },
  });
  return { user, token: signToken({ userId: user.id, role: user.role }) };
}

describe('super-admin agencies', () => {
  let token: string;
  let createdAgencyId: string | null = null;

  beforeAll(async () => {
    ({ token } = await ensureSuperAdmin());
  });

  afterAll(async () => {
    if (createdAgencyId) {
      await prisma.invitation.deleteMany({ where: { agencyId: createdAgencyId } });
      await prisma.user.deleteMany({ where: { agencyId: createdAgencyId } });
      await prisma.agency.deleteMany({ where: { id: createdAgencyId } });
    }
    await prisma.user.deleteMany({ where: { email: 'superadmin-test@test.com' } });
    await prisma.user.deleteMany({ where: { email: 'owner-e2e@test.com' } });
  });

  it('GET /api/super-admin/agencies requires SUPER_ADMIN', async () => {
    const res = await request(app).get('/api/super-admin/agencies');
    expect(res.status).toBe(401);
  });

  it('POST /api/super-admin/agencies creates agency + owner invitation', async () => {
    const res = await request(app)
      .post('/api/super-admin/agencies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Agência E2E Test',
        slug: `agencia-e2e-${Date.now()}`,
        ownerEmail: 'owner-e2e@test.com',
        ownerName: 'Owner Test',
      });
    expect(res.status).toBe(201);
    expect(res.body.agency).toHaveProperty('id');
    expect(res.body.invitation).toHaveProperty('token');
    expect(res.body.invitation.type).toBe('OWNER');
    expect(res.body.invitation.role).toBe('AGENCY_OWNER');
    createdAgencyId = res.body.agency.id;
  });

  it('GET /api/super-admin/agencies lists the new agency', async () => {
    const res = await request(app)
      .get('/api/super-admin/agencies')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.find((a: any) => a.id === createdAgencyId)).toBeDefined();
  });
});
```

- [ ] **Step 11.2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/super-admin.test.ts --forceExit
```

Expected: FAIL — endpoints don't exist (404).

- [ ] **Step 11.3: Create service**

Create `backend/src/modules/super-admin/super-admin.service.ts`:

```typescript
import prisma from '../../config/database';
import crypto from 'crypto';
import { EmailService } from '../../lib/email';
import { inviteOwnerTemplate } from '../../lib/email-templates';

function clientUrl(): string {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',').pop()!.trim();
}

export async function listAgencies() {
  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      users: { select: { id: true, role: true, email: true, isActive: true } },
    },
  });
  return agencies.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    isActive: a.isActive,
    createdAt: a.createdAt,
    memberCount: a.users.filter((u) => u.isActive).length,
    ownerEmail: a.users.find((u) => u.role === 'AGENCY_OWNER')?.email || null,
  }));
}

export async function getAgencyDetail(id: string) {
  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });

  const invitations = await prisma.invitation.findMany({
    where: { agencyId: id },
    orderBy: { createdAt: 'desc' },
  });

  return {
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      isActive: agency.isActive,
      createdAt: agency.createdAt,
    },
    members: agency.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
    invitations,
  };
}

export async function createAgencyWithOwner(opts: {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName?: string;
  invitedById: string;
}) {
  // Validate slug uniqueness
  const existingSlug = await prisma.agency.findUnique({ where: { slug: opts.slug } });
  if (existingSlug) throw Object.assign(new Error('Slug já existe'), { status: 409 });

  // Validate owner email not already an active user in another agency
  const existingUser = await prisma.user.findUnique({ where: { email: opts.ownerEmail } });
  if (existingUser && existingUser.isActive && existingUser.agencyId) {
    throw Object.assign(new Error('Email já pertence a outra agência'), { status: 409 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({
      data: { name: opts.name, slug: opts.slug },
    });
    const invitation = await tx.invitation.create({
      data: {
        email: opts.ownerEmail,
        role: 'AGENCY_OWNER',
        type: 'OWNER',
        token,
        invitedById: opts.invitedById,
        expiresAt,
        agencyId: agency.id,
      },
    });
    return { agency, invitation };
  });

  // Send email outside the transaction
  const inviteUrl = `${clientUrl()}/invite/${token}`;
  const html = inviteOwnerTemplate({
    agencyName: opts.name,
    inviteUrl,
    expiresAt,
  });
  await EmailService.send({
    to: opts.ownerEmail,
    subject: `Convite para gerir a agência ${opts.name} no CasaFlow`,
    html,
    template: 'invite-owner',
  });

  return result;
}

export async function updateAgency(id: string, data: { name?: string; slug?: string; isActive?: boolean }) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });

  if (data.slug && data.slug !== agency.slug) {
    const conflict = await prisma.agency.findUnique({ where: { slug: data.slug } });
    if (conflict) throw Object.assign(new Error('Slug já existe'), { status: 409 });
  }

  return prisma.agency.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deactivateAgency(id: string) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });
  return prisma.agency.update({
    where: { id },
    data: { isActive: false },
  });
}
```

- [ ] **Step 11.4: Create controller**

Create `backend/src/modules/super-admin/super-admin.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import * as svc from './super-admin.service';

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.listAgencies()); } catch (e) { next(e); }
};

export const detail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await svc.getAgencyDetail(req.params.id)); } catch (e) { next(e); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, ownerEmail, ownerName } = req.body;
    if (!name || !slug || !ownerEmail) {
      res.status(400).json({ error: 'name, slug e ownerEmail são obrigatórios', status: 400 });
      return;
    }
    const result = await svc.createAgencyWithOwner({
      name, slug, ownerEmail, ownerName,
      invitedById: req.user.id,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await svc.updateAgency(req.params.id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await svc.deactivateAgency(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};
```

- [ ] **Step 11.5: Create router**

Create `backend/src/modules/super-admin/super-admin.router.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './super-admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/agencies', ctrl.list);
router.post('/agencies', ctrl.create);
router.get('/agencies/:id', ctrl.detail);
router.patch('/agencies/:id', ctrl.update);
router.delete('/agencies/:id', ctrl.remove);

export default router;
```

- [ ] **Step 11.6: Register router in server.ts**

Open `backend/src/server.ts`. Find the imports block (around line 11) and add:

```typescript
import superAdminRouter from './modules/super-admin/super-admin.router';
```

In the routes section (around line 343), after `app.use('/api/whatsapp', whatsappRouter);` add:

```typescript
app.use('/api/super-admin', superAdminRouter);
```

- [ ] **Step 11.7: Run test to verify it passes**

```bash
cd backend && npx jest src/__tests__/super-admin.test.ts --forceExit
```

Expected: 3 tests pass.

- [ ] **Step 11.8: Commit**

```bash
git add backend/src/modules/super-admin/ backend/src/server.ts backend/src/__tests__/super-admin.test.ts
git commit -m "feat(super-admin): agencies CRUD + auto-invite owner"
git push
```

---

## Task 12: team module (member management)

**Files:**
- Create: `backend/src/modules/team/team.service.ts`
- Create: `backend/src/modules/team/team.controller.ts`
- Create: `backend/src/modules/team/team.router.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/src/__tests__/team.test.ts`

- [ ] **Step 12.1: Write the failing test**

Create `backend/src/__tests__/team.test.ts`:

```typescript
import request from 'supertest';
import app from '../server';
import prisma from '../config/database';
import { signToken } from '../utils/jwt';

async function setup() {
  const agency = await prisma.agency.create({
    data: { name: 'Team Test Agency', slug: `team-test-${Date.now()}` },
  });
  const owner = await prisma.user.create({
    data: {
      email: `owner-team-${Date.now()}@test.com`,
      name: 'Owner',
      role: 'AGENCY_OWNER' as any,
      isActive: true,
      agencyId: agency.id,
    },
  });
  const consultant = await prisma.user.create({
    data: {
      email: `consultant-team-${Date.now()}@test.com`,
      name: 'Consultant',
      role: 'CONSULTANT' as any,
      isActive: true,
      agencyId: agency.id,
    },
  });
  const ownerToken = signToken({ userId: owner.id, role: owner.role });
  return { agency, owner, consultant, ownerToken };
}

describe('team management', () => {
  let s: Awaited<ReturnType<typeof setup>>;

  beforeAll(async () => { s = await setup(); });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { agencyId: s.agency.id } });
    await prisma.agency.delete({ where: { id: s.agency.id } });
  });

  it('GET /api/team/members lists agency members', async () => {
    const res = await request(app)
      .get('/api/team/members')
      .set('Authorization', `Bearer ${s.ownerToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((u: any) => u.id);
    expect(ids).toContain(s.owner.id);
    expect(ids).toContain(s.consultant.id);
  });

  it('PATCH /api/team/members/:id changes role', async () => {
    const res = await request(app)
      .patch(`/api/team/members/${s.consultant.id}`)
      .set('Authorization', `Bearer ${s.ownerToken}`)
      .send({ role: 'TEAM_LEADER' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('TEAM_LEADER');
  });

  it('PATCH cannot promote to SUPER_ADMIN', async () => {
    const res = await request(app)
      .patch(`/api/team/members/${s.consultant.id}`)
      .set('Authorization', `Bearer ${s.ownerToken}`)
      .send({ role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/team/members/:id deactivates user', async () => {
    const res = await request(app)
      .delete(`/api/team/members/${s.consultant.id}`)
      .set('Authorization', `Bearer ${s.ownerToken}`);
    expect(res.status).toBe(204);
    const reread = await prisma.user.findUnique({ where: { id: s.consultant.id } });
    expect(reread?.isActive).toBe(false);
  });

  it('cannot deactivate self', async () => {
    const res = await request(app)
      .delete(`/api/team/members/${s.owner.id}`)
      .set('Authorization', `Bearer ${s.ownerToken}`);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 12.2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/team.test.ts --forceExit
```

Expected: FAIL with 404 (endpoints don't exist).

- [ ] **Step 12.3: Create service**

Create `backend/src/modules/team/team.service.ts`:

```typescript
import prisma from '../../config/database';
import { createClerkClient } from '@clerk/backend';

const ALLOWED_ROLES_TO_ASSIGN = [
  'AGENCY_OWNER',
  'AGENCY_ADMIN',
  'LOCATION_ADMIN',
  'TEAM_LEADER',
  'CONSULTANT',
] as const;

function getClerk() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  return createClerkClient({ secretKey: key });
}

export async function listMembers(agencyId: string | null) {
  if (!agencyId) {
    // SUPER_ADMIN with no ?agencyId — return empty (must scope explicitly)
    return [];
  }
  return prisma.user.findMany({
    where: { agencyId },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      avatarUrl: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateMember(opts: {
  memberId: string;
  agencyId: string | null; // null for SUPER_ADMIN
  changes: { role?: string; isActive?: boolean };
}) {
  const member = await prisma.user.findUnique({ where: { id: opts.memberId } });
  if (!member) throw Object.assign(new Error('Membro não encontrado'), { status: 404 });

  // Scope check: non-super-admin can only touch members of their own agency
  if (opts.agencyId && member.agencyId !== opts.agencyId) {
    throw Object.assign(new Error('Membro não encontrado'), { status: 404 });
  }

  if (opts.changes.role !== undefined) {
    if (!ALLOWED_ROLES_TO_ASSIGN.includes(opts.changes.role as any)) {
      throw Object.assign(new Error('Role inválido ou não permitido'), { status: 403 });
    }
  }

  return prisma.user.update({
    where: { id: opts.memberId },
    data: {
      ...(opts.changes.role !== undefined ? { role: opts.changes.role as any } : {}),
      ...(opts.changes.isActive !== undefined ? { isActive: opts.changes.isActive } : {}),
    },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      avatarUrl: true, createdAt: true,
    },
  });
}

export async function deactivateMember(opts: {
  memberId: string;
  requestUserId: string;
  agencyId: string | null;
}) {
  if (opts.memberId === opts.requestUserId) {
    throw Object.assign(new Error('Não podes desativar a tua própria conta'), { status: 400 });
  }

  const member = await prisma.user.findUnique({ where: { id: opts.memberId } });
  if (!member) throw Object.assign(new Error('Membro não encontrado'), { status: 404 });
  if (opts.agencyId && member.agencyId !== opts.agencyId) {
    throw Object.assign(new Error('Membro não encontrado'), { status: 404 });
  }

  await prisma.user.update({
    where: { id: opts.memberId },
    data: { isActive: false },
  });

  // Best-effort Clerk ban (don't block on failure)
  if (member.clerkUserId) {
    try {
      const clerk = getClerk();
      if (clerk) await clerk.users.banUser(member.clerkUserId);
    } catch (err) {
      console.error('[team] Clerk ban failed (non-fatal):', err);
    }
  }
}
```

- [ ] **Step 12.4: Create controller**

Create `backend/src/modules/team/team.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import * as svc from './team.service';

function scopeAgency(req: Request): string | null {
  if (req.user.role === 'SUPER_ADMIN') {
    return (req.query.agencyId as string) || null;
  }
  return req.user.agencyId || null;
}

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const members = await svc.listMembers(scopeAgency(req));
    res.json(members);
  } catch (e) { next(e); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await svc.updateMember({
      memberId: req.params.id,
      agencyId: req.user.role === 'SUPER_ADMIN' ? null : req.user.agencyId,
      changes: { role: req.body.role, isActive: req.body.isActive },
    });
    res.json(updated);
  } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await svc.deactivateMember({
      memberId: req.params.id,
      requestUserId: req.user.id,
      agencyId: req.user.role === 'SUPER_ADMIN' ? null : req.user.agencyId,
    });
    res.status(204).send();
  } catch (e) { next(e); }
};
```

- [ ] **Step 12.5: Create router**

Create `backend/src/modules/team/team.router.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './team.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'SUPER_ADMIN'));

router.get('/members', ctrl.list);
router.patch('/members/:id', ctrl.update);
router.delete('/members/:id', ctrl.remove);

export default router;
```

- [ ] **Step 12.6: Register in server.ts**

Open `backend/src/server.ts`. Add to imports near line 11:

```typescript
import teamRouter from './modules/team/team.router';
```

Add to routes section (after `app.use('/api/super-admin', superAdminRouter);`):

```typescript
app.use('/api/team', teamRouter);
```

- [ ] **Step 12.7: Run test to verify it passes**

```bash
cd backend && npx jest src/__tests__/team.test.ts --forceExit
```

Expected: 5 tests pass.

- [ ] **Step 12.8: Commit**

```bash
git add backend/src/modules/team/ backend/src/server.ts backend/src/__tests__/team.test.ts
git commit -m "feat(team): member list/update/deactivate endpoints"
git push
```

---

## Task 13: Frontend — substitute LoginPage and remove RegisterPage

**Files:**
- Delete: `frontend/src/pages/RegisterPage.tsx`
- Delete: `frontend/src/pages/ClerkLoginPage.tsx`
- Replace: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api/auth.api.ts`
- Modify: `frontend/src/store/auth.store.ts`

- [ ] **Step 13.1: Replace LoginPage with Clerk version**

Open `frontend/src/pages/LoginPage.tsx` and **fully replace** its content with the visual identity of the existing LoginPage but using Clerk's `<SignIn>` widget. Use this content:

```typescript
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession, useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'
import { CasaFlowLogo } from '../assets/casaflow-logo'

const T = {
  navy:    '#0f2553',
  navyMid: '#1a3a6e',
  gold:    '#b8963e',
  goldLt:  '#d4af5a',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
  error:   '#c0392b',
}

const Spinner: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: T.offWhite }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: `4px solid ${T.navy}`, borderTopColor: 'transparent',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export const LoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { signOut } = useClerk()
  const { clerkExchange, token, hydrated, logout } = useAuthStore()
  const navigate = useNavigate()
  const exchanging = useRef(false)
  const lastSessionId = useRef<string | null>(null)
  const [exchangeFailed, setExchangeFailed] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !hydrated) return
    if (isSignedIn && token) { navigate('/dashboard', { replace: true }); return }
    if (!isSignedIn || !session) return

    if (lastSessionId.current !== session.id) {
      lastSessionId.current = session.id
      exchanging.current = false
      setExchangeFailed(null)
    }

    if (exchanging.current || exchangeFailed) return
    exchanging.current = true

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) { exchanging.current = false; return }
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err: any) {
        console.error('Clerk exchange failed:', err)
        logout()
        await signOut()
        exchanging.current = false
        setExchangeFailed(err?.message || 'Erro de autenticação')
      }
    })
  }, [isLoaded, hydrated, isSignedIn, session, token, clerkExchange, navigate, exchangeFailed, logout, signOut])

  if (!isLoaded || !hydrated) return <Spinner />
  if (isSignedIn && !token && !exchangeFailed) return <Spinner />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: T.white }}>
      <div style={{
        width: '44%', background: T.navy, display: 'none', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 52px', position: 'relative', overflow: 'hidden',
      }} className="cf-left-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <CasaFlowLogo size={36} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.white, letterSpacing: '-0.02em' }}>
              CASA<span style={{ fontWeight: 400 }}>FLOW</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1 }}>
              CRM Imobiliário
            </div>
          </div>
        </div>
        <div>
          <div style={{ width: 40, height: 3, background: T.gold, borderRadius: 2, marginBottom: 28 }} />
          <h2 style={{ fontSize: 36, fontWeight: 700, color: T.white, lineHeight: 1.18, letterSpacing: '-0.03em', margin: 0, marginBottom: 20 }}>
            Gerencie o seu<br />
            negócio imobiliário<br />
            <span style={{ color: T.goldLt }}>com confiança.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0, fontWeight: 300, maxWidth: 300 }}>
            Contactos, oportunidades e propriedades centralizados numa única plataforma.
          </p>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          © {new Date().getFullYear()} CasaFlow · Todos os direitos reservados
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: T.white }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {exchangeFailed && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(192,57,43,0.06)', border: `1px solid rgba(192,57,43,0.2)`,
              color: T.error, fontSize: 13,
            }}>
              {exchangeFailed}
            </div>
          )}
          <SignIn routing="hash" appearance={{ elements: { card: 'shadow-none', rootBox: 'mx-auto' } }} />
          <p style={{ textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 24, fontWeight: 300 }}>
            Acesso por convite. Se não tens convite, contacta o teu administrador.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .cf-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 13.2: Delete RegisterPage and ClerkLoginPage**

```bash
rm frontend/src/pages/RegisterPage.tsx frontend/src/pages/ClerkLoginPage.tsx
```

- [ ] **Step 13.3: Update App.tsx imports and routes**

Open `frontend/src/App.tsx`. Make these edits:

Find the import line:
```typescript
import { ClerkLoginPage } from './pages/ClerkLoginPage'
```
Replace with:
```typescript
import { LoginPage } from './pages/LoginPage'
```

Find the route:
```typescript
<Route path="/login" element={<ClerkLoginPage />} />
```
Replace with:
```typescript
<Route path="/login" element={<LoginPage />} />
```

The route `<Route path="/register" element={<Navigate to="/login" replace />} />` is already correct — leave it.

- [ ] **Step 13.4: Slim down auth.api.ts**

Open `frontend/src/api/auth.api.ts` and **fully replace** with:

```typescript
import api from './client'

export const getMe = () => api.get('/auth/me')
```

- [ ] **Step 13.5: Build frontend to confirm**

```bash
cd frontend && npm run build
```

Expected: build succeeds. If TypeScript errors appear about `login`, `register`, `googleLogin` no longer existing, they come from imports elsewhere — search and remove those imports. The most likely callers were `LoginPage` and `RegisterPage`, which are now gone.

```bash
cd frontend && npx grep -rn "from.*auth.api" src/ 2>/dev/null
```

Inspect each match and remove references to deleted exports.

- [ ] **Step 13.6: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/App.tsx frontend/src/api/auth.api.ts
git rm frontend/src/pages/RegisterPage.tsx frontend/src/pages/ClerkLoginPage.tsx
git commit -m "feat(frontend): Clerk-only login, remove RegisterPage and email/password"
git push
```

---

## Task 14: Frontend — RoleGuard component + types

**Files:**
- Create: `frontend/src/components/auth/RoleGuard.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/utils/constants.ts`

- [ ] **Step 14.1: Add SUPER_ADMIN to Role type**

Open `frontend/src/types/index.ts`. Find the `Role` type (search for `Role =` or `type Role`). It is likely something like:

```typescript
export type Role = 'AGENCY_OWNER' | 'AGENCY_ADMIN' | ...
```

Add `'SUPER_ADMIN'` as the first option:

```typescript
export type Role = 'SUPER_ADMIN' | 'AGENCY_OWNER' | 'AGENCY_ADMIN' | 'LOCATION_ADMIN' | 'TEAM_LEADER' | 'CONSULTANT' | 'USER'
```

- [ ] **Step 14.2: Add SUPER_ADMIN label**

Open `frontend/src/utils/constants.ts`. Find `ROLE_LABELS` and add the entry:

```typescript
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  AGENCY_OWNER: 'Dono da Agência',
  AGENCY_ADMIN: 'Administrador',
  LOCATION_ADMIN: 'Administrador de Local',
  TEAM_LEADER: 'Líder de Equipa',
  CONSULTANT: 'Consultor',
  USER: 'Utilizador',
}
```

(If `ROLE_LABELS` already exists with different keys, just **add** `SUPER_ADMIN: 'Super Admin'` without removing the others.)

- [ ] **Step 14.3: Create RoleGuard**

Create `frontend/src/components/auth/RoleGuard.tsx`:

```typescript
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import type { Role } from '../../types'

interface Props {
  roles: Role[]
  children: React.ReactNode
  fallback?: string
}

export const RoleGuard: React.FC<Props> = ({ roles, children, fallback = '/403' }) => {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role as Role)) return <Navigate to={fallback} replace />
  return <>{children}</>
}
```

- [ ] **Step 14.4: Build to confirm**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 14.5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/utils/constants.ts frontend/src/components/auth/RoleGuard.tsx
git commit -m "feat(frontend): SUPER_ADMIN role + RoleGuard component"
git push
```

---

## Task 15: Frontend — super-admin pages

**Files:**
- Create: `frontend/src/api/super-admin.api.ts`
- Create: `frontend/src/pages/super-admin/SuperAdminLayout.tsx`
- Create: `frontend/src/pages/super-admin/SuperAdminAgenciesPage.tsx`
- Create: `frontend/src/pages/super-admin/SuperAdminAgencyDetailPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 15.1: Create API client**

Create `frontend/src/api/super-admin.api.ts`:

```typescript
import api from './client'

export interface AgencySummary {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  memberCount: number
  ownerEmail: string | null
}

export interface AgencyDetail {
  agency: { id: string; name: string; slug: string; isActive: boolean; createdAt: string }
  members: Array<{ id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }>
  invitations: Array<{ id: string; email: string; role: string; type: string; expiresAt: string; usedAt: string | null; createdAt: string }>
}

export const listAgencies = () => api.get<AgencySummary[]>('/super-admin/agencies')

export const createAgency = (data: { name: string; slug: string; ownerEmail: string; ownerName?: string }) =>
  api.post<{ agency: AgencySummary; invitation: { token: string; email: string; type: string } }>('/super-admin/agencies', data)

export const getAgencyDetail = (id: string) => api.get<AgencyDetail>(`/super-admin/agencies/${id}`)

export const updateAgency = (id: string, data: { name?: string; slug?: string; isActive?: boolean }) =>
  api.patch<AgencySummary>(`/super-admin/agencies/${id}`, data)

export const deactivateAgency = (id: string) => api.delete(`/super-admin/agencies/${id}`)
```

- [ ] **Step 15.2: Create SuperAdminLayout**

Create `frontend/src/pages/super-admin/SuperAdminLayout.tsx`:

```typescript
import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '../../store/auth.store'

export const SuperAdminLayout: React.FC = () => {
  const { signOut } = useClerk()
  const { logout } = useAuthStore()
  const loc = useLocation()
  const handleLogout = async () => {
    logout()
    await signOut()
    window.location.href = '/login'
  }
  const isAgencies = loc.pathname.startsWith('/super-admin/agencies')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fc', fontFamily: "'DM Sans', sans-serif" }}>
      <aside style={{
        width: 240, background: '#0f2553', color: '#fff', padding: '24px 18px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <ShieldCheck size={22} style={{ color: '#d4af5a' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>Super Admin</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>CasaFlow</div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link to="/super-admin/agencies" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
              color: isAgencies ? '#fff' : 'rgba(255,255,255,0.6)',
              background: isAgencies ? 'rgba(255,255,255,0.08)' : 'transparent',
              fontSize: 13, fontWeight: 500,
            }}>
              <Building2 size={16} /> Agências
            </Link>
          </nav>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', borderRadius: 8, background: 'transparent',
          border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          <LogOut size={16} /> Sair
        </button>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 15.3: Create SuperAdminAgenciesPage**

Create `frontend/src/pages/super-admin/SuperAdminAgenciesPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, X } from 'lucide-react'
import { listAgencies, createAgency, AgencySummary } from '../../api/super-admin.api'
import { useUIStore } from '../../store/ui.store'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const SuperAdminAgenciesPage: React.FC = () => {
  const { showToast } = useUIStore()
  const navigate = useNavigate()
  const [agencies, setAgencies] = useState<AgencySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', ownerEmail: '', ownerName: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await listAgencies()
      setAgencies(res.data)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao carregar agências', 'error')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleNameChange = (v: string) => {
    setForm(f => ({ ...f, name: v, slug: f.slug || slugify(v) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createAgency({
        name: form.name.trim(),
        slug: form.slug.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerName: form.ownerName.trim() || undefined,
      })
      showToast('Agência criada e convite enviado.', 'success')
      setOpen(false); setForm({ name: '', slug: '', ownerEmail: '', ownerName: '' })
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao criar agência', 'error')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building2 size={24} style={{ color: '#0f2553' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Agências</h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Gestão de clientes diretos da plataforma</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', borderRadius: 10, background: '#0f2553', color: '#fff',
          border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Plus size={14} /> Nova Agência
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7a99' }}>A carregar...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Agência', 'Slug', 'Owner', 'Membros', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.07em',
                    borderBottom: '1px solid #e5e9f2',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#6b7a99' }}>
                  Nenhuma agência. Cria a primeira.
                </td></tr>
              ) : agencies.map(a => (
                <tr key={a.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: '#0f2553' }}>{a.name}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#6b7a99' }}>{a.slug}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#6b7a99' }}>{a.ownerEmail || <em>pendente</em>}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: '#374151' }}>{a.memberCount}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 600, color: a.isActive ? '#22c55e' : '#ef4444' }}>
                    {a.isActive ? '● Ativa' : '● Inativa'}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button onClick={() => navigate(`/super-admin/agencies/${a.id}`)} style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid #dce3ef',
                      background: '#fff', color: '#0f2553', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,37,83,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, position: 'relative' }}>
            <button onClick={() => setOpen(false)} style={{
              position: 'absolute', top: 16, right: 16, background: 'transparent',
              border: 'none', cursor: 'pointer', color: '#6b7a99',
            }}><X size={18} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f2553', margin: '0 0 20px' }}>Nova Agência</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nome">
                <input required value={form.name} onChange={e => handleNameChange(e.target.value)}
                       style={inputStyle} placeholder="Imobiliária Exemplo" />
              </Field>
              <Field label="Slug">
                <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                       style={inputStyle} placeholder="imobiliaria-exemplo" />
              </Field>
              <Field label="Email do dono">
                <input required type="email" value={form.ownerEmail}
                       onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))}
                       style={inputStyle} placeholder="dono@exemplo.pt" />
              </Field>
              <Field label="Nome do dono (opcional)">
                <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                       style={inputStyle} placeholder="João Silva" />
              </Field>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  padding: '10px 18px', borderRadius: 8, border: '1px solid #dce3ef',
                  background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancelar</button>
                <button type="submit" disabled={submitting} style={{
                  padding: '10px 18px', borderRadius: 8, border: 'none',
                  background: '#0f2553', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}>{submitting ? 'A criar...' : 'Criar e convidar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #dce3ef', fontSize: 13, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7a99',
      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
    }}>{label}</label>
    {children}
  </div>
)
```

- [ ] **Step 15.4: Create SuperAdminAgencyDetailPage**

Create `frontend/src/pages/super-admin/SuperAdminAgencyDetailPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import { getAgencyDetail, AgencyDetail, updateAgency } from '../../api/super-admin.api'
import { useUIStore } from '../../store/ui.store'
import { ROLE_LABELS } from '../../utils/constants'

export const SuperAdminAgencyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [data, setData] = useState<AgencyDetail | null>(null)
  const [tab, setTab] = useState<'members' | 'invitations' | 'settings'>('members')

  const load = async () => {
    if (!id) return
    try {
      const res = await getAgencyDetail(id)
      setData(res.data)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro a carregar agência', 'error')
    }
  }
  useEffect(() => { load() }, [id])

  if (!data) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7a99' }}>A carregar...</div>

  const toggleActive = async () => {
    try {
      await updateAgency(id!, { isActive: !data.agency.isActive })
      showToast(data.agency.isActive ? 'Agência desativada' : 'Agência reativada', 'success')
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro', 'error')
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/super-admin/agencies')} style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18,
        background: 'transparent', border: 'none', color: '#6b7a99', cursor: 'pointer',
        fontSize: 13, fontFamily: 'inherit',
      }}>
        <ArrowLeft size={14} /> Voltar
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>
        {data.agency.name}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7a99', marginTop: 4 }}>
        {data.agency.slug} · {data.agency.isActive ? 'Ativa' : 'Inativa'}
      </p>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e9f2', marginTop: 24, marginBottom: 18 }}>
        {(['members', 'invitations', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none',
            borderBottom: tab === t ? '2px solid #0f2553' : '2px solid transparent',
            color: tab === t ? '#0f2553' : '#6b7a99',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t === 'members' ? 'Membros' : t === 'invitations' ? 'Convites' : 'Definições'}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <table style={tableStyle}>
          <thead><tr>{['Nome', 'Email', 'Role', 'Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {data.members.map(m => (
              <tr key={m.id}>
                <td style={tdStyle}>{m.name}</td>
                <td style={tdStyle}>{m.email}</td>
                <td style={tdStyle}>{ROLE_LABELS[m.role] || m.role}</td>
                <td style={{ ...tdStyle, color: m.isActive ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {m.isActive ? '● Ativo' : '● Inativo'}
                </td>
              </tr>
            ))}
            {data.members.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#6b7a99' }}>Sem membros.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {tab === 'invitations' && (
        <table style={tableStyle}>
          <thead><tr>{['Email', 'Tipo', 'Role', 'Expira', 'Estado'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {data.invitations.map(inv => {
              const expired = new Date(inv.expiresAt) < new Date()
              const status = inv.usedAt ? 'aceite' : (expired ? 'expirado' : 'pendente')
              const color = inv.usedAt ? '#22c55e' : (expired ? '#ef4444' : '#f59e0b')
              return (
                <tr key={inv.id}>
                  <td style={tdStyle}>{inv.email}</td>
                  <td style={tdStyle}>{inv.type}</td>
                  <td style={tdStyle}>{ROLE_LABELS[inv.role] || inv.role}</td>
                  <td style={tdStyle}>{new Date(inv.expiresAt).toLocaleDateString('pt-PT')}</td>
                  <td style={{ ...tdStyle, color, fontWeight: 600 }}>● {status}</td>
                </tr>
              )
            })}
            {data.invitations.length === 0 && (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#6b7a99' }}>Sem convites.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {tab === 'settings' && (
        <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 12, padding: 24, maxWidth: 480 }}>
          <button onClick={toggleActive} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 8,
            background: data.agency.isActive ? '#fee2e2' : '#dcfce7',
            color: data.agency.isActive ? '#ef4444' : '#16a34a',
            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {data.agency.isActive ? <Trash2 size={14} /> : <RefreshCw size={14} />}
            {data.agency.isActive ? 'Desativar agência' : 'Reativar agência'}
          </button>
        </div>
      )}
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse',
  background: '#fff', border: '1px solid #e5e9f2', borderRadius: 12, overflow: 'hidden',
}
const thStyle: React.CSSProperties = {
  padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.07em',
  borderBottom: '1px solid #e5e9f2',
}
const tdStyle: React.CSSProperties = {
  padding: '14px 18px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f1f5f9',
}
```

- [ ] **Step 15.5: Wire routes in App.tsx**

Open `frontend/src/App.tsx`. Add imports near the other page imports:

```typescript
import { SuperAdminLayout } from './pages/super-admin/SuperAdminLayout'
import { SuperAdminAgenciesPage } from './pages/super-admin/SuperAdminAgenciesPage'
import { SuperAdminAgencyDetailPage } from './pages/super-admin/SuperAdminAgencyDetailPage'
import { RoleGuard } from './components/auth/RoleGuard'
```

Add the super-admin route block **outside** the `AppShell` route, between `/403` and the `path="/"` block:

```typescript
      <Route path="/403" element={<ForbiddenPage />} />

      <Route path="/super-admin" element={
        <ProtectedRoute>
          <RoleGuard roles={['SUPER_ADMIN']}>
            <SuperAdminLayout />
          </RoleGuard>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/super-admin/agencies" replace />} />
        <Route path="agencies" element={<SuperAdminAgenciesPage />} />
        <Route path="agencies/:id" element={<SuperAdminAgencyDetailPage />} />
      </Route>

      <Route path="/" element={...
```

- [ ] **Step 15.6: Build to confirm**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 15.7: Commit**

```bash
git add frontend/src/api/super-admin.api.ts frontend/src/pages/super-admin/ frontend/src/App.tsx
git commit -m "feat(frontend): super-admin pages (agencies list/detail/create)"
git push
```

---

## Task 16: Frontend — extend TeamPage with resend & member actions

**Files:**
- Modify: `frontend/src/api/invitations.api.ts`
- Create: `frontend/src/api/team.api.ts`
- Modify: `frontend/src/pages/settings/TeamPage.tsx`

- [ ] **Step 16.1: Add resend to invitations API**

Open `frontend/src/api/invitations.api.ts`. Add (or update if existing):

```typescript
export const resendInvitation = (id: string) => api.post(`/invitations/${id}/resend`)
```

- [ ] **Step 16.2: Create team API**

Create `frontend/src/api/team.api.ts`:

```typescript
import api from './client'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  avatarUrl?: string
  createdAt: string
}

export const listTeamMembers = (agencyId?: string) =>
  api.get<TeamMember[]>(`/team/members${agencyId ? `?agencyId=${agencyId}` : ''}`)

export const updateMember = (id: string, data: { role?: string; isActive?: boolean }) =>
  api.patch<TeamMember>(`/team/members/${id}`, data)

export const deactivateMember = (id: string) => api.delete(`/team/members/${id}`)
```

- [ ] **Step 16.3: Add resend button + member actions to TeamPage**

Open `frontend/src/pages/settings/TeamPage.tsx`.

Add to imports at the top:

```typescript
import { resendInvitation } from '../../api/invitations.api'
import { updateMember, deactivateMember } from '../../api/team.api'
import { RefreshCw } from 'lucide-react'
```

Add a new handler near `handleRevoke` (around line 73):

```typescript
  const handleResend = async (id: string) => {
    try {
      await resendInvitation(id)
      showToast('Convite reenviado.', 'success')
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao reenviar.', 'error')
    }
  }

  const handleChangeRole = async (id: string, role: string) => {
    try {
      await updateMember(id, { role })
      showToast('Role alterado.', 'success')
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro.', 'error')
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Desativar este membro? Perde acesso imediato.')) return
    try {
      await deactivateMember(id)
      showToast('Membro desativado.', 'success')
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro.', 'error')
    }
  }
```

In the `pending.map` table rows (around line 163), add a "Reenviar" button next to "Revogar":

```typescript
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => handleResend(inv.id)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 7,
                          border: '1px solid #dbeafe', background: '#fff',
                          color: '#3b82f6', fontSize: 12, cursor: 'pointer',
                          fontFamily: 'inherit', marginRight: 6,
                        }}>
                          <RefreshCw size={11} /> Reenviar
                        </button>
                        <button onClick={() => handleRevoke(inv.id)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 7,
                          border: '1px solid #fee2e2', background: '#fff',
                          color: '#ef4444', fontSize: 12, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                          <Trash2 size={11} /> Revogar
                        </button>
                      </td>
```

In the members table (around line 122), add an extra column "Ações" with role dropdown and deactivate button. After the existing `<td>` for "Desde" (line 145), add:

```typescript
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {m.id !== user?.id && ['AGENCY_OWNER','AGENCY_ADMIN','SUPER_ADMIN'].includes(user?.role || '') && (
                          <button onClick={() => handleDeactivate(m.id)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 7,
                            border: '1px solid #fee2e2', background: '#fff',
                            color: '#ef4444', fontSize: 12, cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}>
                            <Trash2 size={11} /> Desativar
                          </button>
                        )}
                      </td>
```

And add `<th style={{...thStyle, textAlign: 'right'}}></th>` to the members `<thead>` row.

- [ ] **Step 16.4: Build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 16.5: Commit**

```bash
git add frontend/src/api/invitations.api.ts frontend/src/api/team.api.ts frontend/src/pages/settings/TeamPage.tsx
git commit -m "feat(team-page): resend invite + deactivate member actions"
git push
```

---

## Task 17: Frontend — InviteAcceptPage shows agencyName + type-aware message

**Files:**
- Modify: `frontend/src/pages/InviteAcceptPage.tsx`

- [ ] **Step 17.1: Update verification response handling and display**

Open `frontend/src/pages/InviteAcceptPage.tsx`. Update state:

Find:
```typescript
const [step, setStep] = useState<Step>('loading')
const [email, setEmail] = useState('')
const [errorMsg, setErrorMsg] = useState('')
```

Replace with:
```typescript
const [step, setStep] = useState<Step>('loading')
const [email, setEmail] = useState('')
const [type, setType] = useState<'OWNER' | 'CONSULTANT'>('CONSULTANT')
const [agencyName, setAgencyName] = useState<string>('')
const [errorMsg, setErrorMsg] = useState('')
```

Update the `useEffect` that calls `/invitations/verify/:token` to also extract `type` and fetch agencyName:

```typescript
useEffect(() => {
  if (!token) {
    setErrorMsg('Token inválido ou em falta.')
    setStep('invalid')
    return
  }
  axios
    .get(`${BASE}/invitations/verify/${token}`)
    .then(async res => {
      const data = res.data?.data ?? res.data
      setEmail(data.email)
      setType((data.type as 'OWNER' | 'CONSULTANT') || 'CONSULTANT')
      // Best-effort: agencyName might be in invite payload; if not, ignore.
      if (data.agencyName) setAgencyName(data.agencyName)
      setStep('signup')
    })
    .catch(err => {
      const msg = err?.response?.data?.error || 'Token inválido ou expirado.'
      setErrorMsg(msg)
      setStep('invalid')
    })
}, [token])
```

In the signup render (the `return` block at the end), add a header above the SignUp:

```typescript
return (
  <main style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8', padding: 24 }}>
    <div style={{ textAlign: 'center', marginBottom: 24, maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f2553', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        {type === 'OWNER'
          ? `Bem-vindo${agencyName ? ` à agência ${agencyName}` : ''}`
          : `Foste convidado para a equipa${agencyName ? ` de ${agencyName}` : ''}`}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>
        Cria a tua conta para começares.
      </p>
    </div>
    <SignUp
      routing="hash"
      initialValues={{ emailAddress: email }}
      afterSignUpUrl="/login"
    />
  </main>
)
```

- [ ] **Step 17.2: Backend — include agencyName in verify response**

Open `backend/src/modules/invitations/invitations.service.ts`. Find `verify` (around line 117) and replace with:

```typescript
export const verify = async (token: string) => {
  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv) throw Object.assign(new Error('Convite inválido'), { status: 404 });
  if (inv.usedAt) throw Object.assign(new Error('Convite já utilizado'), { status: 410 });
  if (inv.expiresAt < new Date()) throw Object.assign(new Error('Convite expirado'), { status: 410 });

  let agencyName: string | null = null;
  if (inv.agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: inv.agencyId },
      select: { name: true },
    });
    agencyName = agency?.name || null;
  }

  return { ...inv, agencyName };
};
```

- [ ] **Step 17.3: Build both**

```bash
cd backend && npm run build && cd ../frontend && npm run build
```

Expected: both builds succeed.

- [ ] **Step 17.4: Commit**

```bash
git add frontend/src/pages/InviteAcceptPage.tsx backend/src/modules/invitations/invitations.service.ts
git commit -m "feat(invite-accept): show agency name + type-aware welcome"
git push
```

---

## Task 18: Configure Clerk Dashboard (manual step — verify before E2E test)

**Files:** None (manual configuration in Clerk Dashboard at https://dashboard.clerk.com)

- [ ] **Step 18.1: Sign in to Clerk dashboard**

Go to https://dashboard.clerk.com using the account that owns the publishable key starting with `pk_test_ZW1lcmdpbmctamFja2FsLTQz`.

- [ ] **Step 18.2: Disable open sign-ups**

Navigate to: **Configure → User & Authentication → Email, Phone, Username**.

Under **Sign-up modes**: leave only Email + Password enabled (or Email + Google). Disable any "magic link only" or username-only sign-up flows.

Then go to: **Configure → Restrictions** (or **Settings → Restrictions** depending on dashboard version).

Set **Sign-up mode = "Restricted"** so that Clerk rejects anyone whose email isn't in an allow-list. We don't actually use the allow-list (the gate is our `clerk-exchange` rejecting users with no DB row), but enabling Restricted mode prevents arbitrary signups from succeeding in Clerk in the first place.

**Alternative if Restricted mode isn't available on your plan:** leave sign-ups open in Clerk; rely entirely on the backend `clerk-exchange` returning 401 for users with no `Invitation` or pre-existing `User` row. Document this choice.

- [ ] **Step 18.3: Enable Google OAuth**

Navigate to: **Configure → SSO Connections → Google**. Enable it. Use Clerk's shared credentials for development; configure your own OAuth client for production.

- [ ] **Step 18.4: Verify email templates use defaults**

Navigate to: **Configure → Emails**. Confirm that the default templates are active (Clerk handles email verification — our backend handles invite emails separately). No changes needed.

- [ ] **Step 18.5: Add allowed domains**

Navigate to: **Configure → Domains**. Make sure `localhost:5173` is allowed (it usually is by default for dev keys). For production, add `casaflow.pt`.

- [ ] **Step 18.6: Document the configuration in repo**

Create a short note for future devs: open `backend/.env.example` and append (only if it doesn't already have these):

```env
# Clerk — required
# Set CLERK_SECRET_KEY (sk_...) and SUPER_ADMIN_EMAIL.
# Configure Clerk Dashboard:
#   - Sign-up mode: Restricted (or rely on backend exchange to gate)
#   - Enable Email+Password and Google providers
#   - Allow http://localhost:5173 in dev domains
CLERK_SECRET_KEY=
SUPER_ADMIN_EMAIL=
```

- [ ] **Step 18.7: Commit env example**

```bash
git add backend/.env.example
git commit -m "docs(env): document Clerk configuration requirements"
git push
```

---

## Task 19: End-to-end verification with REAL EMAIL DELIVERY

This task is the **acceptance criterion** for the whole plan. It cannot be skipped.

**Prereqs:**
- Backend and frontend running locally (`npm run dev` in both).
- A second email address you control (besides `geral@alphascaleai.com`) — for example a personal Gmail.

- [ ] **Step 19.1: Confirm SMTP boot log**

Tail backend logs. Confirm `[Email] SMTP transporter verified OK.` is present.

If you see `[Email] SMTP verify FAILED`, fix the SMTP credentials in `backend/.env` before continuing.

- [ ] **Step 19.2: Sign in as super-admin via Clerk**

In a fresh browser window (incognito helps):
1. Open `http://localhost:5173/login`.
2. Sign up / sign in via Clerk using `geral@alphascaleai.com`. (If first time, Clerk will ask for password setup.)
3. After sign-in, the page should redirect to `/dashboard` momentarily, then since you have role SUPER_ADMIN, you should be able to navigate to `/super-admin/agencies` manually.

If you land on `/dashboard` instead of `/super-admin`: that is fine for now (the auto-redirect for SUPER_ADMIN can be added later if desired). Manually go to `/super-admin/agencies`.

Expected: page renders with empty list and a "Nova Agência" button.

- [ ] **Step 19.3: Create first agency + invite owner**

Click "Nova Agência". Fill:
- Name: `Imobiliária Teste E2E`
- Slug: `imo-teste-e2e` (or auto-generated)
- Owner email: **the second email address you control**
- Owner name: optional

Submit. Toast appears: "Agência criada e convite enviado."

- [ ] **Step 19.4: VERIFY OWNER EMAIL ARRIVES (real inbox)**

Open the second email's inbox in a separate tab.

Expected within 30 seconds:
- Email from `"CasaFlow" <geral@alphascaleai.com>` (or your `SMTP_FROM_NAME`).
- Subject: `Convite para gerir a agência Imobiliária Teste E2E no CasaFlow`.
- Body: navy header, "Bem-vindo ao CasaFlow", agency name in bold, gold-bordered "Aceitar convite" button.
- Button links to `http://localhost:5173/invite/<token>`.

**If email does not arrive:**
- Check spam folder.
- Check backend logs for `[Email FAIL]` lines — they include the error message.
- Common issues: wrong Gmail app password, port blocked by ISP, From address not matching SMTP user (Gmail rejects this).

Mark this checkbox **only when the email arrived correctly**.

- [ ] **Step 19.5: Owner accepts invite**

Click the link in the email. The page `/invite/<token>` should:
- Show: "Bem-vindo à agência Imobiliária Teste E2E".
- Show Clerk's SignUp widget with the email pre-filled.

Complete signup with a password.

After signup:
- Redirect to `/login`.
- Login page detects existing Clerk session, calls `/auth/clerk-exchange`, gets JWT, redirects to `/dashboard`.

Expected:
- User row in DB (`prisma studio`): `email = <second email>`, `role = AGENCY_OWNER`, `agencyId = <new agency id>`, `clerkUserId = <not null>`, `isActive = true`.
- Invitation row: `usedAt` set.

- [ ] **Step 19.6: Owner invites a consultant**

Still logged in as the new owner, navigate to `/settings/team`. Click "Convidar".

Use a **third email address** you control (or reuse your first email if you like — but you'll need to log out of Clerk first to test the consultant flow cleanly).

For simplicity, you can use `geral@alphascaleai.com+consultant@gmail.com` style aliases (Gmail ignores after `+`), so they all land in the same inbox.

Submit. Toast: "Convite enviado."

- [ ] **Step 19.7: VERIFY CONSULTANT EMAIL ARRIVES**

Check the consultant inbox.

Expected:
- Subject: `Foste convidado para a equipa de Imobiliária Teste E2E`.
- Body mentions inviter name (the owner) and agency.
- Working "Aceitar convite" button.

Mark only when received.

- [ ] **Step 19.8: Consultant accepts**

Click link, complete Clerk signup with a different account, get redirected, end up at `/dashboard` as CONSULTANT of the same agency.

- [ ] **Step 19.9: Test resend**

Log back in as super-admin or owner, go to convites pendentes. Create a fresh invite to a fake email, then click "Reenviar".

Expected: toast "Convite reenviado". Backend log shows new email send. Token in DB is regenerated (different from before).

- [ ] **Step 19.10: Test deactivate consultant**

As the owner in `/settings/team`, find the consultant member, click "Desativar".

Expected: row updates to "Inactivo". The consultant, in another browser, gets logged out / loses access on next refresh (Clerk ban + isActive=false → exchange returns 401).

- [ ] **Step 19.11: Test legacy endpoints return 410**

In a terminal:

```bash
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"y"}'
```

Expected: HTTP/1.1 410, body `{"error":"Login email/password descontinuado. ...","status":410}`.

- [ ] **Step 19.12: Test /registo redirects**

Open `http://localhost:5173/registo`. Expected: instant redirect to `/login`.

- [ ] **Step 19.13: Final commit (notes from manual test)**

If the manual E2E flow exposed any bugs, fix them inline (make them additional commits with clear messages). Once everything passes, write a final note:

```bash
git commit --allow-empty -m "test(e2e): manual full Clerk + invite flow verified — emails delivered and accepted"
git push
```

---

## Self-Review

Pass criteria checked against spec sections:

- **Spec §2.1 Clerk única fonte:** Tasks 1, 7, 13.
- **Spec §2.2 Hierarquia roles:** Tasks 2, 3, 6.
- **Spec §2.3 Modelo fechado:** Tasks 7 (410), 13 (frontend).
- **Spec §2.4 Two invite types:** Tasks 2, 8, 10, 11.
- **Spec §3 Schema:** Tasks 2, 3.
- **Spec §4.1 Auth endpoints:** Task 7 (legacy off), Task 10 (clerk-exchange OWNER).
- **Spec §4.2 Convites:** Tasks 8, 9, 17.
- **Spec §4.3 Super-admin agencies:** Task 11.
- **Spec §4.4 Team:** Task 12.
- **Spec §4.5 Helpers:** Task 6.
- **Spec §4.6 Email service:** Tasks 4, 5.
- **Spec §5.1 Login substituído:** Task 13.
- **Spec §5.2 Páginas novas super-admin:** Tasks 14 (RoleGuard), 15.
- **Spec §5.3 TeamPage estendida:** Task 16.
- **Spec §5.3 InviteAcceptPage:** Task 17.
- **Spec §6 ENV vars:** Task 1.
- **Spec §6.3 Clerk Dashboard:** Task 18.
- **Spec §7 Acceptance criteria:** Task 19.
- **Spec §7.8 Verificação real de email:** Task 19 steps 19.4 and 19.7.

**Type consistency check:** All references to `EmailService.send`, `inviteOwnerTemplate`, `inviteConsultantTemplate`, `requireRoleHelper`, `isSuperAdmin`, `getCurrentUser` use consistent signatures across tasks 4, 6, 8, 11, 12. ✅

**No placeholders:** All steps contain runnable code or commands. No "TBD" / "implement appropriately". ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-clerk-auth-and-invite-system.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration, isolates context per task. Best for a plan this size.

**2. Inline Execution** — Execute all tasks in this session sequentially. Faster but burns context fast and harder to review.

**Which approach?**
