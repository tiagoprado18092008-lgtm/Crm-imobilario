# Design: Múltiplas Pipelines + Calendário por Consultor

**Data:** 2026-04-16  
**Estado:** Aprovado

---

## 1. Contexto

O CRM tem atualmente uma única pipeline Kanban com etapas fixas definidas em `frontend/src/utils/constants.ts`. O calendário mostra todos os eventos sem filtro por utilizador. O objetivo é:

1. Permitir criar múltiplas pipelines, cada uma com etapas próprias configuráveis.
2. Permitir filtrar o calendário por consultor.

---

## 2. Múltiplas Pipelines

### 2.1 Navegação
Sidebar lateral à esquerda do Kanban com a lista de pipelines da agência. Clicar numa pipeline carrega as suas etapas e oportunidades. Botão "+ Nova pipeline" no fundo da sidebar. A pipeline ativa fica destacada.

### 2.2 Modelo de dados

**Nova tabela `Pipeline`:**
- `id` — cuid
- `name` — string (ex: "Compra", "Arrendamento")
- `agencyId` — FK para Agency
- `locationId` — FK para Location (opcional — pipeline pode ser global à agência ou específica de um escritório)
- `position` — int (ordem na sidebar)
- `createdAt`, `updatedAt`

**Nova tabela `PipelineStage`:**
- `id` — cuid
- `pipelineId` — FK para Pipeline
- `name` — string (ex: "Lead Novo", "Visita Agendada")
- `color` — string hex (ex: "#6366f1")
- `position` — int (ordem das colunas)

**Alteração em `Opportunity`:**
- Adicionar campo `pipelineId` FK para Pipeline (nullable para retrocompatibilidade)
- Campo `stage` atual passa a referenciar o `PipelineStage.id` em vez de um enum fixo — mas para não quebrar dados existentes, mantém-se `stage` como string e adiciona-se `stageId` (FK para PipelineStage, nullable)

**Migração de dados:**
- Criar uma pipeline padrão "Geral" por agência
- Associar todas as oportunidades existentes a essa pipeline
- Criar PipelineStages para essa pipeline a partir dos valores actuais do enum

### 2.3 API backend

Novos endpoints:
- `GET /pipelines` — listar pipelines da agência/location do utilizador
- `POST /pipelines` — criar pipeline (AGENCY_OWNER, AGENCY_ADMIN)
- `PUT /pipelines/:id` — atualizar nome/posição
- `DELETE /pipelines/:id` — eliminar (só se sem oportunidades)
- `GET /pipelines/:id/stages` — listar etapas
- `POST /pipelines/:id/stages` — criar etapa
- `PUT /pipelines/:id/stages/:stageId` — atualizar etapa (nome, cor, posição)
- `DELETE /pipelines/:id/stages/:stageId` — eliminar etapa (só se vazia)

Endpoint existente `GET /opportunities` recebe novo parâmetro `pipelineId`.  
Endpoint `PATCH /opportunities/:id/stage` passa a aceitar `stageId` (PipelineStage.id).

### 2.4 Frontend

**`PipelinePage.tsx`** — passa a ter layout com sidebar + kanban:
- Sidebar: lista de pipelines, botão nova pipeline
- Kanban: colunas geradas a partir das `PipelineStage` da pipeline selecionada (não do enum hardcoded)

**`KanbanBoard.tsx`** — recebe `stages` como prop (array de PipelineStage) em vez de usar o enum.

**Novo `PipelineSettingsPage`** (ou secção nas Definições) para gerir etapas de cada pipeline: adicionar, renomear, mudar cor, reordenar, eliminar.

**`frontend/src/api/pipelines.api.ts`** — novo ficheiro com todos os calls às pipelines.

### 2.5 Permissões
- AGENCY_OWNER, AGENCY_ADMIN: criar/editar/eliminar pipelines e etapas
- TEAM_LEADER, CONSULTANT: apenas leitura das pipelines; não podem gerir etapas
- Oportunidades seguem o RBAC existente (scope por location/agency)

---

## 3. Calendário por Consultor

### 3.1 Navegação
Dropdown "Ver consultor" no header do CalendarPage, à esquerda do seletor de mês. Por defeito mostra "Todos os consultores". Ao selecionar um consultor, o calendário filtra CalendarEvents e Appointments pelo `userId`/`assignedToId` correspondente.

### 3.2 Visibilidade por role
- AGENCY_OWNER, AGENCY_ADMIN, TEAM_LEADER: vêem o dropdown com todos os consultores da sua agência/location
- CONSULTANT: não vê o dropdown — vê apenas os seus próprios eventos (comportamento atual mantido)

### 3.3 API backend

**`GET /calendar/events`** — adicionar parâmetro `userId` (opcional). Se presente e o requester tiver permissão, filtra por esse userId.

**`GET /appointments`** — adicionar parâmetro `assignedToId` (opcional, já pode existir — verificar e expor no frontend).

**`GET /users?role=consultant&locationId=x`** — endpoint já existente para popular o dropdown com os consultores da equipa.

### 3.4 Frontend

**`CalendarPage.tsx`** — adicionar dropdown de consultor no header. Controlado por estado local `selectedUserId` (null = todos). Passado como parâmetro aos hooks/calls de eventos e appointments.

### 3.5 Distinção visual: origem do evento

Os eventos no calendário têm dois tipos de origem:
- **Google Calendar** — sincronizados via integração OAuth (`externalProvider = "google"` em `CalendarEvent`)
- **CRM** — criados diretamente no CRM (`externalProvider = null`)

Cada evento no calendário mostra um indicador visual subtil da sua origem:
- Eventos do **Google Calendar**: pequeno ícone "G" (ou símbolo de calendário externo) no canto do evento
- Eventos do **CRM**: pequeno ícone de ponto ou sem ícone (origem nativa)
- **Appointments** (marcações internas de visitas/calls): badge distinto da cor do tipo (VISIT, CALL, MEETING)

A lógica de distinção usa o campo `externalProvider` em `CalendarEvent`. Para `Appointment`, a origem é sempre CRM.

O `CalendarView.tsx` e `EventModal.tsx` recebem e exibem este campo. Não requer alterações de backend — a informação já existe no modelo.

---

## 4. Fora de âmbito

- Partilha de pipelines entre agências
- Permissões granulares por etapa
- Arrastar oportunidades entre pipelines diferentes
- Calendário com vista simultânea de múltiplos consultores com cores (foi discutido e descartado)

---

## 5. Ficheiros críticos a modificar

| Ficheiro | Alteração |
|---|---|
| `backend/prisma/schema.prisma` | Adicionar Pipeline, PipelineStage; alterar Opportunity |
| `backend/src/modules/opportunities/opportunities.service.ts` | Filtrar por pipelineId; moveStage usa stageId |
| `backend/src/modules/opportunities/opportunities.router.ts` | Parâmetro pipelineId |
| `backend/src/modules/calendar/calendar-events.service.ts` | Filtrar por userId se autorizado |
| `backend/src/modules/calendar/calendar-events.router.ts` | Parâmetro userId |
| `backend/src/modules/appointments/appointments.service.ts` | Expor filtro assignedToId |
| `frontend/src/pages/PipelinePage.tsx` | Layout sidebar + kanban |
| `frontend/src/components/kanban/KanbanBoard.tsx` | Aceitar stages como prop |
| `frontend/src/pages/CalendarPage.tsx` | Dropdown consultor |
| `frontend/src/components/calendar/CalendarView.tsx` | Indicador visual de origem do evento (Google vs CRM vs Appointment) |
| `frontend/src/components/calendar/EventModal.tsx` | Mostrar origem do evento no modal de detalhe |
| `frontend/src/api/pipelines.api.ts` | Novo ficheiro |
