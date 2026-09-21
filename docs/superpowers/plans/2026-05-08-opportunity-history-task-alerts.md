# Opportunity History + Task Overdue Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registar histórico de alterações nas oportunidades (etapa, valor, responsável) e enviar notificação por email para tarefas em atraso via cron job diário.

**Architecture:** Histórico: hook no `opportunities.service.ts` escreve para `ActivityLog` a cada update com diff do que mudou; a UI mostra timeline no detalhe da oportunidade. Tarefas em atraso: cron node-cron (já instalado) no servidor que corre de manhã, busca tasks `PENDING/IN_PROGRESS` com `dueDate < hoje`, envia email ao responsável.

**Tech Stack:** Prisma ActivityLog (já existe), node-cron (já instalado), nodemailer (já configurado), React.

---

### Task 1: Histórico de alterações — Backend

**Files:**
- Modify: `backend/src/modules/opportunities/opportunities.service.ts`
- Modify: `backend/src/lib/activity-logger.ts`

- [ ] **Step 1: Verificar activity-logger existente**

Abrir `backend/src/lib/activity-logger.ts` e confirmar a assinatura de `logActivity`. Deve ser algo como:

```typescript
export const logActivity = async (params: {
  agencyId?: string;
  locationId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}) => { ... }
```

Se não existir, criar o ficheiro com:
```typescript
import prisma from '../config/database';

export const logActivity = async (params: {
  agencyId?: string; locationId?: string; userId?: string;
  action: string; entityType?: string; entityId?: string; metadata?: any; ip?: string;
}) => {
  try {
    await prisma.activityLog.create({ data: params });
  } catch { /* non-blocking */ }
};
```

- [ ] **Step 2: Registar alterações no update de oportunidade**

Em `opportunities.service.ts`, na função `update` (ou equivalente), antes do `prisma.opportunity.update`, buscar o estado atual e fazer diff:

```typescript
export const update = async (id: string, dto: any, user: any) => {
  const current = await prisma.opportunity.findUnique({ where: { id } });
  if (!current) throw Object.assign(new Error('Oportunidade não encontrada'), { status: 404 });

  const changes: Record<string, { from: any; to: any }> = {};
  if (dto.stage !== undefined && dto.stage !== current.stage) {
    changes.stage = { from: current.stage, to: dto.stage };
  }
  if (dto.value !== undefined && dto.value !== current.value) {
    changes.value = { from: current.value, to: dto.value };
  }
  if (dto.assignedToId !== undefined && dto.assignedToId !== current.assignedToId) {
    changes.assignedToId = { from: current.assignedToId, to: dto.assignedToId };
  }
  if (dto.title !== undefined && dto.title !== current.title) {
    changes.title = { from: current.title, to: dto.title };
  }

  const updated = await prisma.opportunity.update({ where: { id }, data: dto });

  if (Object.keys(changes).length > 0) {
    await logActivity({
      agencyId: user?.agencyId,
      locationId: user?.locationId,
      userId: user?.id,
      action: 'OPPORTUNITY_UPDATED',
      entityType: 'Opportunity',
      entityId: id,
      metadata: { changes, title: current.title },
    });
  }

  return updated;
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/opportunities/ backend/src/lib/activity-logger.ts
git commit -m "feat(opportunities): log field changes to ActivityLog on update"
```

---

### Task 2: Histórico de alterações — Frontend timeline

**Files:**
- Modify: `frontend/src/components/kanban/KanbanBoard.tsx` (modal de detalhe da oportunidade)

- [ ] **Step 1: Buscar histórico de atividade para a oportunidade**

No KanbanBoard ou onde está o modal de detalhe de oportunidade, adicionar fetch de activity logs quando o modal abre:

```tsx
const [history, setHistory] = useState<any[]>([])

useEffect(() => {
  if (!selectedOpp?.id) return
  api.get(`/activity?entityType=Opportunity&entityId=${selectedOpp.id}`)
    .then(r => setHistory(r.data?.data || r.data || []))
    .catch(() => {})
}, [selectedOpp?.id])
```

> Verificar o endpoint `/api/activity` — se aceitar `entityType` e `entityId` como query params. Se não aceitar, adicionar esse filtro no activity controller.

- [ ] **Step 2: Garantir que o endpoint de activity aceita filtros**

Em `backend/src/modules/activity/activity.router.ts` ou `activity.controller.ts`, verificar se o GET aceita `entityType` e `entityId`. Se não aceitar, adicionar:

```typescript
const entityType = req.query.entityType as string | undefined;
const entityId = req.query.entityId as string | undefined;

const where: any = { ...scopeWhere };
if (entityType) where.entityType = entityType;
if (entityId) where.entityId = entityId;
```

- [ ] **Step 3: Renderizar timeline no modal de oportunidade**

No JSX do modal de detalhe da oportunidade, adicionar secção de histórico:

```tsx
{history.length > 0 && (
  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Histórico de alterações</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map((h: any) => {
        const changes = h.metadata?.changes || {};
        const FIELD_LABELS: Record<string, string> = {
          stage: 'Etapa', value: 'Valor', assignedToId: 'Responsável', title: 'Título',
        };
        return (
          <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {new Date(h.createdAt).toLocaleString('pt-PT')}
              </div>
              {Object.entries(changes).map(([field, change]: [string, any]) => (
                <div key={field} style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                  <strong>{FIELD_LABELS[field] || field}</strong>: {String(change.from ?? '—')} → {String(change.to ?? '—')}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/kanban/KanbanBoard.tsx backend/src/modules/activity/
git commit -m "feat(opportunities): show change history timeline in opportunity modal"
```

---

### Task 3: Notificação de tarefa em atraso — Cron job

**Files:**
- Create: `backend/src/lib/overdue-tasks-cron.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Criar o cron job**

Criar `backend/src/lib/overdue-tasks-cron.ts`:

```typescript
import cron from 'node-cron';
import prisma from '../config/database';
import nodemailer from 'nodemailer';

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const startOverdueTasksCron = () => {
  // Corre todos os dias às 08:00 hora de Lisboa
  cron.schedule('0 8 * * *', async () => {
    console.log('[overdue-tasks] A verificar tarefas em atraso…');
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const overdueTasks = await prisma.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: today },
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          contact: { select: { name: true } },
        },
      });

      // Group by assignee
      const byUser: Record<string, typeof overdueTasks> = {};
      for (const task of overdueTasks) {
        if (!task.assignedTo?.email) continue;
        const key = task.assignedTo.email;
        if (!byUser[key]) byUser[key] = [];
        byUser[key].push(task);
      }

      const transporter = getTransporter();

      for (const [email, tasks] of Object.entries(byUser)) {
        const user = tasks[0].assignedTo!;
        const taskRows = tasks.map(t => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.contact?.name || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#dc2626">
              ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-PT') : '—'}
            </td>
          </tr>
        `).join('');

        await transporter.sendMail({
          from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL}>`,
          to: email,
          subject: `⚠️ Tens ${tasks.length} tarefa(s) em atraso — CasaFlow`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#0f2553">Tarefas em atraso</h2>
              <p>Olá ${user.name},</p>
              <p>Tens <strong>${tasks.length} tarefa(s)</strong> com prazo ultrapassado:</p>
              <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px">
                <thead>
                  <tr style="background:#f8f9fc">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Tarefa</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Contacto</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7a99;text-transform:uppercase">Prazo</th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
              <p style="margin-top:20px">
                <a href="${process.env.CLIENT_URL}/tasks" style="display:inline-block;padding:10px 22px;background:#0f2553;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                  Ver tarefas
                </a>
              </p>
              <p style="color:#888;font-size:12px">CasaFlow CRM</p>
            </div>
          `,
        });

        console.log(`[overdue-tasks] Email enviado para ${email} (${tasks.length} tarefas)`);
      }
    } catch (err) {
      console.error('[overdue-tasks] Erro:', err);
    }
  }, { timezone: 'Europe/Lisbon' });

  console.log('[overdue-tasks] Cron agendado para 08:00 diariamente');
};
```

- [ ] **Step 2: Registar o cron no servidor**

Em `backend/src/server.ts`, após as importações existentes de crons, adicionar:

```typescript
import { startOverdueTasksCron } from './lib/overdue-tasks-cron';
```

E no bloco de inicialização dos background services (onde estão os outros crons), adicionar:

```typescript
startOverdueTasksCron();
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/overdue-tasks-cron.ts backend/src/server.ts
git commit -m "feat(tasks): daily cron job to email overdue task notifications"
```

---

### Task 4: Frontend — Indicador visual de tarefa em atraso

**Files:**
- Modify: `frontend/src/pages/TasksPage.tsx`

- [ ] **Step 1: Adicionar badge "em atraso" nas tarefas**

Em `TasksPage.tsx`, na renderização de cada task, adicionar lógica para detectar atraso:

```tsx
const isOverdue = (task: any) => {
  if (!task.dueDate) return false;
  if (['COMPLETED', 'CANCELLED'].includes(task.status)) return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
};
```

Na linha/card da task, adicionar badge condicional:
```tsx
{isOverdue(task) && (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
    background: '#fee2e2', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em',
  }}>
    Em atraso
  </span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/TasksPage.tsx
git commit -m "feat(tasks): show overdue badge on tasks past due date"
```

---
