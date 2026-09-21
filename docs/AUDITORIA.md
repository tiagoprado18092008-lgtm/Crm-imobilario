# AUDITORIA — CasaFlow → AlphaCRM

> Data: 2026-09-21 · Fase 0 · Autor: Claude Opus 5
> Âmbito: auditoria do **código real** do repositório, para validar (ou corrigir) os pressupostos do prompt mestre de transformação.
> Documento anterior relacionado: [`AUDIT.md`](../AUDIT.md) (2026-05-07) — auditoria **funcional**. Este documento é **técnico** e substitui os pressupostos da secção 5 do prompt.

---

## 0. Conclusão executiva

O prompt mestre descreve com rigor o **produto** (negócio, ecrãs, modelo de dados, telefonia). Descreve **incorretamente a stack técnica**. As secções 5 (Arquitetura) e 11 (Performance) foram escritas para Next.js App Router; o repositório é uma **SPA Vite + React Router** com backend **Express** separado.

Decisão tomada com o Tiago (21/09/2026): **Opção A — manter Vite/React SPA.** As secções 5 e 11 do prompt são reescritas neste documento. As secções 1–4, 6–10 e 12–15 mantêm-se válidas.

Três achados bloqueantes, por ordem de gravidade:

| # | Achado | Consequência |
|---|---|---|
| **B1** | **Não existe `agencyId` em `Contact`, `Property`, `Interaction`, `Task`, `Conversation`, `Message`, `Appointment`** e mais 20 modelos. O isolamento multi-tenant é feito por **join relacional** (`assignedTo: { agencyId }`), não por coluna. | A regra do prompt (§4) — `workspaceId` em todas as tabelas + teste que proíbe `findMany` sem `where.workspaceId` — é hoje **impossível de aplicar**. Além disso, o join impede os índices compostos liderados por tenant exigidos em §11. |
| **B2** | A stack não é Next.js. Sem RSC, sem `initialData` de Server Components, sem `dynamic()`, `next/font`, `next/image`, `instrumentation.ts`. Sem TanStack Query/Table/Virtual instalados. | ~50% dos critérios de aceitação da Fase 2 estão escritos contra um framework inexistente. |
| **B3** | **71 ficheiros** referenciam Property/imóveis. | A "limpeza" da Fase 1 não é trivial; é a maior alteração de superfície do plano todo. |

---

## 1. Stack real

### 1.1 Estrutura

```
/backend     Express + Prisma 5 + PostgreSQL   (modular: src/modules/<dominio>/)
/frontend    Vite 5 + React 19 + React Router 7 (SPA)
/docs        specs e planos superpowers (31 ficheiros)
```

Não é monorepo. Não há workspaces npm, `apps/`, nem `packages/`.

### 1.2 Frontend — o que existe mesmo

| Área | Real | Prompt §5 assume |
|---|---|---|
| Framework | **Vite 5 + React 19 SPA** | Next.js 15 App Router |
| Routing | **React Router 7** (`react-router-dom`) | App Router por ficheiros |
| Estado servidor | **axios + Zustand** | TanStack Query v5 |
| Tabelas | manuais | TanStack Table v8 + Virtual |
| Drag & drop | **`@hello-pangea/dnd`** (kanban) **+ `@dnd-kit`** (fotos) — dois sistemas | só dnd-kit |
| Estilo | Tailwind **v4** ✅ + Radix ✅ | Tailwind v4 + shadcn/ui |
| i18n | **nenhum** — strings hardcoded | next-intl com `pt-PT.json` |
| Gráficos | Recharts ✅ (sem lazy) | Recharts lazy |
| Softphone | **`@twilio/voice-sdk`** | SIP.js sobre Zadarma |
| Outros | Stripe, jspdf, html2canvas, xlsx, framer-motion | — |

### 1.3 Backend

Express 4 · Prisma 5 · Zod **3** · Clerk backend · Twilio 5 · Baileys (WhatsApp) · googleapis · nodemailer/imapflow · Stripe · OpenAI · winston · node-cron.

⚠️ **Zod 3 no backend, Zod 4 no frontend.** Impede partilha direta de schemas (o `packages/shared` do prompt). A unificar na Fase 2.

### 1.4 Rotas backend (30 módulos)

`activity · agency · appointment-calendars · appointments · auth · automations · calendar(+booking,+events) · calls · campaigns · contacts · conversations · exports · forms · interactions · invitations · locations · message-templates · notifications · opportunities · phone-numbers · pipelines · properties · reports · search · settings · super-admin · tasks · team`

Mapeamento para o alvo (§4 do prompt):

- **Remover:** `properties`, `locations`
- **Consolidar:** `agency` + `team` + `super-admin` → `definicoes`
- **Criar:** `leads`, `companies`, `projects`, `subscriptions`, `invoices`, `views` (Vistas Guardadas), `webhooks/zadarma`
- **Manter:** os restantes

### 1.5 Páginas frontend (30)

Incluem `PropertiesPage`, `PropertyDetailPage` (a remover) e a **tripla duplicação de equipa** confirmada (problema #11 do prompt): `AgencyPage.tsx`, `UsersPage.tsx`, `pages/agency/`, `pages/settings/`.

---

## 2. Modelo de dados

**38 modelos, 878 linhas, 3 enums** (`UserRole`, `EnrollmentStatus`, `RunStatus`). Última migração: `20260509000000_add_ami_number_and_contact_tags`.

### 2.1 Isolamento multi-tenant — o problema central (B1)

`agencyId` existe **apenas** em: `Location`, `AgencySettings`, `ActivityLog`, `User`, `Opportunity`, `MessageTemplate`, `AutomationRule`, `AppointmentCalendar`, `Invitation`, `Automation`, `SystemSettings`, `Pipeline`, `WhatsAppSession`.

**Não existe** em: `Contact`, `Property`, `Interaction`, `Task`, `Conversation`, `Message`, `Appointment`, `PhoneNumber`, `EmailCampaign`, `Form`, `FormSubmission`, `CalendarEvent`, `CalendarSlot`, `CalendarIntegration`, `AutomationLog`, `AutomationEnrollment`, `AutomationRun`, `PropertyPhoto/Document/Visit`, `PipelineStage`, `LocationSettings`, tokens.

`backend/src/lib/scope.ts` compensa com `buildScope()`, devolvendo um filtro **relacional** por papel:

- `AGENCY_OWNER`/`AGENCY_ADMIN` → `{ assignedTo: { agencyId } }`
- `LOCATION_ADMIN` → `{ locationId }`
- `TEAM_LEADER` → `{ assignedToId: { in: [...] } }`
- `CONSULTANT`/`USER` → `{ assignedToId: user.id }`

Há ainda `buildPropertyScope()` separado (Property usa `createdById`) — desaparece com o módulo.

**Riscos:** (a) um contacto reatribuído a um utilizador de outra agência muda de tenant silenciosamente; (b) `LOCATION_ADMIN` sem `locationId` devolve `{}` — **scope vazio = sem filtro**; (c) o join impossibilita `(workspaceId, createdAt DESC, id DESC)` exigido em §11.

**Recomendação:** desnormalizar `workspaceId` em todos os modelos como pré-requisito da Fase 2 (proposto como **Fase 1.5** no PLANO).

### 2.2 Lead vs Deal

Confirmado o problema #3: **não existe modelo `Lead`**. `Opportunity` acumula ambos. `Contact.type` default `"LEAD"`, `status` default `"NEW"` — strings livres, não enums (causa das fases sujas, problema #5).

### 2.3 Contaminação imobiliária em `Contact`

`budget_min/max`, `interest_type`, `interest_zones`, `timeline`, `selling_also`, `needs_financing`, `property_address`, `asking_price`, `sale_reason`, `buying_also`, `commission`.

Em `Opportunity` os mesmos campos estão **duplicados** ("espelho do Contact"), mais `commission`/`opp_commission` — dois campos para a mesma ideia, já com nome de remendo.

### 2.4 Pessoa vs Empresa

Não há `Company`. `Contact` mistura os dois (tem `nif`, campo de empresa). O prompt (§3, princípio 3) exige a empresa como registo-mãe — **é criação nova, não migração**.

### 2.5 Presente e reutilizável

`Pipeline`/`PipelineStage` dinâmicos ✅ · `Conversation`/`Message` multicanal ✅ · `MessageTemplate` ✅ · `Automation`/`Enrollment`/`Run` (base das sequências de §6.7) ✅ · `Form`/`FormSubmission` (base do briefing §6.5) ✅ · `Interaction` (base de `Activity` §6.2) ✅ · `PhoneNumber` ✅ · `gdprConsent*` em Contact ✅.

**Ausentes por completo:** `Lead`, `Company`, `Product`, `DealLineItem`, `Quote`, `Project`, `Deliverable`, `Subscription`, `Invoice`, `Payment`, `RevenueSnapshot`, `ClientHealth`, `SavedView`, `Goal`, `CustomFieldDef/Value`, `Recording`, `CallEvent`, `AgentExtension`, `FeatureFlag`, `AuditLog`, `Note`, `Tag`.

O `Call` do §6.3 também não existe como modelo próprio — chamadas vivem em `Interaction`.

---

## 3. Telefonia — estado atual

**Provider: Twilio**, em 8 ficheiros de produção (`utils/twilio.service.ts`, `modules/calls`, `modules/phone-numbers`, `modules/conversations`, `settings`, `automation.engine`, `server.ts`) + `@twilio/voice-sdk` no browser. Dois testes existentes: `calls-routing.test.ts`, `phone-numbers.test.ts`.

Não há camada de abstração — o código chama Twilio diretamente. A `ITelephonyProvider` de §9.3 é **construção nova**, e a migração para Zadarma toca em todos esses ficheiros.

Existe spec anterior: [`docs/superpowers/specs/2026-04-19-telefonia-completa-design.md`](superpowers/specs/2026-04-19-telefonia-completa-design.md) — **ler antes da Fase 4.**

Sem `Recording`, sem `CallEvent`, sem storage próprio de gravações, sem dispositions.

---

## 4. Qualidade, testes e observabilidade

| Item | Estado |
|---|---|
| Testes backend | **5 ficheiros** Jest (`api`, `auth`, `health`, `calls-routing`, `phone-numbers`) — cobertura mínima |
| Testes frontend | **nenhum** |
| E2E | **nenhum** (sem Playwright no projeto; existe `.playwright-mcp/`) |
| Sentry | **não instalado** (exigido na Fase 0) |
| Lint | ESLint 9 no frontend; **nenhum no backend** |
| TypeScript | `~5.9.3` front / `^5.3.0` back — `strict` a confirmar por ficheiro |
| Jobs | apenas `jobs/automation-cron.ts` |
| Logs | winston + daily-rotate ✅ |
| CI | `.github/` presente — conteúdo a validar |

---

## 5. Correções às secções 5 e 11 do prompt

### 5.1 Arquitetura alvo revista (substitui §5)

Manter `/backend` + `/frontend`. Estrutura de destino no frontend:

```
frontend/src/
  pages/            hoje, leads, pipeline, contactos, empresas, clientes,
                    projetos, conversas, chamadas, agenda, receita,
                    relatorios, automacoes, definicoes
  components/ui/       primitivos shadcn-style sobre Radix (tokens, zero hex)
  components/data-table/  virtualizada (TanStack Table v8 + Virtual)
  components/board/       kanban (dnd-kit — migrar de @hello-pangea/dnd)
  components/record-panel/ drawer
  components/dialer/       softphone (state machine)
  components/command/      Cmd+K
  lib/views/       motor de Vistas Guardadas
  lib/telephony/   cliente SIP.js
  lib/realtime/    cliente SSE
  i18n/pt-PT.json
```

Backend mantém `src/modules/<dominio>/`, mais `lib/telephony/` (`ITelephonyProvider`, `zadarma`, `twilio`), `lib/automation/`, `lib/realtime/` (SSE + `LISTEN/NOTIFY`).

**Dependências a adicionar:** `@tanstack/react-query` v5, `@tanstack/react-table` v8, `@tanstack/react-virtual`, `libphonenumber-js`, `sip.js`, `nuqs` (ou equivalente de URL-state para React Router), `@sentry/react` + `@sentry/node`, `axe-core`, `@playwright/test`, `vitest`.

**A remover:** `@hello-pangea/dnd` (consolidar em dnd-kit), `@twilio/voice-sdk` (Fase 4).

### 5.2 Performance revista (substitui §11)

Mantêm-se inalterados e são a maior parte do valor: **keyset pagination** (§11.2), **índices compostos** (§11.3), **proibição de `COUNT(*)`** (§11.4), **anti-N+1** (§11.5), **virtualização** (§11.6), **TanStack Query** (§11.7), **pg_trgm** (§11.8), **SSE + LISTEN/NOTIFY** (§11.9), **higiene de dados** (§11.12).

Substituições:

| §11 original (Next.js) | Equivalente Vite/SPA |
|---|---|
| Fronteira RSC/Client; `initialData` de Server Component | Sem SSR. `initialData` via prefetch do TanStack Query + `<Suspense>`; skeletons em vez de HTML servido |
| `dynamic()` | `React.lazy()` + `Suspense` (Recharts, editor, importador CSV, dialer) |
| `next/font` | `@fontsource` self-hosted + `font-display: swap` |
| `next/image` | `<img>` com `width`/`height` explícitos, `loading="lazy"`, `decoding="async"` |
| `instrumentation.ts` | `@sentry/node` no arranque do Express + `@sentry/react` no `main.tsx` |
| LCP ≤2.5s por SSR | LCP ≤2.5s por code-splitting agressivo + rota `/hoje` leve. **Meta principal continua a ser INP ≤200ms** |

**Pré-requisito não negociável:** os índices de §11.3 só funcionam depois de **B1** resolvido (coluna `workspaceId`).

---

## 6. Validação dos 15 problemas do prompt (§2.2)

| # | Problema | Veredicto no código |
|---|---|---|
| 1,2 | Oportunidades em Lead Novo / duplicação | **Não verificável no código** — requer consulta à BD de produção |
| 3 | Sem `Lead` separado | ✅ **Confirmado** |
| 4 | Mojibake | **Não verificável no código** — requer consulta à BD |
| 5 | Fases sujas | ✅ **Confirmado** — `stage`/`status` são `String`, não enum |
| 6 | Número Twilio americano | ✅ Twilio confirmado no código; o número é configuração |
| 8 | Agendamentos pessoais | ✅ Plausível — `CalendarIntegration` sincroniza sem separação work/pessoal |
| 10 | Campos imobiliários herdados | ✅ **Confirmado** — ver §2.3 |
| 11 | Três ecrãs de equipa | ✅ **Confirmado** |
| 12 | Paginação 20/20 | A confirmar em `contacts.service.ts` |
| 14 | Módulo Propriedades morto | ✅ Confirmado no código (71 ficheiros) |
| 15 | Sem MRR/clientes/projetos/faturação | ✅ **Confirmado** — nenhum modelo existe |
| 7,9,13 | Tarefas vencidas, membros inativos, deltas fictícios | Comportamento de UI — a confirmar em runtime |

**Ação pendente:** 4 problemas (#1, #2, #4, #12) precisam de acesso à base de dados de produção. O `pg_dump` da Fase 0 serve simultaneamente de backup e de fonte para estas medições.

---

## 7. Riscos adicionais (a somar aos de §15)

| # | Risco | Mitigação |
|---|---|---|
| R16 | **Desnormalizar `workspaceId`** em ~25 modelos é migração de dados em tabelas com dados reais | Fase 1.5 dedicada; backfill idempotente; coluna nullable → backfill → `NOT NULL`; rollback testado |
| R17 | **71 ficheiros com Property** | Remoção por camadas (UI → rotas → serviços → schema); `@@map("_deprecated_")` antes de `DROP` |
| R18 | **Zod 3 vs Zod 4** | Unificar antes de partilhar schemas |
| R19 | **Dois sistemas de DnD** | Consolidar em dnd-kit na Fase 2 |
| R20 | **Zero testes de frontend e zero E2E** — o plano exige E2E na Fase 11 | Introduzir Vitest + Playwright na Fase 0/2, não no fim |
| R21 | **`buildScope` devolve `{}`** para `LOCATION_ADMIN` sem `locationId` | Corrigir já na Fase 1 (falha para fechado, nunca aberto) |

---

## 8. Próximo passo

`docs/PLANO.md` — plano por fases adaptado a estes achados, com a **Fase 1.5 (workspaceId)** inserida entre Limpeza e Fundações.
