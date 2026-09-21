# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CasaFlow CRM fully operational on mobile devices with bottom navigation, responsive page layouts, and proper touch UX.

**Architecture:** Add a `useIsMobile` hook (768px breakpoint) shared across components. New `BottomNav` component renders on mobile replacing the sidebar. Each key page gets a mobile-specific card/list layout that conditionally replaces the desktop table when `isMobile` is true. No global refactor — surgical per-file changes.

**Tech Stack:** React 18, TypeScript, Framer Motion (already installed), Lucide React icons, inline styles (project convention — no Tailwind utility classes in logic code, only className for existing `lg:hidden` etc.)

---

### Task 1: useIsMobile hook

**Files:**
- Create: `frontend/src/hooks/useIsMobile.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useIsMobile.ts
git commit -m "feat(mobile): add useIsMobile hook"
```

---

### Task 2: BottomNav component

**Files:**
- Create: `frontend/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Create BottomNav**

```typescript
// frontend/src/components/layout/BottomNav.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Kanban, CheckSquare, CalendarClock } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts',  icon: Users,           label: 'Contactos' },
  { to: '/pipeline',  icon: Kanban,          label: 'Pipeline' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tarefas' },
  { to: '/calendar',  icon: CalendarClock,   label: 'Calendário' },
]

export const BottomNav: React.FC = () => (
  <nav
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      height: `calc(56px + env(safe-area-inset-bottom))`,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--sidebar-bg)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'stretch',
    }}
  >
    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        style={{ textDecoration: 'none', flex: 1 }}
      >
        {({ isActive }) => (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? 'var(--accent)' : 'rgba(200,211,232,0.5)',
              transition: 'color 150ms',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, fontFamily: 'var(--font-body)', lineHeight: 1 }}>
              {label}
            </span>
          </div>
        )}
      </NavLink>
    ))}
  </nav>
)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/BottomNav.tsx
git commit -m "feat(mobile): add BottomNav component"
```

---

### Task 3: AppShell — wire BottomNav + bottom padding

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Open AppShell.tsx and update it**

Replace the entire file content with:

```typescript
import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Toast } from '../ui/Toast'
import { SoftPhone } from '../calls/SoftPhone'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { ErrorBoundary } from './ErrorBoundary'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import { GlobalSearch } from './GlobalSearch'
import { ImpersonationBanner } from './ImpersonationBanner'
import { useIsMobile } from '../../hooks/useIsMobile'

export const AppShell: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { user, setAuth, token, impersonating } = useAuthStore()
  const showOnboarding = user?.onboardingCompleted === false
  const isMobile = useIsMobile()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <ImpersonationBanner />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible */}
      <div className="hidden lg:flex flex-shrink-0" style={{ height: '100vh' }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className="fixed inset-y-0 left-0 z-30 lg:hidden"
        style={{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
          width: 240,
        }}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          className={`flex-1 overflow-y-auto${impersonating ? ' pt-10' : ''}`}
          style={{
            padding: 'clamp(12px, 4vw, 28px)',
            paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 12px)' : 'clamp(12px, 4vw, 28px)',
          }}
        >
          <ErrorBoundary inline>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNav />}

      <Toast />
      <SoftPhone />
      <GlobalSearch />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          if (user && token) setAuth({ ...user, onboardingCompleted: true }, token)
        }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(mobile): wire BottomNav in AppShell with safe-area padding"
```

---

### Task 4: TopBar — hide dark mode toggle on mobile

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Wrap dark mode toggle with mobile check**

Find this block in TopBar.tsx (around line 153):
```tsx
{/* Dark mode toggle */}
<TopBarIconBtn
  title={darkMode ? 'Modo claro' : 'Modo escuro'}
  onClick={toggleDarkMode}
>
  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
</TopBarIconBtn>
```

Replace it with:
```tsx
{/* Dark mode toggle — hidden on mobile */}
<span className="hidden sm:contents">
  <TopBarIconBtn
    title={darkMode ? 'Modo claro' : 'Modo escuro'}
    onClick={toggleDarkMode}
  >
    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
  </TopBarIconBtn>
</span>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.tsx
git commit -m "feat(mobile): hide dark mode toggle on mobile TopBar"
```

---

### Task 5: Button — min touch target on mobile

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`

- [ ] **Step 1: Update sizeStyles to have minHeight 44px on sm size for mobile**

In `Button.tsx`, replace the `sizeStyles` object:

```typescript
const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12, height: 32, minHeight: 32 },
  md: { padding: '0 16px', fontSize: 13, height: 40, minHeight: 40 },
  lg: { padding: '0 24px', fontSize: 14, height: 44, minHeight: 44 },
}
```

Then add a media-query-aware wrapper. Since this codebase uses inline styles, we handle this by adding a className and a global CSS rule. Add to `frontend/src/index.css` (or `App.css`) instead — see Task 6.

For now just ensure `lg` size has `minHeight: 44`. No file change needed beyond confirming existing `lg` height is 44 — it already is. Skip to Step 2.

- [ ] **Step 2: Add global mobile touch target CSS**

Open `frontend/src/index.css` (or `frontend/src/App.css`, whichever is the global stylesheet loaded in `main.tsx`).

Check which file is imported in `main.tsx`:

```bash
grep -n "import.*css" frontend/src/main.tsx
```

Append to that CSS file:

```css
/* ── Mobile UX globals ─────────────────────────────── */
@media (max-width: 767px) {
  /* Prevent iOS auto-zoom on input focus */
  input, select, textarea {
    font-size: 16px !important;
  }

  /* Minimum touch targets */
  button {
    min-height: 44px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/App.css
git commit -m "feat(mobile): global touch target and iOS zoom prevention CSS"
```

---

### Task 6: DashboardPage — 2-column KPI grid on mobile

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add useIsMobile import and hook usage**

At the top of `DashboardPage.tsx`, add the import:
```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `DashboardPage` component, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Find the KPI grid container and make it 2-col on mobile**

In `DashboardPage.tsx`, find the grid that renders KPI cards. It will look like a `div` with `gridTemplateColumns` or similar. Search for `KpiCard` usages — they're rendered in a grid. The grid container has a style like:
```tsx
style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
```

Replace the `gridTemplateColumns` value with:
```tsx
gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
```

- [ ] **Step 3: Hide sparklines on mobile**

In the `KpiCard` component (inside DashboardPage.tsx), find where `Sparkline` is rendered:
```tsx
{sparkData && sparkData.length > 1 && sparkColor && (
  <Sparkline data={sparkData} color={sparkColor} />
)}
```

Wrap it so it only renders on desktop. Since `KpiCard` doesn't have `isMobile` in scope, pass it as a prop. Add `hideSpark?: boolean` to `KpiCardProps`:

```typescript
interface KpiCardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  sparkData?: number[]
  sparkColor?: string
  hideSpark?: boolean
}
```

Update the Sparkline render:
```tsx
{!hideSpark && sparkData && sparkData.length > 1 && sparkColor && (
  <Sparkline data={sparkData} color={sparkColor} />
)}
```

Pass `hideSpark={isMobile}` to every `<KpiCard` usage in `DashboardPage`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat(mobile): dashboard 2-col KPI grid and hide sparklines on mobile"
```

---

### Task 7: ContactsPage — card layout on mobile

**Files:**
- Modify: `frontend/src/pages/ContactsPage.tsx`

- [ ] **Step 1: Add useIsMobile import**

```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `ContactsPage`, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Add mobile contact card component inside ContactsPage.tsx**

After the existing `Pill` component, add:

```tsx
const ContactCard: React.FC<{
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}> = ({ contact, onEdit, onDelete, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = getInitials(contact.name)
  const color = avatarColor(contact.name)
  const status = STATUS_STYLE[contact.status] || STATUS_STYLE.NEW
  const type = TYPE_STYLE[contact.type || '']

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 14,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name}
          </span>
          <Pill bg={status.bg} color={status.color} label={status.label} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.email || contact.phone || '—'}
        </div>
        {type && (
          <div style={{ marginTop: 4 }}>
            <Pill bg={type.bg} color={type.color} label={type.label} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--surface-3)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 140,
          }}>
            <button
              onClick={() => { setMenuOpen(false); onEdit() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Edit size={13} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

Also add `MoreHorizontal` to the lucide imports at the top:
```typescript
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit, Download, X, Upload, Mail, Phone as PhoneIcon, MoreHorizontal } from 'lucide-react'
```

- [ ] **Step 3: Replace table rendering with conditional**

Find the section in the JSX that renders the `<table>` (search for `<table`). It's wrapped in a scroll container. Replace the entire table section with:

```tsx
{isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {contacts.map(contact => (
      <ContactCard
        key={contact.id}
        contact={contact}
        onClick={() => navigate(`/contacts/${contact.id}`)}
        onEdit={() => { setEditContact(contact); setShowModal(true) }}
        onDelete={() => setDeleteId(contact.id)}
      />
    ))}
  </div>
) : (
  // existing table JSX here — keep exactly as is
  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
      {/* ... existing thead and tbody ... */}
    </table>
  </div>
)}
```

(Keep the existing table JSX inside the else branch — do not remove it, just wrap it.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ContactsPage.tsx
git commit -m "feat(mobile): contacts card layout on mobile"
```

---

### Task 8: TasksPage — card layout on mobile

**Files:**
- Modify: `frontend/src/pages/TasksPage.tsx`

- [ ] **Step 1: Add useIsMobile import**

```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `TasksPage`, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Add mobile task card component inside TasksPage.tsx**

After the `Pill` component, add:

```tsx
const TaskCard: React.FC<{
  task: Task
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
}> = ({ task, onComplete, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const overdue = isOverdue(task)
  const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.MEDIUM
  const status = STATUS_STYLE[task.status] || STATUS_STYLE.PENDING

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${overdue && task.status === 'PENDING' ? 'rgba(220,38,38,0.3)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <button
        onClick={onComplete}
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          border: `2px solid ${task.status === 'COMPLETED' ? 'var(--success)' : 'var(--border)'}`,
          background: task.status === 'COMPLETED' ? 'var(--success)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.status === 'COMPLETED' && <CheckCircle size={14} color="#fff" />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: task.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--text-primary)',
          margin: 0, textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.title}
        </p>
        {task.contact && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{task.contact.name}</p>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <Pill bg={priority.bg} color={priority.color} label={TASK_PRIORITY_LABELS[task.priority] || task.priority} />
          {task.dueDate && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: overdue ? 'rgba(220,38,38,0.08)' : 'var(--surface-3)',
              color: overdue ? 'var(--danger)' : 'var(--text-muted)',
            }}>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--surface-3)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'fixed', right: 16, zIndex: 100,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 140,
          }}>
            <button
              onClick={() => { setMenuOpen(false); onEdit() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Edit size={13} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

Add missing imports to TasksPage.tsx:
```typescript
import { MoreHorizontal } from 'lucide-react'
```

- [ ] **Step 3: Find the table in TasksPage JSX and wrap with conditional**

Find the table rendering (search for `<table` in the file). Replace with:

```tsx
{isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {tasks.map(task => (
      <TaskCard
        key={task.id}
        task={task}
        onComplete={() => {
          if (task.status !== 'COMPLETED') {
            updateTask(task.id, { status: 'COMPLETED' }).then(() => {
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' } : t))
              showToast('Tarefa concluída', 'success')
            }).catch(() => showToast('Erro ao atualizar', 'error'))
          }
        }}
        onEdit={() => { setEditTask(task); setShowForm(true) }}
        onDelete={() => { deleteTask(task.id).then(() => { setTasks(prev => prev.filter(t => t.id !== task.id)); showToast('Tarefa eliminada', 'success') }).catch(() => showToast('Erro ao eliminar', 'error')) }}
      />
    ))}
  </div>
) : (
  // keep existing table JSX here unchanged
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      {/* existing table ... */}
    </table>
  </div>
)}
```

Note: Check the TasksPage state variable name for the edit task state — it may be `setEditTask` or `setSelectedTask`. Match whatever name is already used in the file.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TasksPage.tsx
git commit -m "feat(mobile): tasks card layout with quick-complete on mobile"
```

---

### Task 9: PropertiesPage — card layout on mobile

**Files:**
- Modify: `frontend/src/pages/PropertiesPage.tsx`

- [ ] **Step 1: Add useIsMobile import**

```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside the main `PropertiesPage` component, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Add mobile property card component inside PropertiesPage.tsx**

After the existing imports/constants but before `PropertyForm`, add:

```tsx
const PropertyCard: React.FC<{
  property: Property
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}> = ({ property, onEdit, onDelete, onClick }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Building2 size={20} style={{ color: 'var(--accent)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {property.title}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {property.address}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {property.price ? formatCurrency(property.price) : '—'}
          </span>
          <Badge variant={statusVariant[property.status] || 'default'} size="sm">
            {PROPERTY_STATUS_LABELS[property.status] || property.status}
          </Badge>
        </div>
      </div>

      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--surface-3)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 140,
          }}>
            <button
              onClick={() => { setMenuOpen(false); onEdit() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Edit size={13} /> Editar
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

Add `MoreHorizontal` to lucide imports:
```typescript
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Building2, MoreHorizontal } from 'lucide-react'
```

- [ ] **Step 3: Find the table in PropertiesPage JSX and wrap with conditional**

Find the `<table` element in the JSX. Wrap the table section with:

```tsx
{isMobile ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {properties.map(property => (
      <PropertyCard
        key={property.id}
        property={property}
        onClick={() => navigate(`/properties/${property.id}`)}
        onEdit={() => { setEditProperty(property); setShowModal(true) }}
        onDelete={() => handleDelete(property.id)}
      />
    ))}
  </div>
) : (
  // existing table JSX here unchanged
  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
      {/* existing ... */}
    </table>
  </div>
)}
```

Note: Check the PropertiesPage for the `navigate` import and the state variable name for the edit property (`setEditProperty` or `setSelectedProperty`). Match whatever exists in the file. Add `useNavigate` import if not already present.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PropertiesPage.tsx
git commit -m "feat(mobile): properties card layout on mobile"
```

---

### Task 10: Pipeline — mobile list view in KanbanBoard

**Files:**
- Modify: `frontend/src/components/kanban/KanbanBoard.tsx`

- [ ] **Step 1: Add useIsMobile import**

```typescript
import { useIsMobile } from '../../hooks/useIsMobile'
```

Inside `KanbanBoard`, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Track active mobile stage**

Inside the `KanbanBoard` component, add state for the active mobile stage:
```typescript
const [mobileStage, setMobileStage] = useState<string>('')

// Set mobileStage to first available stage when stages load
useEffect(() => {
  if (!mobileStage && stages.length > 0) {
    setMobileStage(stages[0].key)
  }
}, [stages, mobileStage])
```

(Use whatever variable holds the list of stages in KanbanBoard — it may be `stages`, `pipelineStages`, or derived from `STAGE_ORDER`. Find the correct variable name in the file.)

- [ ] **Step 3: Add mobile pipeline view JSX**

Find where `KanbanBoard` returns its JSX. The outer container renders columns in a flex row. Add a conditional before the main return:

```tsx
if (isMobile) {
  const mobileOpps = opportunities[mobileStage] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Stage tabs */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {stages.map(stage => (
          <button
            key={stage.key}
            onClick={() => setMobileStage(stage.key)}
            style={{
              padding: '10px 16px',
              fontSize: 13, fontWeight: mobileStage === stage.key ? 700 : 400,
              color: mobileStage === stage.key ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: mobileStage === stage.key ? '2px solid var(--accent)' : '2px solid transparent',
              whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
              transition: 'color 150ms',
            }}
          >
            {stage.label}
            {(opportunities[stage.key] || []).length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                padding: '1px 6px', borderRadius: 20,
                background: mobileStage === stage.key ? 'var(--accent-soft)' : 'var(--surface-3)',
                color: mobileStage === stage.key ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {(opportunities[stage.key] || []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Opportunity list for current stage */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mobileOpps.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Sem oportunidades nesta fase
          </div>
        ) : mobileOpps.map(opp => (
          <div
            key={opp.id}
            onClick={() => onCardClick(opp)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{opp.title}</p>
            {opp.contact && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{opp.contact.name}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              {opp.value && (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {formatCurrency(opp.value)}
                </span>
              )}
              {opp.expectedCloseDate && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(opp.expectedCloseDate)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => onAddClick(mobileStage)}
        style={{
          position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)', right: 16,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 30,
          boxShadow: '0 4px 16px rgba(46,107,230,0.4)',
        }}
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
```

Note: Adapt the variable names (`stages`, `opportunities`, `onCardClick`, `onAddClick`, `formatDate`, `formatCurrency`) to match what's actually in `KanbanBoard.tsx`. Look at how the existing Kanban columns are rendered to find the correct names.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/kanban/KanbanBoard.tsx
git commit -m "feat(mobile): pipeline mobile list view with stage tabs and FAB"
```

---

### Task 11: CalendarPage — touch targets and FAB

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Add useIsMobile import**

```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `CalendarPage`, add:
```typescript
const isMobile = useIsMobile()
```

- [ ] **Step 2: Find toolbar buttons and ensure min touch target**

Find the "Nova tarefa" and "Novo evento" buttons in the CalendarPage JSX. They are likely in a toolbar at the top. On mobile, replace them with a single FAB:

Find the toolbar section (probably has `display: 'flex'` and contains `<Button` elements). Wrap/replace with:

```tsx
{/* Toolbar actions */}
{isMobile ? (
  <button
    onClick={() => setShowTaskForm(true)}
    style={{
      position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)', right: 16,
      width: 52, height: 52, borderRadius: '50%',
      background: 'var(--accent)', color: '#fff', border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', zIndex: 30,
      boxShadow: '0 4px 16px rgba(46,107,230,0.4)',
    }}
  >
    <Plus size={22} />
  </button>
) : (
  // existing buttons — keep them here unchanged
  <>
    <Button onClick={() => setShowTaskForm(true)}>Nova tarefa</Button>
    <Button onClick={() => setShowEventForm(true)}>Novo evento</Button>
  </>
)}
```

Note: Match the actual state variable names used in CalendarPage for showing the task/event forms.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CalendarPage.tsx
git commit -m "feat(mobile): calendar FAB on mobile and touch target improvements"
```

---

### Task 12: Modal — verify bottom sheet already works

**Files:**
- Read: `frontend/src/components/ui/Modal.tsx` (already done — already implemented)

- [ ] **Step 1: Verify Modal.tsx already has mobile bottom sheet**

The existing `Modal.tsx` already has:
- `useIsMobile` hook (local, breakpoint 640px)
- `alignItems: isMobile ? 'flex-end' : 'center'`
- `borderRadius: isMobile ? '16px 16px 0 0' : 16`
- Slide-up animation
- Drag handle

No changes needed to `Modal.tsx` — it already implements the spec.

- [ ] **Step 2: Verify Select.tsx trigger button has sufficient height**

In `Select.tsx`, the trigger button has `padding: '9px 12px'` which gives approximately 38px height — slightly below 44px. The global CSS rule added in Task 5 (`button { min-height: 44px }`) covers this. No additional change needed.

- [ ] **Step 3: Verify Input.tsx font-size**

`Input.tsx` has `fontSize: 13` on the input element. The global CSS from Task 5 sets `font-size: 16px !important` on mobile for all inputs. No additional change to `Input.tsx` needed.

- [ ] **Step 4: Commit noting no changes were needed**

```bash
git commit --allow-empty -m "chore(mobile): verified Modal, Select, Input already mobile-ready"
```

---

### Task 13: Final check and push

- [ ] **Step 1: Run the frontend build to catch any TypeScript errors**

```bash
cd frontend && npm run build
```

Expected: Build completes with no errors. If there are TypeScript errors, fix them (likely missing imports or wrong prop names).

- [ ] **Step 2: Start dev server and manually verify on mobile viewport**

```bash
cd frontend && npm run dev
```

Open browser DevTools → Toggle device toolbar → Set to iPhone 14 (390×844). Check:
- Bottom nav appears with 5 items
- Navigating between tabs works
- Contacts page shows cards (not table)
- Tasks page shows cards with complete button
- Properties page shows cards
- Dashboard shows 2×2 KPI grid
- Pipeline shows stage tabs + list

- [ ] **Step 3: Push to remote**

```bash
git push
```

---

## Summary of Files Created/Modified

| File | Action |
|------|--------|
| `frontend/src/hooks/useIsMobile.ts` | Created |
| `frontend/src/components/layout/BottomNav.tsx` | Created |
| `frontend/src/components/layout/AppShell.tsx` | Modified |
| `frontend/src/components/layout/TopBar.tsx` | Modified |
| `frontend/src/index.css` (or App.css) | Modified |
| `frontend/src/pages/DashboardPage.tsx` | Modified |
| `frontend/src/pages/ContactsPage.tsx` | Modified |
| `frontend/src/pages/TasksPage.tsx` | Modified |
| `frontend/src/pages/PropertiesPage.tsx` | Modified |
| `frontend/src/pages/CalendarPage.tsx` | Modified |
| `frontend/src/components/kanban/KanbanBoard.tsx` | Modified |
