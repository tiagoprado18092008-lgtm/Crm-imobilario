# Clerk Auth + Sistema de Convites + Gestão de Equipa

**Data:** 2026-05-06
**Estado:** Aprovado pelo utilizador
**Spec relacionado:** `2026-05-06-tenant-isolation-audit-design.md` (auditoria de isolamento — implementação separada)

---

## 1. Contexto e motivação

O CRM (CasaFlow) é multi-tenant para agências imobiliárias portuguesas. Hoje convivem **dois sistemas de autenticação**:

- Login email/password com JWT custom (`/auth/login`, `/auth/register`)
- Login Clerk com exchange para JWT da API (`/auth/clerk-exchange`)

Esta dualidade gera bugs (publishable key e secret key não estão configuradas, página Clerk fica em branco, exchange falha sempre) e complexidade desnecessária.

A decisão é **migrar 100% para Clerk** e fechar o registo público. Modelo operacional:

1. **Super-admin** (alphascaleai) cria agência + envia convite ao dono.
2. **Agency owner** clica no link, cria conta no Clerk, fica AGENCY_OWNER da agência.
3. **Agency owner** convida consultores da sua agência.
4. **Consultor** clica no link, cria conta no Clerk, fica CONSULTANT da agência do convidador.

Sem o super-admin, ninguém entra. Sem convite do owner, nenhum consultor entra.

---

## 2. Decisões fundamentais

### 2.1 Clerk como única fonte de identidade
- O frontend autentica com Clerk (UI, social login, password, MFA — gerido pelo Clerk).
- O backend recebe o JWT do Clerk **uma vez** num endpoint de exchange e devolve um JWT da API.
- Todas as outras chamadas à API usam o JWT da API (Authorization Bearer). Os middlewares actuais não mudam.
- Vantagem: não precisamos reescrever auth.middleware nem rbac.middleware.

### 2.2 Hierarquia de roles simplificada
Três roles efectivos:

| Role | Descrição | Pode |
|------|-----------|------|
| `SUPER_ADMIN` | AlphaScaleAI (dono da plataforma) | Criar/gerir agências e respectivos owners. Vê tudo. |
| `AGENCY_OWNER` | Dono de uma agência | Convidar/gerir consultores da sua agência. Acesso total dentro da sua agência. |
| `CONSULTANT` | Consultor imobiliário | Acesso restrito ao que lhe pertence dentro da sua agência. |

Roles legados (`AGENCY_ADMIN`, `LOCATION_ADMIN`, `TEAM_LEADER`, `USER`) são mantidos no enum para não quebrar dados antigos, mas tratados como:
- `AGENCY_ADMIN` → permissões equivalentes a `AGENCY_OWNER`
- `LOCATION_ADMIN`, `TEAM_LEADER`, `USER` → permissões equivalentes a `CONSULTANT`

### 2.3 Modelo fechado de onboarding
- `/registo` é removido (rota retorna redirect para `/login` com aviso).
- `POST /api/auth/register` retorna 410 Gone com mensagem "Registo apenas por convite".
- `POST /api/auth/login` retorna 410 Gone com mensagem "Use Clerk".
- `POST /api/auth/google` retorna 410 Gone (Clerk gere o social login).

### 2.4 Dois tipos de convite, mesma mecânica
A tabela `Invitation` ganha um campo `type`:
- `type = "OWNER"` — convida um futuro AGENCY_OWNER. Carrega `agencyId` da agência recém-criada pelo super-admin.
- `type = "CONSULTANT"` — convida um futuro consultor. Herda `agencyId` do convidador.

Ambos usam o mesmo endpoint público `/api/invitations/verify/:token` e a mesma página `/invite/:token`. Apenas a mensagem da página muda consoante o `type`.

---

## 3. Alterações ao schema Prisma

```prisma
enum UserRole {
  SUPER_ADMIN     // NOVO
  AGENCY_OWNER
  AGENCY_ADMIN    // legado
  LOCATION_ADMIN  // legado
  TEAM_LEADER     // legado
  CONSULTANT
  USER            // legado
}

model Invitation {
  id          String    @id @default(cuid())
  email       String
  role        String    @default("CONSULTANT")
  type        String    @default("CONSULTANT")  // NOVO: "OWNER" | "CONSULTANT"
  token       String    @unique
  invitedById String
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  locationId  String?
  permissions Json?
  agencyId    String?
}

model User {
  // sem alterações estruturais nesta spec.
  // passwordHash e googleId ficam (mantemos coluna durante 1 release p/ rollback);
  // passam a ser ignorados pelos novos fluxos.
}
```

### 3.1 Migração
1. `prisma migrate dev --name add_super_admin_role_and_invitation_type`
2. Seed/script único:
   - Encontra user com email `geral@alphascaleai.com` → `role = SUPER_ADMIN`, `agencyId = null`. Se não existir, cria placeholder com `clerkUserId = null` (será associado no primeiro exchange).
   - Para todos os `Invitation` existentes onde `role IN ('AGENCY_OWNER','AGENCY_ADMIN')`, marcar `type = 'OWNER'`. Resto fica `CONSULTANT`.

---

## 4. Backend — endpoints

### 4.1 Auth (`/api/auth`)

| Método | Path | Quem | Descrição |
|--------|------|------|-----------|
| POST | `/clerk-exchange` | público | Já existe. Estender para criar `Agency` automaticamente quando o user vem por convite `type=OWNER` (ver 4.4). |
| POST | `/login` | — | Retorna 410 Gone, mensagem PT-PT. |
| POST | `/register` | — | Retorna 410 Gone, mensagem PT-PT. |
| POST | `/google` | — | Retorna 410 Gone, mensagem PT-PT. |
| GET | `/me` | autenticado | Sem alterações. |

### 4.2 Convites (`/api/invitations`)

| Método | Path | Quem | Descrição |
|--------|------|------|-----------|
| GET | `/verify/:token` | público | Sem alterações. Devolve `{ email, role, type, agencyName? }`. |
| GET | `/` | OWNER+ | OWNER vê só os da sua agência. SUPER_ADMIN vê todos. |
| POST | `/` | OWNER+ | Body: `{ email, role }`. OWNER só pode criar `role=CONSULTANT`. SUPER_ADMIN pode criar `OWNER`. `type` é derivado do `role`. |
| POST | `/:id/resend` | OWNER+ | **NOVO.** Regenera token (novo `token` + `expiresAt`) e reenvia email. |
| DELETE | `/:id` | OWNER+ | Sem alterações. |

### 4.3 Super-admin agências (`/api/super-admin/agencies`) — NOVO router

Todas as rotas exigem `requireRole('SUPER_ADMIN')`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/` | Lista agências `{ id, name, slug, isActive, ownerEmail, memberCount, createdAt }`. |
| POST | `/` | Body: `{ name, slug, ownerEmail, ownerName? }`. Numa transação: cria `Agency` + `Invitation` (type=OWNER, role=AGENCY_OWNER, agencyId=novo) + envia email. Retorna `{ agency, invitation }`. |
| GET | `/:id` | Detalhe: `{ agency, members: User[], invitations: Invitation[], stats }`. |
| PATCH | `/:id` | Body: `{ name?, slug?, isActive? }`. |
| DELETE | `/:id` | Soft delete: `isActive=false`. Bloqueia logins de todos os users da agência. |

### 4.4 Equipa (`/api/team`) — NOVO router

Todas as rotas exigem `requireRole('AGENCY_OWNER', 'AGENCY_ADMIN', 'SUPER_ADMIN')`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/members` | Lista membros da agência do request user (SUPER_ADMIN: precisa de query `?agencyId=`). |
| PATCH | `/members/:id` | Body: `{ role?, isActive? }`. Não permite mudar role para `SUPER_ADMIN`. Não permite o owner desativar-se a si próprio se for único OWNER. |
| DELETE | `/members/:id` | Soft delete: `isActive=false` + `clerkClient.users.banUser(clerkUserId)` para revogar acesso imediato no Clerk. |

### 4.5 Helpers (`backend/src/lib/auth.ts` — NOVO)

```typescript
export async function getCurrentUser(req): Promise<UserWithAgency | null>
export async function requireRole(req, ...roles: UserRole[]): Promise<UserWithAgency>  // throws 403
export async function requireAgencyScope(req): Promise<{ agencyId: string; user: UserWithAgency }>  // throws 403 se sem agência
export function isSuperAdmin(user: User): boolean
export function isOwnerLevel(user: User): boolean   // OWNER, ADMIN, SUPER_ADMIN
```

Estes helpers consolidam a lógica dispersa em `middleware/rbac.middleware.ts` e `lib/scope.ts`. Os middlewares antigos permanecem (compatibilidade com routers existentes); helpers novos são para os routers novos e refactor incremental.

### 4.6 Email service (`backend/src/lib/email.ts` — NOVO)

Substitui `backend/src/utils/email.service.ts` e o transporter inline em `invitations.service.ts`.

```typescript
export class EmailService {
  static async send(opts: { to, subject, html, text? }): Promise<{ success, messageId?, error? }>
  static async verify(): Promise<boolean>  // valida transporter no boot
}

// Templates em backend/src/lib/email-templates.ts:
export function inviteOwnerTemplate({ agencyName, inviteUrl, expiresAt })
export function inviteConsultantTemplate({ agencyName, inviterName, inviteUrl, expiresAt })
export function accountActivatedTemplate({ name, dashboardUrl })
```

Logging estruturado por envio. No boot do servidor, chama `EmailService.verify()` e loga warning se falhar (sem bloquear arranque).

---

## 5. Frontend — páginas e navegação

### 5.1 Substituições

| Antes | Depois |
|-------|--------|
| `LoginPage.tsx` (email/password + Google) | **Substituído** pelo conteúdo de `ClerkLoginPage.tsx`, mantendo o nome `LoginPage.tsx`. `ClerkLoginPage.tsx` é eliminado. Visual mantém-se navy/gold (não usar tema escuro). |
| `RegisterPage.tsx` | Removido. Rota `/registo` faz `<Navigate to="/login" replace />`. |
| `/auth/login` API call | Eliminado. `useAuthStore.login` removido. |

### 5.2 Páginas novas

| Rota | Componente | Quem |
|------|-----------|------|
| `/super-admin` | `SuperAdminLayout` (layout próprio, fora do AppShell normal) | SUPER_ADMIN |
| `/super-admin/agencies` | `SuperAdminAgenciesPage` | SUPER_ADMIN |
| `/super-admin/agencies/:id` | `SuperAdminAgencyDetailPage` | SUPER_ADMIN |

`SuperAdminAgenciesPage` tem botão "Nova Agência" → modal com `name`, `slug` (auto-gerado a partir do name, editável), `ownerEmail`, `ownerName`. Submit chama `POST /api/super-admin/agencies` → toast de sucesso → refresh da lista.

`SuperAdminAgencyDetailPage` tem três tabs:
- **Membros** — tabela com role e estado, ações: alterar role, desativar.
- **Convites** — pendentes/usados/expirados, ações: revogar, reenviar.
- **Settings** — nome, slug, ativar/desativar agência.

### 5.3 Páginas estendidas

**`/settings/team` (TeamPage)** — já existe; alterações:
- Tab "Convites" com colunas Email, Role, Data envio, Expira em, Estado, Ações.
- Botão "Reenviar" por convite pendente (chama `POST /api/invitations/:id/resend`).
- Acção "Desativar" em membros chama `DELETE /api/team/members/:id`.
- Acção "Alterar role" via dropdown inline chama `PATCH /api/team/members/:id`.
- Owner não pode desativar-se nem convidar `AGENCY_OWNER` (apenas SUPER_ADMIN pode).

**`/invite/:token` (InviteAcceptPage)** — já existe; alterações:
- Mostrar nome da agência e tipo de convite ("Bem-vindo à tua nova agência" para OWNER vs. "Foste convidado para a equipa de [Agência]" para CONSULTANT).
- Email pré-preenchido e bloqueado no Clerk SignUp (já parcialmente feito via `initialValues`).
- Após signup com sucesso, redirect para `/login` que faz exchange e leva ao dashboard.

### 5.4 Componentes utilitários novos

- `<RoleGuard role="...">{children}</RoleGuard>` — esconde children e redirect para `/forbidden` se role insuficiente.
- `useAuthStore` adições: `isSuperAdmin()`, `isOwner()`, `canManageTeam()`.

### 5.5 Navegação
Sidebar para SUPER_ADMIN mostra apenas link "Super Admin" (mais nada). Para OWNER/CONSULTANT mantém-se a navegação atual; "Equipa" só aparece se `canManageTeam()`.

---

## 6. Variáveis de ambiente

### 6.1 Backend (`backend/.env`) — adicionar
```env
CLERK_SECRET_KEY=sk_test_abzKGfTaLBAQd7B8qCLzTYz1yABdqvwQOdUzpxAepI
SUPER_ADMIN_EMAIL=geral@alphascaleai.com
```

### 6.2 Frontend (`frontend/.env.local`) — adicionar
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZW1lcmdpbmctamFja2FsLTQzLmNsZXJrLmFjY291bnRzLmRldiQ
```

### 6.3 Clerk Dashboard — configuração necessária
- **Sign-in**: ativar Email + Password e Google.
- **Sign-up**: **desativar registo aberto** (apenas via convite controlado pelo backend; o frontend usa `initialValues` para email bloqueado).
- **Email templates**: deixar Clerk usar os defaults dele para verificação de email; os emails de **convite** são enviados pelo nosso backend (não pelo Clerk).
- **Domain**: para produção, configurar `casaflow.pt` como domínio verificado.

---

## 7. Critérios de aceitação

Fluxo end-to-end que tem de funcionar:

1. **Bootstrap super-admin**
   - `geral@alphascaleai.com` consegue fazer login no Clerk pela primeira vez.
   - É reconhecido como SUPER_ADMIN (via seed/script).
   - Vê painel `/super-admin/agencies` (vazio inicialmente).

2. **Criar agência + convidar owner**
   - Super-admin clica "Nova Agência", preenche form, submete.
   - É criada a `Agency` e enviado email com link `/invite/<token>` ao owner.
   - Convite aparece na lista da agência com estado "pendente".

3. **Owner aceita convite**
   - Owner abre o email, clica no link → vê página de convite com nome da agência.
   - Cria conta no Clerk com email pré-preenchido.
   - Após signup, é redirecionado para `/login` → exchange acontece → entra em `/dashboard`.
   - User na BD tem `role=AGENCY_OWNER`, `agencyId=<id correcto>`, `clerkUserId=<id Clerk>`, `isActive=true`.
   - Convite na BD tem `usedAt` preenchido.

4. **Owner convida consultor**
   - Owner vai a `/settings/team`, clica "Convidar", insere email + role=CONSULTANT.
   - Email enviado. Convite aparece em "pendentes".

5. **Consultor aceita**
   - Mesmo fluxo do owner. Acaba como CONSULTANT da agência correcta.

6. **Owner gere equipa**
   - Pode alterar role do consultor (entre CONSULTANT e AGENCY_OWNER **não** — só SUPER_ADMIN promove a OWNER nesta versão; OWNER pode promover entre CONSULTANT e roles intermédios legados se ainda relevantes).
   - Pode desativar consultor → consultor perde acesso imediato (Clerk ban + isActive=false).
   - Pode reenviar convite pendente → novo token, novo email.

7. **Bloqueios**
   - `/registo` redireciona para `/login`.
   - `POST /api/auth/login` devolve 410.
   - User com `isActive=false` não consegue fazer exchange (já existe esta validação).
   - Consultor não consegue aceder a `/super-admin` nem a `/settings/team`.

8. **Verificação real de entrega de email (obrigatório)**
   Antes de declarar a implementação completa, executar um teste end-to-end com **emails reais**:
   - **8.1** — Super-admin cria agência e convida owner para um endereço de email do utilizador (geral@alphascaleai.com ou alternativo). Verificar que o email **chega à inbox** (não spam) com:
     - Subject claro em PT-PT (ex: "Convite para gerir a agência [Nome] no CasaFlow").
     - Corpo HTML formatado, com nome da agência e botão CTA visível.
     - Link `/invite/<token>` clicável e funcional.
     - Remetente correcto (`SMTP_FROM_NAME` + `SMTP_USER`).
   - **8.2** — Owner aceita o convite, faz login, e envia convite a um consultor (segundo endereço de email controlado pelo utilizador). Verificar que o email **chega à inbox** com a mesma qualidade.
   - **8.3** — Validar `transporter.verify()` no boot do servidor não dá warning.
   - **8.4** — Forçar uma falha de envio (ex: SMTP_PASS errado) e confirmar que o erro aparece nos logs com contexto suficiente (`to`, `template`, mensagem do erro).
   - Se algum dos passos falhar, a implementação não está completa.

---

## 8. O que NÃO está incluído (escopo do Spec B)

A auditoria sistemática a todos os controllers/services para garantir filtro por `agencyId` em queries de leitura/escrita está **fora desta spec**. Está coberta no spec separado `2026-05-06-tenant-isolation-audit-design.md`.

Esta spec implementa o helper `requireAgencyScope` mas não o aplica a todos os endpoints — apenas aos endpoints novos criados aqui (super-admin, team).

---

## 9. Ordem de implementação sugerida

1. Variáveis de ambiente (corrige bugs imediatos do Clerk).
2. Schema + migração + seed do super-admin.
3. `EmailService` consolidado + templates.
4. Helpers `lib/auth.ts`.
5. Endpoints super-admin agencies.
6. Endpoints team.
7. Extensão de invitations (resend, type).
8. Frontend: substituir LoginPage, remover RegisterPage.
9. Frontend: páginas super-admin.
10. Frontend: estender TeamPage e InviteAcceptPage.
11. Desligar endpoints legados (`login`, `register`, `google` → 410).
12. Teste manual end-to-end seguindo critérios da secção 7.
