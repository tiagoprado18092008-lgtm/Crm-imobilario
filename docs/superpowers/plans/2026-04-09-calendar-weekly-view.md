# Calendar Weekly View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic monthly calendar grid in AppointmentsPage with a Google Calendar-style weekly view that shows appointments as time-positioned blocks, plus a responsible-person filter.

**Architecture:** All changes are front-end only in `AppointmentsPage.tsx`. The weekly view renders a 07:00–22:00 time grid with 7 day columns; appointments are absolutely-positioned blocks whose top/height are calculated from startAt/endAt. A responsible filter chips component filters the appointments array client-side using the `assignedTo.id` already returned by the API.

**Tech Stack:** React, TypeScript, inline styles (existing pattern in codebase), lucide-react icons

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/pages/AppointmentsPage.tsx` | Add week view, responsible filter, enhance month view |

No backend changes needed — `assignedTo: { id, name, avatarUrl }` is already in the API response.

---

### Task 1: Add week navigation state and helper functions

**Files:**
- Modify: `frontend/src/pages/AppointmentsPage.tsx`

- [ ] **Step 1: Add week view state and view toggle**

In `AppointmentsPage.tsx`, add `'week'` to the view toggle. Find the existing state:
```tsx
const [view, setView] = useState<'list' | 'calendar'>('list')
```
Replace with:
```tsx
const [view, setView] = useState<'list' | 'calendar' | 'week'>('list')
```

- [ ] **Step 2: Add week navigation state**

After the existing `const [calYear, setCalYear] = useState(today.getFullYear())` line, add:
```tsx
// Week view — anchor to start-of-week (Sunday) of today
const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}
const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today))

const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
const goToThisWeek = () => setWeekStart(getWeekStart(today))

// Returns array of 7 Date objects for the current week
const getWeekDays = (start: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

const weekDays = getWeekDays(weekStart)
```

- [ ] **Step 3: Add responsible filter state**

After the existing `const [filter, setFilter] = useState('ALL')` line, add:
```tsx
const [responsibleFilter, setResponsibleFilter] = useState<string>('ALL')
```

- [ ] **Step 4: Derive unique responsible users from appointments**

After the `const filtered = ...` line, add:
```tsx
// Unique responsible users across all appointments
const responsibleUsers: { id: string; name: string }[] = []
const seenIds = new Set<string>()
for (const a of appointments) {
  if (a.assignedTo && !seenIds.has(a.assignedTo.id)) {
    seenIds.add(a.assignedTo.id)
    responsibleUsers.push({ id: a.assignedTo.id, name: a.assignedTo.name })
  }
}

// Apply responsible filter on top of status filter
const visibleAppointments = responsibleFilter === 'ALL'
  ? filtered
  : filtered.filter(a => a.assignedTo?.id === responsibleFilter)
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/AppointmentsPage.tsx
git commit -m "feat: add week view state, week navigation helpers, responsible filter state"
```

---

### Task 2: Update toolbar — add Week button and responsible chips

**Files:**
- Modify: `frontend/src/pages/AppointmentsPage.tsx`

- [ ] **Step 1: Add Week to the view toggle buttons**

Find the view toggle map `(['list', 'calendar'] as const).map(...)` and replace with:
```tsx
{(['list', 'week', 'calendar'] as const).map(v => (
  <button
    key={v}
    onClick={() => setView(v)}
    style={{
      padding: '6px 16px', fontSize: 13, fontWeight: 500,
      background: view === v ? '#6366f1' : 'var(--bg-card)',
      color: view === v ? '#fff' : 'var(--text-secondary)',
      border: 'none', cursor: 'pointer', transition: 'background 150ms',
    }}
    onMouseEnter={e => { if (view !== v) e.currentTarget.style.background = 'var(--hover-bg)' }}
    onMouseLeave={e => { if (view !== v) e.currentTarget.style.background = 'var(--bg-card)' }}
  >
    {v === 'list' ? 'Lista' : v === 'week' ? 'Semana' : 'Mês'}
  </button>
))}
```

- [ ] **Step 2: Add responsible filter chips below the toolbar**

After the closing `</div>` of the toolbar `div` (the one wrapping all toolbar elements), add a new row:
```tsx
{/* Responsible filter chips */}
{responsibleUsers.length > 1 && (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Responsável:
    </span>
    {[{ id: 'ALL', name: 'Todos' }, ...responsibleUsers].map(u => (
      <button
        key={u.id}
        onClick={() => setResponsibleFilter(u.id)}
        style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          border: 'none', cursor: 'pointer', transition: 'all 150ms',
          background: responsibleFilter === u.id ? '#6366f1' : 'var(--hover-bg)',
          color: responsibleFilter === u.id ? '#fff' : 'var(--text-secondary)',
        }}
      >
        {u.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 3: Update all view renders to use `visibleAppointments` instead of `filtered`**

In the list view, find `filtered.map(a => {` and replace `filtered` with `visibleAppointments`.
Also update `filtered.length === 0` check to `visibleAppointments.length === 0`.

In the calendar (month) view, update `getApptsForDay` calls — change `appointments.filter(...)` to filter from `visibleAppointments`:
```tsx
const getApptsForDay = (day: Date) =>
  visibleAppointments.filter(a => new Date(a.startAt).toDateString() === day.toDateString())
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/AppointmentsPage.tsx
git commit -m "feat: add Semana toggle button and responsible filter chips to toolbar"
```

---

### Task 3: Build the weekly time-grid view

**Files:**
- Modify: `frontend/src/pages/AppointmentsPage.tsx`

- [ ] **Step 1: Add the HOURS constant near the top of the file**

After the `MONTHS_PT` constant, add:
```tsx
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7 to 22
const HOUR_HEIGHT = 60 // px per hour
const GRID_START_HOUR = 7
```

- [ ] **Step 2: Add helper to compute appointment block position**

After the `getApptsForDay` function, add:
```tsx
const getApptStyle = (appt: any): React.CSSProperties => {
  const start = new Date(appt.startAt)
  const end = new Date(appt.endAt)
  const startMinutes = (start.getHours() - GRID_START_HOUR) * 60 + start.getMinutes()
  const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / 60000)
  const top = (startMinutes / 60) * HOUR_HEIGHT
  const height = Math.max(22, (durationMinutes / 60) * HOUR_HEIGHT - 2)
  return { top, height }
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
```

- [ ] **Step 3: Add the week view JSX block**

After the closing brace of the `{view === 'list' && (...)}` block, add:

```tsx
{/* ── WEEK VIEW ── */}
{view === 'week' && (
  <div style={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

    {/* Week header — navigation */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
      <button
        onClick={prevWeek}
        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronLeft size={16} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTHS_PT[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
        </span>
        <button
          onClick={goToThisWeek}
          style={{ padding: '3px 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#6366f1', cursor: 'pointer' }}
        >
          Hoje
        </button>
      </div>
      <button
        onClick={nextWeek}
        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronRight size={16} />
      </button>
    </div>

    {/* Day column headers */}
    <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
      <div /> {/* empty corner above hour labels */}
      {weekDays.map((day, i) => {
        const isToday = day.toDateString() === today.toDateString()
        return (
          <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {WEEK_DAYS_PT[day.getDay()]}
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: isToday ? 700 : 400,
              background: isToday ? '#6366f1' : 'transparent',
              color: isToday ? '#fff' : 'var(--text-secondary)',
            }}>
              {day.getDate()}
            </div>
          </div>
        )
      })}
    </div>

    {/* Scrollable time grid */}
    <div style={{ overflowY: 'auto', maxHeight: 560 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative' }}>

        {/* Hour labels column */}
        <div>
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, di) => {
          const isToday = day.toDateString() === today.toDateString()
          const dayAppts = visibleAppointments.filter(a => new Date(a.startAt).toDateString() === day.toDateString())
          return (
            <div
              key={di}
              style={{
                borderLeft: '1px solid var(--border-color)',
                position: 'relative',
                background: isToday ? 'rgba(99,102,241,0.02)' : 'transparent',
                height: HOURS.length * HOUR_HEIGHT,
              }}
            >
              {/* Hour grid lines */}
              {HOURS.map((h, hi) => (
                <div key={h} style={{
                  position: 'absolute', top: hi * HOUR_HEIGHT, left: 0, right: 0,
                  borderTop: `1px solid var(--border-subtle)`,
                  height: HOUR_HEIGHT,
                }} />
              ))}

              {/* Appointment blocks */}
              {dayAppts.map(a => {
                const { top, height } = getApptStyle(a)
                const sc = STATUS_COLORS[a.status] || '#6366f1'
                return (
                  <div
                    key={a.id}
                    onClick={() => openEdit(a)}
                    title={`${a.title} — ${formatTime(a.startAt)} até ${formatTime(a.endAt)}`}
                    style={{
                      position: 'absolute',
                      top: top + 1,
                      left: 2,
                      right: 2,
                      height: height,
                      borderRadius: 6,
                      background: sc + '22',
                      borderLeft: `3px solid ${sc}`,
                      padding: '2px 5px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      zIndex: 1,
                      transition: 'filter 120ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.92)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: sc, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatTime(a.startAt)} {a.title}
                    </div>
                    {height > 36 && a.contact && (
                      <div style={{ fontSize: 10, color: sc, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.contact.name}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify the app compiles and renders the week view**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/AppointmentsPage.tsx
git commit -m "feat: add Google Calendar-style weekly time-grid view"
```

---

### Task 4: Enhance the month view — show time in event labels

**Files:**
- Modify: `frontend/src/pages/AppointmentsPage.tsx`

- [ ] **Step 1: Update the event labels in the month grid to show start time**

Find the event label block inside the month view days grid (around `{dayAppts.slice(0, 2).map(a => (`). Replace it with:
```tsx
{dayAppts.slice(0, 3).map(a => (
  <div
    key={a.id}
    onClick={() => openEdit(a)}
    style={{
      fontSize: 11, padding: '2px 6px', borderRadius: 6,
      marginBottom: 2, cursor: 'pointer', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      background: STATUS_COLORS[a.status] + '18',
      color: STATUS_COLORS[a.status],
      fontWeight: 600,
    }}
    title={a.title}
  >
    {formatTime(a.startAt)} {a.title}
  </div>
))}
{dayAppts.length > 3 && (
  <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 600 }}>
    +{dayAppts.length - 3} mais
  </div>
)}
```

Note: `formatTime` was defined in Task 3. Also update the overflow line from `> 2` to `> 3` (already done above).

- [ ] **Step 2: Verify build still passes**
```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/AppointmentsPage.tsx
git commit -m "feat: show start time in month view event labels, bump visible events to 3"
```

---

## Self-Review

**Spec coverage:**
- ✅ Weekly view with 7 columns + hour rows 07:00–22:00 — Task 3
- ✅ Appointment blocks positioned by time, height = duration — Task 3 (`getApptStyle`)
- ✅ Today column highlighted — Task 3
- ✅ Week navigation (prev/next/today) — Task 1 + Task 3
- ✅ Responsible filter chips — Task 1 + Task 2
- ✅ Month view enhanced with start time — Task 4
- ✅ List view unchanged, still uses `visibleAppointments` — Task 2 Step 3

**Placeholder scan:** None found.

**Type consistency:** `visibleAppointments` defined in Task 1 Step 4, used in Task 2 Step 3 and Task 3 Step 3. `formatTime` defined in Task 3 Step 2, used in Task 3 Step 3 and Task 4 Step 1. `getWeekStart`, `weekDays`, `HOURS`, `HOUR_HEIGHT`, `GRID_START_HOUR`, `getApptStyle` all defined before use. ✅
