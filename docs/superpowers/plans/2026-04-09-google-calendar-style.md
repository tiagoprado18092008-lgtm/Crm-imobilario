# Google Calendar-Style Calendar Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic dot-based `CalendarView` with a Google Calendar-style component supporting Month, Week, and Day views with proper event pills.

**Architecture:** Rewrite `CalendarView.tsx` as a self-contained multi-view calendar. Tasks have only `dueDate` (no time), so they appear as all-day events. Month view shows titled pills (up to 3 + overflow). Week view shows 7 columns with all-day banners. Day view shows a single-day task list. The `TasksPage` already wraps it in a card and passes `tasks` — no changes needed there.

**Tech Stack:** React, TypeScript, inline styles (matches existing codebase pattern — no Tailwind in this component), lucide-react icons.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/components/calendar/CalendarView.tsx` | **Rewrite** | Full Google Calendar-style component with Month/Week/Day views |

---

### Task 1: Month View with event pills

**Files:**
- Modify: `frontend/src/components/calendar/CalendarView.tsx` (full rewrite)

- [ ] **Step 1: Replace CalendarView.tsx with Month view + view switcher**

Replace the entire file with:

```tsx
import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../../types'
import { TASK_STATUS_LABELS } from '../../utils/constants'

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DAY_NAMES_LONG = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAY_NAMES_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e',
}
const STATUS_BG: Record<string, string> = {
  PENDING: '#6366f1', IN_PROGRESS: '#2563eb', COMPLETED: '#64748b', CANCELLED: '#94a3b8',
}

function taskBg(task: Task): string {
  if (task.status === 'COMPLETED') return '#94a3b8'
  if (task.status === 'CANCELLED') return '#cbd5e1'
  return STATUS_BG[task.status] ?? '#6366f1'
}

function parseLocalDate(dateStr: string): Date {
  // dueDate is YYYY-MM-DD — parse as local to avoid UTC offset shifting
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

type ViewMode = 'month' | 'week' | 'day'

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const today = new Date()
  const todayKey = toDateKey(today)

  // ── navigation ──────────────────────────────────────────────────────────────
  const goToToday = () => setCurrentDate(new Date())
  const goBack = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }
  const goForward = () => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  // ── task index by date key ───────────────────────────────────────────────────
  const tasksByKey: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (!t.dueDate) continue
    const key = t.dueDate.slice(0, 10)
    if (!tasksByKey[key]) tasksByKey[key] = []
    tasksByKey[key].push(t)
  }

  // ── title ────────────────────────────────────────────────────────────────────
  let headerTitle = ''
  if (view === 'month') {
    headerTitle = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  } else if (view === 'week') {
    const weekStart = getWeekStart(currentDate)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
    headerTitle = weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${MONTH_NAMES[weekStart.getMonth()]} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
  } else {
    headerTitle = `${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()} – ${DAY_NAMES_LONG[currentDate.getDay()]}`
  }

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--text-primary)' }}>
      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {/* Today */}
        <button onClick={goToToday} style={btnStyle('#6366f1', true)}>Hoje</button>

        {/* Prev / Next */}
        <div style={{ display:'flex', gap:2 }}>
          <button onClick={goBack} style={iconBtnStyle}><ChevronLeft size={16}/></button>
          <button onClick={goForward} style={iconBtnStyle}><ChevronRight size={16}/></button>
        </div>

        {/* Title */}
        <span style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', flex:1 }}>
          {headerTitle}
        </span>

        {/* View switcher */}
        <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid var(--border-color)' }}>
          {(['month','week','day'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'6px 14px', fontSize:13, fontWeight:500, border:'none', cursor:'pointer',
              background: view === v ? '#6366f1' : 'var(--bg-card)',
              color: view === v ? '#fff' : 'var(--text-secondary)',
              transition:'background 150ms',
            }}>
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Views ── */}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onDayClick={(d) => { setCurrentDate(d); setView('day') }}
        />
      )}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onDayClick={(d) => { setCurrentDate(d); setView('day') }}
        />
      )}
      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
        />
      )}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const s = new Date(d)
  s.setDate(d.getDate() - d.getDay()) // Sunday = 0
  return s
}

const btnStyle = (color: string, outline = false): React.CSSProperties => ({
  padding:'5px 14px', fontSize:12, fontWeight:600, borderRadius:8, cursor:'pointer',
  border: `1px solid ${color}`, background: outline ? 'transparent' : color,
  color: outline ? color : '#fff', transition:'opacity 150ms',
})

const iconBtnStyle: React.CSSProperties = {
  padding:6, border:'1px solid var(--border-color)', borderRadius:6,
  background:'var(--bg-card)', color:'var(--text-secondary)', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
}

// ── EventPill ─────────────────────────────────────────────────────────────────

interface EventPillProps { task: Task; onClick?: (t: Task) => void; compact?: boolean }
function EventPill({ task, onClick, compact }: EventPillProps) {
  const bg = taskBg(task)
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick?.(task) }}
      title={task.title}
      style={{
        background: bg, color:'#fff', borderRadius:4,
        padding: compact ? '1px 5px' : '2px 6px',
        fontSize: compact ? 10 : 11, fontWeight:500,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        marginBottom:1,
      }}
    >
      {task.title}
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date
  tasksByKey: Record<string, Task[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
  onDayClick: (d: Date) => void
}

function MonthView({ currentDate, tasksByKey, todayKey, onTaskClick, onDayClick }: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPadding = firstDay.getDay()

  const MAX_PILLS = 3

  return (
    <div>
      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border-color)' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign:'center', padding:'6px 0', fontSize:11, fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', border:'1px solid var(--border-color)',
        borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
        {/* Padding cells */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} style={cellStyle(false, false, i % 7)} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = toDateKey(new Date(year, month, day))
          const isToday = key === todayKey
          const dayTasks = tasksByKey[key] || []
          const overflow = dayTasks.length - MAX_PILLS
          const col = (startPadding + i) % 7

          return (
            <div key={day} onClick={() => onDayClick(new Date(year, month, day))}
              style={{ ...cellStyle(isToday, true, col), minHeight:100, cursor:'pointer' }}>
              {/* Day number */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                width:26, height:26, borderRadius:'50%', margin:'2px 0 4px',
                background: isToday ? '#6366f1' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
                fontSize:12, fontWeight: isToday ? 700 : 500, flexShrink:0,
              }}>
                {day}
              </div>

              {/* Event pills */}
              <div style={{ flex:1, overflow:'hidden' }}>
                {dayTasks.slice(0, MAX_PILLS).map(t => (
                  <EventPill key={t.id} task={t} onClick={onTaskClick} compact />
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize:10, color:'var(--text-muted)', paddingLeft:4, fontWeight:500 }}>
                    +{overflow} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function cellStyle(isToday: boolean, hasHover: boolean, col: number): React.CSSProperties {
  return {
    padding:'4px 6px',
    borderRight: col < 6 ? '1px solid var(--border-color)' : 'none',
    borderBottom:'1px solid var(--border-color)',
    background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
    display:'flex', flexDirection:'column',
    transition: hasHover ? 'background 100ms' : undefined,
  }
}

// ── WeekView ──────────────────────────────────────────────────────────────────

interface WeekViewProps {
  currentDate: Date
  tasksByKey: Record<string, Task[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
  onDayClick: (d: Date) => void
}

function WeekView({ currentDate, tasksByKey, todayKey, onTaskClick, onDayClick }: WeekViewProps) {
  const weekStart = getWeekStart(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  return (
    <div style={{ border:'1px solid var(--border-color)', borderRadius:10, overflow:'hidden' }}>
      {/* Header row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)',
        borderBottom:'2px solid var(--border-color)', background:'var(--hover-bg)' }}>
        {days.map((d, i) => {
          const key = toDateKey(d)
          const isToday = key === todayKey
          return (
            <div key={i} onClick={() => onDayClick(d)}
              style={{ padding:'10px 8px', textAlign:'center', cursor:'pointer',
                borderRight: i < 6 ? '1px solid var(--border-color)' : 'none' }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                letterSpacing:'0.05em', color:'var(--text-muted)' }}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:30, height:30, borderRadius:'50%', marginTop:4,
                background: isToday ? '#6366f1' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
                fontSize:15, fontWeight: isToday ? 700 : 500,
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {days.map((d, i) => {
          const key = toDateKey(d)
          const dayTasks = tasksByKey[key] || []
          const isToday = key === todayKey
          return (
            <div key={i} onClick={() => onDayClick(d)}
              style={{
                minHeight:140, padding:6, cursor:'pointer',
                borderRight: i < 6 ? '1px solid var(--border-color)' : 'none',
                background: isToday ? 'rgba(99,102,241,0.04)' : 'var(--bg-card)',
                transition:'background 100ms',
              }}>
              {dayTasks.length === 0 && (
                <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center',
                  marginTop:20, fontStyle:'italic' }}>—</div>
              )}
              {dayTasks.map(t => (
                <EventPill key={t.id} task={t} onClick={onTaskClick} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DayView ───────────────────────────────────────────────────────────────────

interface DayViewProps {
  currentDate: Date
  tasksByKey: Record<string, Task[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
}

function DayView({ currentDate, tasksByKey, todayKey, onTaskClick }: DayViewProps) {
  const key = toDateKey(currentDate)
  const dayTasks = tasksByKey[key] || []
  const isToday = key === todayKey

  return (
    <div style={{ border:'1px solid var(--border-color)', borderRadius:10, overflow:'hidden' }}>
      {/* Day header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-color)',
        background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--hover-bg)',
        display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
          width:48, height:48, borderRadius:'50%', justifyContent:'center',
          background: isToday ? '#6366f1' : 'var(--bg-card)',
          border: isToday ? 'none' : '1px solid var(--border-color)',
          color: isToday ? '#fff' : 'var(--text-primary)', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
            letterSpacing:'0.05em', lineHeight:1.2 }}>
            {DAY_NAMES_SHORT[currentDate.getDay()]}
          </span>
          <span style={{ fontSize:20, fontWeight:700, lineHeight:1.2 }}>
            {currentDate.getDate()}
          </span>
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding:16, background:'var(--bg-card)', minHeight:200 }}>
        {dayTasks.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:13 }}>
            Sem tarefas para este dia.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {dayTasks.map(task => (
              <div key={task.id}
                onClick={() => onTaskClick?.(task)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 14px', borderRadius:8,
                  background:'var(--hover-bg)',
                  border:`2px solid ${taskBg(task)}`,
                  cursor: onTaskClick ? 'pointer' : 'default',
                  transition:'background 100ms',
                }}>
                <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0,
                  background: taskBg(task) }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {task.title}
                  </div>
                  {task.contact && (
                    <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>
                      {task.contact.name}
                    </div>
                  )}
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  background: taskBg(task) + '22', color: taskBg(task), flexShrink:0 }}>
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/calendar/CalendarView.tsx
git commit -m "feat: Google Calendar-style month/week/day views in CalendarView"
```

---

### Task 2: Wire onTaskClick in TasksPage to open edit modal

**Files:**
- Modify: `frontend/src/pages/TasksPage.tsx:329`

Tasks already have an edit modal. We can pass `onTaskClick` to open it when clicking a task pill.

- [ ] **Step 1: Pass onTaskClick to CalendarView**

In `TasksPage.tsx`, find the `<CalendarView tasks={tasks} />` render and replace with:

```tsx
<CalendarView
  tasks={tasks}
  onTaskClick={(task) => { setEditTask(task); setShowModal(true) }}
/>
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TasksPage.tsx
git commit -m "feat: clicking a task in calendar opens edit modal"
```
