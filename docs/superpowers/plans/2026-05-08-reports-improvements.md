# Reports Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar filtros por período nos relatórios, KPI de imóveis por estado no dashboard, e export PDF dos relatórios.

**Architecture:** Filtros via query params no frontend → backend aceita `from/to` em ISO string. KPI de imóveis novo endpoint ou extensão do summary. Export PDF via jsPDF (já instalado) + html2canvas na ReportsPage.

**Tech Stack:** jsPDF, html2canvas (ambos já em package.json), Recharts (já usado), React, Express, Prisma.

---

### Task 1: Backend — Filtros por período nos relatórios

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/reports/reports.controller.ts`

- [ ] **Step 1: Adicionar filtros de data ao getSummary**

Em `reports.service.ts`, modificar a assinatura de `getSummary` para aceitar filtros opcionais:

```typescript
export const getSummary = async (
  user: any,
  filters?: { from?: Date; to?: Date; assignedToId?: string }
) => {
```

Na construção do `contactWhere` e `oppWhere`, adicionar o filtro de data:

```typescript
const dateFilter = filters?.from || filters?.to
  ? { createdAt: { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: filters.to }) } }
  : {};

const agentFilter = filters?.assignedToId
  ? { assignedToId: filters.assignedToId }
  : {};

const contactWhere = { ...(await buildContactWhere(user)), ...dateFilter, ...agentFilter };
const oppWhere = { ...(await buildOpportunityWhere(user)), ...dateFilter, ...agentFilter };
```

Aplicar o mesmo filtro a todas as queries internas que usam `contactWhere` e `oppWhere`.

- [ ] **Step 2: Adicionar KPI de imóveis ao getSummary**

No mesmo `getSummary`, adicionar ao `Promise.all`:

```typescript
prisma.property.groupBy({
  by: ['status'],
  where: user.agencyId ? { createdBy: { agencyId: user.agencyId } } : { createdById: user.id },
  _count: { _all: true },
}),
```

No return, adicionar:
```typescript
propertiesByStatus: propertiesByStatusResult.reduce((acc: any, r: any) => {
  acc[r.status] = r._count._all;
  return acc;
}, {}),
```

- [ ] **Step 3: Passar filtros no controller**

Em `reports.controller.ts`, na action `getSummary`:

```typescript
const from = req.query.from ? new Date(req.query.from as string) : undefined;
const to = req.query.to ? new Date(req.query.to as string) : undefined;
const assignedToId = req.query.assignedToId as string | undefined;
const data = await reportsService.getSummary(user, { from, to, assignedToId });
res.json(data);
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/reports/
git commit -m "feat(reports): add date range and consultant filters to summary endpoint"
```

---

### Task 2: Backend — Pipeline report com filtros

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`

- [ ] **Step 1: Adicionar filtros à função getPipeline**

Em `reports.service.ts`, encontrar `getPipeline` (ou equivalente que retorna dados por etapa) e adicionar os mesmos filtros de data e consultor:

```typescript
export const getPipeline = async (
  user: any,
  filters?: { from?: Date; to?: Date; assignedToId?: string }
) => {
  const baseWhere = await buildOpportunityWhere(user);
  const dateFilter = filters?.from || filters?.to
    ? { createdAt: { ...(filters.from && { gte: filters.from }), ...(filters.to && { lte: filters.to }) } }
    : {};
  const agentFilter = filters?.assignedToId ? { assignedToId: filters.assignedToId } : {};
  const where = { ...baseWhere, ...dateFilter, ...agentFilter };
  // ... resto da lógica existente mas com where filtrado
```

No controller, passar os mesmos query params a getPipeline.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/reports/
git commit -m "feat(reports): add date range filter to pipeline report"
```

---

### Task 3: Frontend — Seletor de período nos relatórios

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`
- Modify: `frontend/src/api/reports.api.ts`

- [ ] **Step 1: Adicionar parâmetros às funções de API**

Em `reports.api.ts`, modificar as funções para aceitar filtros:

```typescript
export const getReportSummary = async (params?: {
  from?: string; to?: string; assignedToId?: string
}): Promise<ReportSummary> => {
  const { data } = await api.get('/reports/summary', { params })
  return data
}

export const getReportPipeline = async (params?: {
  from?: string; to?: string; assignedToId?: string
}): Promise<PipelineStage[]> => {
  const { data } = await api.get('/reports/pipeline', { params })
  return data
}
```

- [ ] **Step 2: Adicionar UI de filtros na ReportsPage**

Em `ReportsPage.tsx`, adicionar estado para filtros:

```tsx
const [from, setFrom] = useState('')
const [to, setTo] = useState('')
const [consultorId, setConsultorId] = useState('')
const [users, setUsers] = useState<any[]>([])
```

No `useEffect` de load, buscar users se for manager:
```tsx
useEffect(() => {
  if (['AGENCY_OWNER','AGENCY_ADMIN','TEAM_LEADER'].includes(user?.role || '')) {
    getUsers().then(setUsers).catch(() => {})
  }
}, [])
```

Adicionar barra de filtros antes dos widgets:
```tsx
<div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
  <div>
    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>De</label>
    <input type="date" value={from} onChange={e => setFrom(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' }} />
  </div>
  <div>
    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Até</label>
    <input type="date" value={to} onChange={e => setTo(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' }} />
  </div>
  {users.length > 0 && (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Consultor</label>
      <select value={consultorId} onChange={e => setConsultorId(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' }}>
        <option value="">Todos</option>
        {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </div>
  )}
  <button onClick={loadData}
    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
    Aplicar filtros
  </button>
  <button onClick={() => { setFrom(''); setTo(''); setConsultorId(''); setTimeout(loadData, 0) }}
    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
    Limpar
  </button>
</div>
```

Passar filtros nas chamadas à API:
```tsx
const params = {
  ...(from && { from }),
  ...(to && { to }),
  ...(consultorId && { assignedToId: consultorId }),
}
const [summary, pipeline] = await Promise.all([
  getReportSummary(params),
  getReportPipeline(params),
  // ...resto
])
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx frontend/src/api/reports.api.ts
git commit -m "feat(reports): add date range and consultant filter UI"
```

---

### Task 4: Frontend — KPI imóveis por estado no Dashboard e Reports

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/ReportsPage.tsx`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Adicionar propertiesByStatus ao tipo ReportSummary**

Em `frontend/src/types/index.ts`, encontrar `ReportSummary` e adicionar:
```typescript
propertiesByStatus?: Record<string, number>;
```

- [ ] **Step 2: Widget de imóveis por estado na ReportsPage**

Em `ReportsPage.tsx`, após os widgets existentes, adicionar secção de imóveis:

```tsx
{summary?.propertiesByStatus && (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Imóveis por Estado</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {[
        { key: 'AVAILABLE', label: 'Disponível', color: '#16a34a', bg: '#dcfce7' },
        { key: 'RESERVED', label: 'Reservado', color: '#d97706', bg: '#fef3c7' },
        { key: 'SOLD', label: 'Vendido', color: '#2563eb', bg: '#dbeafe' },
        { key: 'RENTED', label: 'Arrendado', color: '#7c3aed', bg: '#ede9fe' },
        { key: 'IN_PROCESS', label: 'Em processo', color: '#6b7280', bg: '#f3f4f6' },
      ].map(({ key, label, color, bg }) => (
        <div key={key} style={{ background: bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{summary.propertiesByStatus?.[key] ?? 0}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Adicionar card de imóveis no DashboardPage**

Em `DashboardPage.tsx`, no bloco de KPI cards (onde estão totalContacts, openOpportunities, etc.), adicionar:

```tsx
// Após os cards existentes:
{summary?.propertiesByStatus && (
  <div style={{ /* mesmo estilo dos outros KPI cards */ }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Imóveis disponíveis</div>
    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>
      {summary.propertiesByStatus?.AVAILABLE ?? 0}
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
      {(summary.propertiesByStatus?.RESERVED ?? 0)} reservados · {(summary.propertiesByStatus?.SOLD ?? 0)} vendidos
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/ReportsPage.tsx frontend/src/types/index.ts
git commit -m "feat(reports): add properties by status KPI to dashboard and reports"
```

---

### Task 5: Frontend — Export PDF dos relatórios

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Adicionar função de export PDF**

Em `ReportsPage.tsx`, adicionar import e função:

```tsx
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const reportRef = useRef<HTMLDivElement>(null)

const handleExportPDF = async () => {
  if (!reportRef.current) return
  try {
    showToast('A gerar PDF…', 'info')
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let y = 10
    pdf.addImage(imgData, 'PNG', 10, y, imgWidth, Math.min(imgHeight, pageHeight - 20))
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-')
    pdf.save(`relatorio-casaflow-${dateStr}.pdf`)
    showToast('PDF exportado com sucesso.', 'success')
  } catch {
    showToast('Erro ao gerar PDF.', 'error')
  }
}
```

- [ ] **Step 2: Adicionar botão de export e ref ao container**

No JSX da ReportsPage, adicionar `ref={reportRef}` ao div principal dos relatórios:
```tsx
<div ref={reportRef}>
  {/* ... conteúdo dos relatórios ... */}
</div>
```

Junto ao botão de export CSV existente, adicionar:
```tsx
<Button onClick={handleExportPDF} variant="outline">
  <Download size={15} style={{ marginRight: 6 }} />
  Exportar PDF
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat(reports): add PDF export button using jsPDF + html2canvas"
```

---
