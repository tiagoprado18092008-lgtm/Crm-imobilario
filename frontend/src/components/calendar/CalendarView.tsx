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

const STATUS_BG: Record<string, string> = {
  PENDING: '#6366f1', IN_PROGRESS: '#2563eb', COMPLETED: '#64748b', CANCELLED: '#94a3b8',
}

function taskBg(task: Task): string {
  return STATUS_BG[task.status] ?? '#6366f1'
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekStart(d: Date): Date {
  const s = new Date(d)
  s.setDate(d.getDate() - d.getDay())
  return s
}

const iconBtnStyle: React.CSSProperties = {
  padding: 6, border: '1px solid var(--border-color)', borderRadius: 6,
  background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

type ViewMode = 'month' | 'week' | 'day'

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const today = new Date()
  const todayKey = toDateKey(today)

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

  const tasksByKey: Record<string, Task[]> = {}
  const undatedTasks: Task[] = []
  for (const t of tasks) {
    if (!t.dueDate) { undatedTasks.push(t); continue }
    const key = t.dueDate.slice(0, 10)
    if (!tasksByKey[key]) tasksByKey[key] = []
    tasksByKey[key].push(t)
  }

  let headerTitle = ''
  if (view === 'month') {
    headerTitle = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  } else if (view === 'week') {
    const ws = getWeekStart(currentDate)
    const we = new Date(ws); we.setDate(we.getDate() + 6)
    headerTitle = ws.getMonth() === we.getMonth()
      ? `${MONTH_NAMES[ws.getMonth()]} ${ws.getFullYear()}`
      : `${MONTH_NAMES[ws.getMonth()]} – ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`
  } else {
    headerTitle = `${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()} · ${DAY_NAMES_LONG[currentDate.getDay()]}`
  }

  return (
    <div style={{ fontFamily: 'inherit', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={goToToday}
          style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
            border: '1px solid #6366f1', background: 'transparent', color: '#6366f1',
          }}
        >
          Hoje
        </button>

        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={goBack} style={iconBtnStyle}><ChevronLeft size={16} /></button>
          <button onClick={goForward} style={iconBtnStyle}><ChevronRight size={16} /></button>
        </div>

        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {headerTitle}
        </span>

        {/* View switcher */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {(['month', 'week', 'day'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: view === v ? '#6366f1' : 'var(--bg-card)',
              color: view === v ? '#fff' : 'var(--text-secondary)',
              transition: 'background 150ms',
            }}>
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onDayClick={d => { setCurrentDate(d); setView('day') }}
        />
      )}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onDayClick={d => { setCurrentDate(d); setView('day') }}
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

      {/* Undated tasks */}
      {undatedTasks.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Sem data ({undatedTasks.length})
          </div>
          <div style={{ padding: 12, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {undatedTasks.map(t => (
              <div key={t.id}
                onClick={() => onTaskClick?.(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 7, background: 'var(--hover-bg)',
                  borderLeft: `3px solid ${taskBg(t)}`,
                  cursor: onTaskClick ? 'pointer' : 'default',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: taskBg(t), flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: taskBg(t) + '22', color: taskBg(t), flexShrink: 0 }}>
                  {TASK_STATUS_LABELS[t.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
        background: bg, color: '#fff', borderRadius: 4,
        padding: compact ? '1px 5px' : '2px 7px',
        fontSize: compact ? 10 : 11, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        marginBottom: 2,
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
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} style={{
            minHeight: 100, padding: '4px 6px',
            borderRight: (i % 7) < 6 ? '1px solid var(--border-color)' : 'none',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-page)',
          }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = toDateKey(new Date(year, month, day))
          const isToday = key === todayKey
          const dayTasks = tasksByKey[key] || []
          const overflow = dayTasks.length - MAX_PILLS
          const col = (startPadding + i) % 7

          return (
            <div key={day} onClick={() => onDayClick(new Date(year, month, day))}
              style={{
                minHeight: 100, padding: '4px 6px', cursor: 'pointer',
                borderRight: col < 6 ? '1px solid var(--border-color)' : 'none',
                borderBottom: '1px solid var(--border-color)',
                background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                display: 'flex', flexDirection: 'column',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: '50%', margin: '2px 0 4px',
                background: isToday ? '#6366f1' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
                fontSize: 12, fontWeight: isToday ? 700 : 400, flexShrink: 0,
              }}>
                {day}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {dayTasks.slice(0, MAX_PILLS).map(t => (
                  <EventPill key={t.id} task={t} onClick={onTaskClick} compact />
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 500 }}>
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
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        borderBottom: '2px solid var(--border-color)', background: 'var(--hover-bg)' }}>
        {days.map((d, i) => {
          const key = toDateKey(d)
          const isToday = key === todayKey
          return (
            <div key={i} onClick={() => onDayClick(d)} style={{
              padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
              borderRight: i < 6 ? '1px solid var(--border-color)' : 'none',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: isToday ? '#6366f1' : 'var(--text-muted)' }}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%', marginTop: 4,
                background: isToday ? '#6366f1' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
                fontSize: 16, fontWeight: isToday ? 700 : 400,
              }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {days.map((d, i) => {
          const key = toDateKey(d)
          const dayTasks = tasksByKey[key] || []
          const isToday = key === todayKey
          return (
            <div key={i} onClick={() => onDayClick(d)} style={{
              minHeight: 140, padding: 6, cursor: 'pointer',
              borderRight: i < 6 ? '1px solid var(--border-color)' : 'none',
              background: isToday ? 'rgba(99,102,241,0.04)' : 'var(--bg-card)',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              {dayTasks.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                  marginTop: 20, fontStyle: 'italic' }}>—</div>
              ) : (
                dayTasks.map(t => <EventPill key={t.id} task={t} onClick={onTaskClick} />)
              )}
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
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
        background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--hover-bg)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: isToday ? '#6366f1' : 'var(--bg-card)',
          border: isToday ? 'none' : '1px solid var(--border-color)',
          color: isToday ? '#fff' : 'var(--text-primary)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>
            {DAY_NAMES_SHORT[currentDate.getDay()]}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
            {currentDate.getDate()}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding: 16, background: 'var(--bg-card)', minHeight: 200 }}>
        {dayTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
            Sem tarefas para este dia.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayTasks.map(task => (
              <div key={task.id}
                onClick={() => onTaskClick?.(task)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--hover-bg)',
                  borderLeft: `4px solid ${taskBg(task)}`,
                  cursor: onTaskClick ? 'pointer' : 'default',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover-bg)' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: taskBg(task) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  {task.contact && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {task.contact.name}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: taskBg(task) + '22', color: taskBg(task), flexShrink: 0,
                }}>
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
