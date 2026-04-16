# Multiple Pipelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded Kanban pipeline with multiple named pipelines, each with their own configurable stages (name, colour, order).

**Architecture:** Add `Pipeline` and `PipelineStage` DB tables. `Opportunity` gets a nullable `pipelineId` and `stageId`. A seed migration creates a default "Geral" pipeline from the existing stage enum. The Kanban sidebar lists pipelines; the board renders columns from `PipelineStage` instead of the hardcoded `STAGE_ORDER` constant. Admins manage stages in Settings.

**Tech Stack:** Prisma (PostgreSQL), Express/TypeScript backend, React + Vite frontend, @hello-pangea/dnd (already installed)

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/prisma/schema.prisma` |
| Create | `backend/prisma/migrations/..._add_pipeline_tables/migration.sql` (auto-generated) |
| Create | `backend/src/modules/pipelines/pipelines.service.ts` |
| Create | `backend/src/modules/pipelines/pipelines.router.ts` |
| Modify | `backend/src/server.ts` — mount pipelines router |
| Modify | `backend/src/modules/opportunities/opportunities.service.ts` — add `pipelineId` filter; update `moveStage` to accept `stageId` |
| Modify | `backend/src/modules/opportunities/opportunities.router.ts` — pass `pipelineId` param |
| Create | `frontend/src/api/pipelines.api.ts` |
| Modify | `frontend/src/pages/PipelinePage.tsx` — add sidebar + load pipeline list |
| Modify | `frontend/src/components/kanban/KanbanBoard.tsx` — accept `stages` prop, remove hardcoded STAGE_ORDER |
| Modify | `frontend/src/components/kanban/KanbanColumn.tsx` — accept `stageId` alongside `stage` string |
| Modify | `frontend/src/pages/agency/SettingsPage.tsx` (or create `PipelineSettingsSection`) — manage stages per pipeline |

---

## Task 1: Add Pipeline and PipelineStage to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add Pipeline and PipelineStage models + update Opportunity**

Open `backend/prisma/schema.prisma` and add after the `Location` model (or at the end before closing):

```prisma
model Pipeline {
  id         String          @id @default(cuid())
  name       String
  position   Int             @default(0)
  agencyId   String?
  agency     Agency?         @relation(fields: [agencyId], references: [id])
  locationId String?
  location   Location?       @relation("PipelineLocation", fields: [locationId], references: [id])
  stages     PipelineStage[]
  opportunities Opportunity[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}

model PipelineStage {
  id           String        @id @default(cuid())
  name         String
  color        String        @default("#6366f1")
  position     Int           @default(0)
  pipelineId   String
  pipeline     Pipeline      @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  opportunities Opportunity[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

In the `Opportunity` model, add after `position Int @default(0)`:

```prisma
  pipelineId   String?
  pipeline     Pipeline?      @relation(fields: [pipelineId], references: [id])
  stageId      String?
  pipelineStage PipelineStage? @relation(fields: [stageId], references: [id])
```

In the `Agency` model add the relation:
```prisma
  pipelines    Pipeline[]
```

In the `Location` model add the relation:
```prisma
  pipelines    Pipeline[]     @relation("PipelineLocation")
```

- [ ] **Step 2: Generate migration**

```bash
cd "backend"
npx prisma migrate dev --name add_pipeline_tables
```

Expected: migration file created, DB updated, no errors.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `@prisma/client` updated with new types.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): add Pipeline and PipelineStage models, link Opportunity"
```

---

## Task 2: Backend — Pipelines service and router

**Files:**
- Create: `backend/src/modules/pipelines/pipelines.service.ts`
- Create: `backend/src/modules/pipelines/pipelines.router.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Create pipelines service**

Create `backend/src/modules/pipelines/pipelines.service.ts`:

```typescript
import prisma from '../../config/database';
import { buildScope } from '../../lib/scope';

// ─── Default stages seeded for a new pipeline ────────────────────────────────

const DEFAULT_STAGES = [
  { name: 'Lead Novo',          color: '#6366f1', position: 0 },
  { name: 'Primeiro Contacto',  color: '#8b5cf6', position: 1 },
  { name: 'Visita Agendada',    color: '#f59e0b', position: 2 },
  { name: 'Visita Realizada',   color: '#10b981', position: 3 },
  { name: 'Proposta Enviada',   color: '#3b82f6', position: 4 },
  { name: 'Negociação',         color: '#f97316', position: 5 },
  { name: 'Negócio Fechado',    color: '#22c55e', position: 6 },
  { name: 'Perdido',            color: '#ef4444', position: 7 },
];

// ─── list ─────────────────────────────────────────────────────────────────────

export const list = async (user: any) => {
  const scope = await buildScope(user);
  const where: any = {};
  if (scope.agencyId) where.agencyId = scope.agencyId;
  else if (scope.locationId) where.locationId = scope.locationId;

  return prisma.pipeline.findMany({
    where,
    orderBy: { position: 'asc' },
    include: {
      stages: { orderBy: { position: 'asc' } },
      _count: { select: { opportunities: true } },
    },
  });
};

// ─── getById ──────────────────────────────────────────────────────────────────

export const getById = async (id: string, user: any) => {
  const scope = await buildScope(user);
  const where: any = { id };
  if (scope.agencyId) where.agencyId = scope.agencyId;
  else if (scope.locationId) where.locationId = scope.locationId;

  const pipeline = await prisma.pipeline.findFirst({
    where,
    include: { stages: { orderBy: { position: 'asc' } } },
  });
  if (!pipeline) throw Object.assign(new Error('Pipeline não encontrada'), { status: 404 });
  return pipeline;
};

// ─── create ───────────────────────────────────────────────────────────────────

export const create = async (name: string, user: any) => {
  const scope = await buildScope(user);
  const count = await prisma.pipeline.count({
    where: scope.agencyId ? { agencyId: scope.agencyId } : { locationId: scope.locationId },
  });

  const pipeline = await prisma.pipeline.create({
    data: {
      name,
      position: count,
      agencyId: scope.agencyId || null,
      locationId: !scope.agencyId ? scope.locationId || null : null,
      stages: { create: DEFAULT_STAGES },
    },
    include: { stages: { orderBy: { position: 'asc' } } },
  });
  return pipeline;
};

// ─── update ───────────────────────────────────────────────────────────────────

export const update = async (id: string, data: { name?: string; position?: number }, user: any) => {
  await getById(id, user); // access check
  return prisma.pipeline.update({ where: { id }, data });
};

// ─── remove ───────────────────────────────────────────────────────────────────

export const remove = async (id: string, user: any) => {
  const pipeline = await getById(id, user);
  const count = await prisma.opportunity.count({ where: { pipelineId: id } });
  if (count > 0) {
    throw Object.assign(
      new Error(`Não é possível eliminar: a pipeline tem ${count} oportunidade(s).`),
      { status: 400 }
    );
  }
  return prisma.pipeline.delete({ where: { id } });
};

// ─── createStage ──────────────────────────────────────────────────────────────

export const createStage = async (
  pipelineId: string,
  data: { name: string; color?: string },
  user: any
) => {
  await getById(pipelineId, user); // access check
  const count = await prisma.pipelineStage.count({ where: { pipelineId } });
  return prisma.pipelineStage.create({
    data: { pipelineId, name: data.name, color: data.color || '#6366f1', position: count },
  });
};

// ─── updateStage ──────────────────────────────────────────────────────────────

export const updateStage = async (
  pipelineId: string,
  stageId: string,
  data: { name?: string; color?: string; position?: number },
  user: any
) => {
  await getById(pipelineId, user); // access check
  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId } });
  if (!stage) throw Object.assign(new Error('Etapa não encontrada'), { status: 404 });
  return prisma.pipelineStage.update({ where: { id: stageId }, data });
};

// ─── removeStage ──────────────────────────────────────────────────────────────

export const removeStage = async (pipelineId: string, stageId: string, user: any) => {
  await getById(pipelineId, user); // access check
  const count = await prisma.opportunity.count({ where: { stageId } });
  if (count > 0) {
    throw Object.assign(
      new Error(`Não é possível eliminar: a etapa tem ${count} oportunidade(s).`),
      { status: 400 }
    );
  }
  return prisma.pipelineStage.delete({ where: { id: stageId } });
};

// ─── ensureDefaultPipeline ────────────────────────────────────────────────────
// Called at server startup — creates a "Geral" pipeline for each agency that has none.

export const ensureDefaultPipelines = async () => {
  const agencies = await prisma.agency.findMany({ select: { id: true } });
  for (const agency of agencies) {
    const existing = await prisma.pipeline.count({ where: { agencyId: agency.id } });
    if (existing === 0) {
      await prisma.pipeline.create({
        data: {
          name: 'Geral',
          position: 0,
          agencyId: agency.id,
          stages: { create: DEFAULT_STAGES },
        },
      });
      console.log(`[Pipelines] Created default pipeline for agency ${agency.id}`);
    }
  }
};
```

- [ ] **Step 2: Create pipelines router**

Create `backend/src/modules/pipelines/pipelines.router.ts`:

```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as svc from './pipelines.service';

const router = Router();

// ─── Pipelines ────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.list(req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req: any, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    res.status(201).json(await svc.create(name.trim(), req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.update(req.params.id, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    await svc.remove(req.params.id, req.user);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ─── Stages ───────────────────────────────────────────────────────────────────

router.post('/:id/stages', requireAuth, async (req: any, res) => {
  try {
    res.status(201).json(await svc.createStage(req.params.id, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id/stages/:stageId', requireAuth, async (req: any, res) => {
  try {
    res.json(await svc.updateStage(req.params.id, req.params.stageId, req.body, req.user));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id/stages/:stageId', requireAuth, async (req: any, res) => {
  try {
    await svc.removeStage(req.params.id, req.params.stageId, req.user);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
```

- [ ] **Step 3: Mount router and call ensureDefaultPipelines in server.ts**

In `backend/src/server.ts`, add after the existing route imports:

```typescript
import pipelinesRouter from './modules/pipelines/pipelines.router';
import { ensureDefaultPipelines } from './modules/pipelines/pipelines.service';
```

Add the route mount (alongside the other `app.use('/...')` calls):

```typescript
app.use('/api/pipelines', pipelinesRouter);
```

Add the startup call inside the server startup block (after `loadSettingsFromDB()`):

```typescript
await ensureDefaultPipelines();
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/pipelines/ backend/src/server.ts
git commit -m "feat(pipelines): add Pipeline service, router, ensureDefaultPipelines"
```

---

## Task 3: Update Opportunities service to filter by pipelineId and stageId

**Files:**
- Modify: `backend/src/modules/opportunities/opportunities.service.ts`
- Modify: `backend/src/modules/opportunities/opportunities.router.ts`

- [ ] **Step 1: Add pipelineId filter to list()**

In `opportunities.service.ts`, the `list()` function currently accepts `{ stage?, assignedToId?, contactId?, page?, limit? }`. Add `pipelineId` and `stageId`:

```typescript
export const list = async (
  filters: {
    stage?: string;
    stageId?: string;
    pipelineId?: string;
    assignedToId?: string;
    contactId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  if (filters.stage) where.stage = filters.stage;
  if (filters.stageId) where.stageId = filters.stageId;
  if (filters.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.contactId) where.contactId = filters.contactId;
  // ... rest unchanged
```

- [ ] **Step 2: Update moveStage() to also update stageId**

In `moveStage()`, the final `tx.opportunity.update` currently sets `{ stage: newStage, position: adjustedPosition }`. Add `stageId`:

```typescript
const updated = await tx.opportunity.update({
  where: { id },
  data: {
    stage: newStage as any,
    stageId: newStageId || null,  // new param passed in
    position: adjustedPosition,
  },
  include: {
    contact: { select: { id: true, name: true, email: true } },
    property: { select: { id: true, title: true, price: true } },
    assignedTo: { select: { id: true, name: true } },
  },
});
```

Update the function signature to accept `newStageId`:

```typescript
export const moveStage = async (
  id: string,
  newStage: string,
  newPosition: number,
  user: any,
  newStageId?: string   // optional — when using pipeline stages
) => {
```

- [ ] **Step 3: Pass pipelineId param in router**

In `opportunities.router.ts`, the `GET /` handler calls `svc.list(filters, req.user)`. Ensure `pipelineId` and `stageId` are extracted from query:

```typescript
const { stage, stageId, pipelineId, assignedToId, contactId, page, limit } = req.query as any;
res.json(await svc.list({ stage, stageId, pipelineId, assignedToId, contactId, page: +page || 1, limit: +limit || 50 }, req.user));
```

In the `PATCH /:id/stage` handler, extract `stageId` from body and pass to `moveStage`:

```typescript
const { stage, position, stageId } = req.body;
res.json(await svc.moveStage(req.params.id, stage, position ?? 0, req.user, stageId));
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/opportunities/
git commit -m "feat(opportunities): support pipelineId/stageId filters and moveStage"
```

---

## Task 4: Frontend — pipelines.api.ts

**Files:**
- Create: `frontend/src/api/pipelines.api.ts`

- [ ] **Step 1: Create the API file**

Create `frontend/src/api/pipelines.api.ts`:

```typescript
import api from './api';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  pipelineId: string;
}

export interface Pipeline {
  id: string;
  name: string;
  position: number;
  stages: PipelineStage[];
  _count?: { opportunities: number };
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export const getPipelines = () => api.get<Pipeline[]>('/pipelines');

export const createPipeline = (name: string) =>
  api.post<Pipeline>('/pipelines', { name });

export const updatePipeline = (id: string, data: { name?: string; position?: number }) =>
  api.put<Pipeline>(`/pipelines/${id}`, data);

export const deletePipeline = (id: string) =>
  api.delete(`/pipelines/${id}`);

// ─── Stages ───────────────────────────────────────────────────────────────────

export const createStage = (pipelineId: string, data: { name: string; color?: string }) =>
  api.post<PipelineStage>(`/pipelines/${pipelineId}/stages`, data);

export const updateStage = (
  pipelineId: string,
  stageId: string,
  data: { name?: string; color?: string; position?: number }
) => api.put<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, data);

export const deleteStage = (pipelineId: string, stageId: string) =>
  api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/pipelines.api.ts
git commit -m "feat(frontend): add pipelines.api.ts"
```

---

## Task 5: Update KanbanBoard to accept dynamic stages

**Files:**
- Modify: `frontend/src/components/kanban/KanbanBoard.tsx`

The current `KanbanBoard` uses `STAGE_ORDER` from constants to generate columns. We need it to accept a `stages` prop (array of `PipelineStage`) AND fall back to the old constant if no stages are passed (backwards compat during transition).

- [ ] **Step 1: Add stages prop and update column generation**

At the top of `KanbanBoard.tsx`, add the import:

```typescript
import type { PipelineStage } from '../../api/pipelines.api';
```

Add `stages` to the props interface (find the existing props type, likely `KanbanBoardProps` or inline):

```typescript
stages?: PipelineStage[];
```

Find the section that maps `STAGE_ORDER` to columns (around line 874). Replace it so that when `stages` prop is provided it uses those, otherwise falls back to `STAGE_ORDER`:

```typescript
const stageList = stages && stages.length > 0
  ? stages.map(s => ({ key: s.id, label: s.name, color: s.color }))
  : STAGE_ORDER.map(s => ({ key: s, label: STAGE_LABELS[s], color: undefined }));
```

Then in the render loop, replace `STAGE_ORDER.map(stage => ...)` with `stageList.map(({ key, label, color }) => ...)` and pass `stage={key}` and `label={label}` to `KanbanColumn`.

Also update `moveOpportunityStage(id, key, position)` call to also pass `stageId: key` when using dynamic stages:

```typescript
await moveOpportunityStage(id, key, position, stages ? key : undefined);
```

Update `moveOpportunityStage` in `frontend/src/api/opportunities.api.ts` to accept optional `stageId`:

```typescript
export const moveOpportunityStage = (id: string, stage: string, position: number, stageId?: string) =>
  api.patch(`/opportunities/${id}/stage`, { stage, position, stageId });
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/kanban/KanbanBoard.tsx frontend/src/api/opportunities.api.ts
git commit -m "feat(kanban): accept dynamic pipeline stages prop"
```

---

## Task 6: Update PipelinePage with sidebar

**Files:**
- Modify: `frontend/src/pages/PipelinePage.tsx`

- [ ] **Step 1: Rewrite PipelinePage with sidebar + pipeline selection**

Replace the entire content of `frontend/src/pages/PipelinePage.tsx` with:

```typescript
import React, { useEffect, useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { getPipelines, createPipeline, type Pipeline } from '../api/pipelines.api'
import { useUIStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { PageSpinner } from '../components/ui/Spinner'

export const PipelinePage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const canManage = user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN'

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPipelines()
      const list: Pipeline[] = Array.isArray(res.data) ? res.data : []
      setPipelines(list)
      if (list.length > 0 && !activePipeline) setActivePipeline(list[0])
    } catch {
      showToast('Erro ao carregar pipelines', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const res = await createPipeline(newName.trim())
      showToast('Pipeline criada', 'success')
      setNewName('')
      setCreating(false)
      await load()
      setActivePipeline(res.data)
    } catch {
      showToast('Erro ao criar pipeline', 'error')
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 200,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e5e9f2',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
      }}>
        <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pipelines
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePipeline(p)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: activePipeline?.id === p.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                color: activePipeline?.id === p.id ? '#6366f1' : '#374151',
                border: 'none',
                fontSize: 13,
                fontWeight: activePipeline?.id === p.id ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                borderRadius: 0,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {activePipeline?.id === p.id && <ChevronRight size={14} />}
            </button>
          ))}
        </div>
        {canManage && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e9f2' }}>
            {creating ? (
              <form onSubmit={handleCreate}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome da pipeline"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1.5px solid #6366f1',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    marginBottom: 6,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setCreating(false)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid #e5e9f2', background: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1.5px dashed #d1d5db',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={13} /> Nova pipeline
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activePipeline ? (
          <KanbanBoard
            key={activePipeline.id}
            pipelineId={activePipeline.id}
            stages={activePipeline.stages}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
            Seleciona uma pipeline
          </div>
        )}
      </div>
    </div>
  )
}
```

Also add `pipelineId` and `stages` to the `KanbanBoard` props interface in `KanbanBoard.tsx`:

```typescript
pipelineId?: string;
stages?: PipelineStage[];
```

And pass `pipelineId` as a filter when fetching opportunities inside `KanbanBoard` (find the `getOpportunities` call and add `pipelineId` to the params).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PipelinePage.tsx frontend/src/components/kanban/KanbanBoard.tsx
git commit -m "feat(pipeline-page): sidebar with pipeline list, dynamic kanban stages"
```

---

## Task 7: Pipeline stage management in Settings

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx` (add a Pipelines section) OR create a dedicated route

Since SettingsPage is large, we add a new page accessible from the agency settings area.

- [ ] **Step 1: Create PipelineSettingsPage**

Create `frontend/src/pages/agency/PipelineSettingsPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react'
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react'
import {
  getPipelines, updatePipeline, deletePipeline,
  createStage, updateStage, deleteStage,
  type Pipeline, type PipelineStage
} from '../../api/pipelines.api'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { PageSpinner } from '../../components/ui/Spinner'

const PRESET_COLORS = ['#6366f1','#8b5cf6','#f59e0b','#10b981','#3b82f6','#f97316','#22c55e','#ef4444','#06b6d4','#ec4899']

export const PipelineSettingsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [stageForm, setStageForm] = useState({ name: '', color: '#6366f1' })
  const [addingStage, setAddingStage] = useState(false)
  const [newStageForm, setNewStageForm] = useState({ name: '', color: '#6366f1' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await getPipelines()
      const list: Pipeline[] = Array.isArray(res.data) ? res.data : []
      setPipelines(list)
      if (list.length > 0 && !activePipelineId) setActivePipelineId(list[0].id)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || null

  const handleDeletePipeline = async (p: Pipeline) => {
    if (!confirm(`Eliminar pipeline "${p.name}"?`)) return
    try {
      await deletePipeline(p.id)
      showToast('Pipeline eliminada', 'success')
      setActivePipelineId(null)
      load()
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Erro ao eliminar', 'error')
    }
  }

  const handleSaveStage = async (stage: PipelineStage) => {
    if (!activePipeline) return
    try {
      await updateStage(activePipeline.id, stage.id, stageForm)
      showToast('Etapa atualizada', 'success')
      setEditingStageId(null)
      load()
    } catch {
      showToast('Erro ao atualizar etapa', 'error')
    }
  }

  const handleDeleteStage = async (stage: PipelineStage) => {
    if (!activePipeline) return
    if (!confirm(`Eliminar etapa "${stage.name}"?`)) return
    try {
      await deleteStage(activePipeline.id, stage.id)
      showToast('Etapa eliminada', 'success')
      load()
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Erro ao eliminar etapa', 'error')
    }
  }

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePipeline || !newStageForm.name.trim()) return
    try {
      await createStage(activePipeline.id, newStageForm)
      showToast('Etapa criada', 'success')
      setAddingStage(false)
      setNewStageForm({ name: '', color: '#6366f1' })
      load()
    } catch {
      showToast('Erro ao criar etapa', 'error')
    }
  }

  if (loading) return <PageSpinner />

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1.5px solid #dce3ef',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#f8f9fc', color: '#0f2553',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', marginBottom: 4 }}>Gestão de Pipelines</h1>
      <p style={{ fontSize: 13, color: '#6b7a99', marginBottom: 28 }}>Configure as etapas de cada pipeline de vendas</p>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Pipeline list */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pipelines</div>
          {pipelines.map(p => (
            <div
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                background: activePipelineId === p.id ? 'rgba(99,102,241,0.1)' : '#fff',
                border: `1px solid ${activePipelineId === p.id ? '#6366f1' : '#e5e9f2'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: activePipelineId === p.id ? '#6366f1' : '#374151' }}>{p.name}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDeletePipeline(p) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}
              ><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        {/* Stage editor */}
        <div style={{ flex: 1 }}>
          {activePipeline ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2553', marginBottom: 16 }}>
                Etapas — {activePipeline.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activePipeline.stages.map(stage => (
                  <div key={stage.id} style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: stage.color, flexShrink: 0 }} />
                    {editingStageId === stage.id ? (
                      <>
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={stageForm.name}
                          onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          {PRESET_COLORS.map(c => (
                            <div key={c} onClick={() => setStageForm(f => ({ ...f, color: c }))}
                              style={{ width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer', outline: stageForm.color === c ? '2px solid #0f2553' : 'none', outlineOffset: 1 }} />
                          ))}
                        </div>
                        <button onClick={() => handleSaveStage(stage)} style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                        <button onClick={() => setEditingStageId(null)} style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{stage.name}</span>
                        <button onClick={() => { setEditingStageId(stage.id); setStageForm({ name: stage.name, color: stage.color }) }}
                          style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#6b7a99', fontFamily: 'inherit' }}>Editar</button>
                        <button onClick={() => handleDeleteStage(stage)}
                          style={{ border: '1px solid #fee2e2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add stage */}
                {addingStage ? (
                  <form onSubmit={handleAddStage} style={{ background: '#fff', border: '1.5px solid #6366f1', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      autoFocus
                      style={{ ...inputStyle, flex: 1 }}
                      value={newStageForm.name}
                      onChange={e => setNewStageForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome da etapa"
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {PRESET_COLORS.map(c => (
                        <div key={c} onClick={() => setNewStageForm(f => ({ ...f, color: c }))}
                          style={{ width: 16, height: 16, borderRadius: 4, background: c, cursor: 'pointer', outline: newStageForm.color === c ? '2px solid #0f2553' : 'none', outlineOffset: 1 }} />
                      ))}
                    </div>
                    <button type="submit" style={{ border: 'none', background: '#6366f1', color: '#fff', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Adicionar</button>
                    <button type="button" onClick={() => setAddingStage(false)} style={{ border: '1px solid #e5e9f2', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                  </form>
                ) : (
                  <button onClick={() => setAddingStage(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1.5px dashed #d1d5db', background: 'transparent', color: '#9ca3af', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={13} /> Adicionar etapa
                  </button>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Seleciona uma pipeline para gerir as suas etapas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route to the app router**

In the main router file (typically `frontend/src/App.tsx` or `frontend/src/router.tsx`), add:

```typescript
import { PipelineSettingsPage } from './pages/agency/PipelineSettingsPage'
```

And add the route (alongside other agency routes):

```typescript
<Route path="/agency/pipelines" element={<PipelineSettingsPage />} />
```

Also add a link to this page in the agency settings navigation (in `AgencyPage.tsx` or the sidebar nav where agency settings links live).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/agency/PipelineSettingsPage.tsx frontend/src/App.tsx
git commit -m "feat(pipeline-settings): stage management UI per pipeline"
```

---

## Task 8: Deploy and smoke test

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Verify on Render**

After deploy (2-3 min):
1. Open the CRM → Pipeline page — sidebar should show "Geral" pipeline
2. The kanban columns should match the default stages (Lead Novo, Primeiro Contacto, etc.)
3. Drag a card between columns — should still work
4. Click "+ Nova pipeline" — create "Arrendamento"
5. Go to Agency Settings → Pipelines — edit a stage name and colour
6. Switch back to Pipeline page, switch to "Arrendamento" — should show its own stages

- [ ] **Step 3: Verify old opportunities migrated**

All pre-existing opportunities should appear in the "Geral" pipeline (their `pipelineId` is null, and the Kanban falls back to the stage string — confirm this in the kanban by checking if cards appear).
