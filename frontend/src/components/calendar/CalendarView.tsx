import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../../types'
import { TASK_STATUS_LABELS } from '../../utils/constants'

interface CalendarViewProps {
  tasks: Task[]
  calendarEvents?: any[]
  onTaskClick?: (task: Task) => void
  onEventClick?: (event: any) => void
  onCreateOnDate?: (date: Date) => void // called when drag-to-create finishes
  onCreateEventOnDate?: (date: Date) => void
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DAY_NAMES_LONG = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAY_NAMES_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 07–23
const HOUR_H = 56
const GRID_START = 7

const STATUS_BG: Record<string, string> = {
  PENDING: '#6366f1', IN_PROGRESS: '#2563eb', COMPLETED: '#64748b', CANCELLED: '#94a3b8',
}

function taskBg(task: Task): string { return STATUS_BG[task.status] ?? '#6366f1' }

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekStart(d: Date): Date {
  const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0,0,0,0); return s
}

const iconBtnStyle: React.CSSProperties = {
  padding: 6, border: '1px solid var(--border-color)', borderRadius: 6,
  background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

type ViewMode = 'month' | 'week' | 'day'

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, calendarEvents = [], onTaskClick, onEventClick, onCreateOnDate, onCreateEventOnDate }) => {
  const [view, setView] = useState<ViewMode>('week')
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
        <button onClick={goToToday} style={{
          padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
          border: '1px solid #6366f1', background: 'transparent', color: '#6366f1',
        }}>Hoje</button>

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
          onCreateOnDate={onCreateOnDate}
        />
      )}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onCreateOnDate={onCreateOnDate}
        />
      )}
      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          tasksByKey={tasksByKey}
          todayKey={todayKey}
          onTaskClick={onTaskClick}
          onCreateOnDate={onCreateOnDate}
        />
      )}

      {/* Calendar Events (from Google/Outlook) */}
      {calendarEvents.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Eventos de Calendário ({calendarEvents.length})
          </div>
          <div style={{ padding: 12, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {calendarEvents.slice(0, 10).map((ev: any) => (
              <div key={ev.id} onClick={() => onEventClick?.(ev)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 7, background: 'var(--hover-bg)',
                borderLeft: `3px solid ${ev.color || '#10b981'}`,
                cursor: onEventClick ? 'pointer' : 'default',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color || '#10b981', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {new Date(ev.startAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                  {!ev.isAllDay && ` · ${new Date(ev.startAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
                {ev.externalProvider && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                    background: ev.externalProvider === 'google' ? 'rgba(66,133,244,0.1)' : 'rgba(0,120,212,0.1)',
                    color: ev.externalProvider === 'google' ? '#4285f4' : '#0078d4' }}>
                    {ev.externalProvider === 'google' ? 'Google' : 'Outlook'}
                  </span>
                )}
              </div>
            ))}
            {calendarEvents.length > 10 && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                +{calendarEvents.length - 10} eventos adicionais
              </p>
            )}
          </div>
        </div>
      )}

      {/* Undated tasks */}
      {undatedTasks.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Sem data ({undatedTasks.length})
          </div>
          <div style={{ padding: 12, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {undatedTasks.map(t => (
              <div key={t.id} onClick={() => onTaskClick?.(t)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 7, background: 'var(--hover-bg)',
                borderLeft: `3px solid ${taskBg(t)}`,
                cursor: onTaskClick ? 'pointer' : 'default',
              }}>
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
        cursor: onClick ? 'pointer' : 'default', marginBottom: 2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
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
  onCreateOnDate?: (d: Date) => void
}

function MonthView({ currentDate, tasksByKey, todayKey, onTaskClick, onCreateOnDate }: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPadding = firstDay.getDay()
  const MAX_PILLS = 3

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} style={{ minHeight: 100, padding: '4px 6px',
            borderRight: (i % 7) < 6 ? '1px solid var(--border-color)' : 'none',
            borderBottom: '1px solid var(--border-color)', background: 'var(--bg-page)' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(year, month, day)
          const key = toDateKey(date)
          const isToday = key === todayKey
          const dayTasks = tasksByKey[key] || []
          const overflow = dayTasks.length - MAX_PILLS
          const col = (startPadding + i) % 7
          return (
            <div key={day}
              onClick={() => onCreateOnDate?.(date)}
              style={{
                minHeight: 100, padding: '4px 6px', cursor: 'pointer',
                borderRight: col < 6 ? '1px solid var(--border-color)' : 'none',
                borderBottom: '1px solid var(--border-color)',
                background: isToday ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                display: 'flex', flexDirection: 'column', transition: 'background 100ms',
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
              }}>{day}</div>
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

// ── WeekView — Google Calendar-style time grid ────────────────────────────────

interface WeekViewProps {
  currentDate: Date
  tasksByKey: Record<string, Task[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
  onCreateOnDate?: (d: Date) => void
}

function WeekView({ currentDate, tasksByKey, todayKey, onTaskClick, onCreateOnDate }: WeekViewProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragRef = useRef<{ dayIndex: number; startMin: number; endMin: number } | null>(null)
  const [drag, setDrag] = useState<{ dayIndex: number; startMin: number; endMin: number } | null>(null)

  const weekStart = getWeekStart(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = (8 - GRID_START) * HOUR_H
  }, [])

  const snap = (min: number) => Math.round(min / 15) * 15
  const yToMin = (y: number) => snap(Math.max(0, Math.min(y, HOURS.length * HOUR_H)) / HOUR_H * 60)
  const colY = (di: number, clientY: number) => {
    const el = colRefs.current[di]; if (!el) return 0
    return clientY - el.getBoundingClientRect().top
  }

  const onColMouseDown = (e: React.MouseEvent, di: number) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startMin = yToMin(colY(di, e.clientY))
    const state = { dayIndex: di, startMin, endMin: startMin + 60 }
    dragRef.current = state; setDrag(state)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const endMin = Math.max(yToMin(colY(dragRef.current.dayIndex, e.clientY)), dragRef.current.startMin + 15)
      const next = { ...dragRef.current, endMin }
      dragRef.current = next; setDrag(next)
    }
    const onUp = () => {
      const d = dragRef.current; if (!d) return
      dragRef.current = null; setDrag(null)
      onCreateOnDate?.(days[d.dayIndex])
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [days, onCreateOnDate])

  // Current time
  const now = new Date()
  const nowMin = (now.getHours() - GRID_START) * 60 + now.getMinutes()
  const nowTop = (nowMin / 60) * HOUR_H

  const pad = (n: number) => String(n).padStart(2, '0')
  const minToLabel = (min: number) => `${pad(Math.floor(min / 60) + GRID_START)}:${pad(min % 60)}`

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card)' }}>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)', background: 'var(--hover-bg)' }}>
        <div style={{ borderRight: '1px solid var(--border-color)' }} />
        {days.map((d, i) => {
          const isToday = toDateKey(d) === todayKey
          return (
            <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: i > 0 ? '1px solid var(--border-color)' : undefined }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isToday ? '#6366f1' : 'var(--text-muted)' }}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '50%', marginTop: 2,
                background: isToday ? '#6366f1' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-primary)',
                fontSize: 14, fontWeight: isToday ? 700 : 400,
              }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* All-day tasks row */}
      {days.some(d => (tasksByKey[toDateKey(d)] || []).length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)', background: 'var(--hover-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, borderRight: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>dia</span>
          </div>
          {days.map((d, i) => {
            const dayTasks = tasksByKey[toDateKey(d)] || []
            return (
              <div key={i} style={{ borderLeft: '1px solid var(--border-color)', padding: '3px 2px', minHeight: 28 }}>
                {dayTasks.map(t => (
                  <div key={t.id} onClick={e => { e.stopPropagation(); onTaskClick?.(t) }} title={t.title} style={{
                    background: taskBg(t), color: '#fff', borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: 'pointer', marginBottom: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}>{t.title}</div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={gridRef} style={{ overflowY: 'auto', maxHeight: 580 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>

          {/* Hour labels */}
          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const isToday = toDateKey(d) === todayKey
            const isDragging = drag?.dayIndex === di
            return (
              <div
                key={di}
                ref={el => { colRefs.current[di] = el }}
                onMouseDown={e => onColMouseDown(e, di)}
                style={{
                  borderLeft: '1px solid var(--border-color)',
                  position: 'relative',
                  background: isToday ? 'rgba(99,102,241,0.025)' : 'transparent',
                  height: HOURS.length * HOUR_H,
                  cursor: 'crosshair',
                  userSelect: 'none',
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map((_, hi) => (
                  <div key={hi} style={{
                    position: 'absolute', top: hi * HOUR_H, left: 0, right: 0,
                    borderTop: '1px solid var(--border-subtle)', height: HOUR_H,
                  }} />
                ))}

                {/* Half-hour subtle line */}
                {HOURS.map((_, hi) => (
                  <div key={`h-${hi}`} style={{
                    position: 'absolute', top: hi * HOUR_H + HOUR_H / 2, left: 0, right: 0,
                    borderTop: '1px dashed var(--border-subtle)', opacity: 0.5,
                  }} />
                ))}

                {/* Current time indicator */}
                {isToday && nowMin >= 0 && nowMin <= HOURS.length * 60 && (
                  <>
                    <div style={{
                      position: 'absolute', top: nowTop, left: 0, right: 0,
                      height: 2, background: '#ef4444', zIndex: 3,
                    }} />
                    <div style={{
                      position: 'absolute', top: nowTop - 3, left: -4,
                      width: 8, height: 8, borderRadius: '50%', background: '#ef4444', zIndex: 4,
                    }} />
                  </>
                )}

                {/* Drag preview block */}
                {isDragging && drag && (() => {
                  const minS = Math.min(drag.startMin, drag.endMin)
                  const minE = Math.max(drag.startMin, drag.endMin)
                  const top = (minS / 60) * HOUR_H
                  const height = Math.max(15, minE - minS) / 60 * HOUR_H
                  return (
                    <div style={{
                      position: 'absolute', top: top + 1, left: 2, right: 2,
                      height: height - 2, borderRadius: 6,
                      background: 'rgba(99,102,241,0.85)',
                      border: '2px solid #6366f1',
                      padding: '3px 6px', zIndex: 10, pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                        Nova tarefa
                      </div>
                      {height > 28 && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)' }}>
                          {minToLabel(minS)} – {minToLabel(minE)}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── DayView — single day time grid ────────────────────────────────────────────

interface DayViewProps {
  currentDate: Date
  tasksByKey: Record<string, Task[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
  onCreateOnDate?: (d: Date) => void
}

function DayView({ currentDate, tasksByKey, todayKey, onTaskClick, onCreateOnDate }: DayViewProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const colRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startMin: number; endMin: number } | null>(null)
  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null)

  const key = toDateKey(currentDate)
  const dayTasks = tasksByKey[key] || []
  const isToday = key === todayKey

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = (8 - GRID_START) * HOUR_H
  }, [])

  const snap = (min: number) => Math.round(min / 15) * 15
  const yToMin = (y: number) => snap(Math.max(0, Math.min(y, HOURS.length * HOUR_H)) / HOUR_H * 60)
  const colY = (clientY: number) => {
    const el = colRef.current; if (!el) return 0
    return clientY - el.getBoundingClientRect().top
  }

  const onColMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; e.preventDefault()
    const startMin = yToMin(colY(e.clientY))
    const state = { startMin, endMin: startMin + 60 }
    dragRef.current = state; setDrag(state)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const endMin = Math.max(yToMin(colY(e.clientY)), dragRef.current.startMin + 15)
      const next = { ...dragRef.current, endMin }
      dragRef.current = next; setDrag(next)
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null; setDrag(null)
      onCreateOnDate?.(currentDate)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [currentDate, onCreateOnDate])

  const now = new Date()
  const nowMin = (now.getHours() - GRID_START) * 60 + now.getMinutes()
  const nowTop = (nowMin / 60) * HOUR_H
  const pad = (n: number) => String(n).padStart(2, '0')
  const minToLabel = (min: number) => `${pad(Math.floor(min / 60) + GRID_START)}:${pad(min % 60)}`

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '52px 1fr',
        borderBottom: '1px solid var(--border-color)', background: 'var(--hover-bg)',
      }}>
        <div style={{ borderRight: '1px solid var(--border-color)' }} />
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            width: 42, height: 42, borderRadius: '50%', justifyContent: 'center',
            background: isToday ? '#6366f1' : 'var(--bg-card)',
            border: isToday ? 'none' : '1px solid var(--border-color)',
            color: isToday ? '#fff' : 'var(--text-primary)',
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {DAY_NAMES_SHORT[currentDate.getDay()]}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{currentDate.getDate()}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dayTasks.length} tarefa{dayTasks.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* All-day tasks */}
      {dayTasks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', borderBottom: '1px solid var(--border-color)', background: 'var(--hover-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, borderRight: '1px solid var(--border-color)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>dia</div>
          <div style={{ padding: '4px 6px' }}>
            {dayTasks.map(t => (
              <div key={t.id} onClick={() => onTaskClick?.(t)} title={t.title} style={{
                background: taskBg(t), color: '#fff', borderRadius: 4,
                padding: '2px 8px', fontSize: 12, fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'pointer', marginBottom: 3, boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}>{t.title}</div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div ref={gridRef} style={{ overflowY: 'auto', maxHeight: 580 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', position: 'relative' }}>
          <div style={{ borderRight: '1px solid var(--border-color)' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>
          <div
            ref={colRef}
            onMouseDown={onColMouseDown}
            style={{ position: 'relative', height: HOURS.length * HOUR_H, cursor: 'crosshair', userSelect: 'none',
              background: isToday ? 'rgba(99,102,241,0.02)' : 'transparent' }}
          >
            {HOURS.map((_, hi) => (
              <div key={hi} style={{ position: 'absolute', top: hi * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--border-subtle)', height: HOUR_H }} />
            ))}
            {HOURS.map((_, hi) => (
              <div key={`h-${hi}`} style={{ position: 'absolute', top: hi * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed var(--border-subtle)', opacity: 0.5 }} />
            ))}
            {isToday && nowMin >= 0 && (
              <>
                <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 3 }} />
                <div style={{ position: 'absolute', top: nowTop - 3, left: -4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', zIndex: 4 }} />
              </>
            )}
            {drag && (() => {
              const minS = Math.min(drag.startMin, drag.endMin)
              const minE = Math.max(drag.startMin, drag.endMin)
              const top = (minS / 60) * HOUR_H
              const height = Math.max(15, minE - minS) / 60 * HOUR_H
              return (
                <div style={{
                  position: 'absolute', top: top + 1, left: 2, right: 2,
                  height: height - 2, borderRadius: 6,
                  background: 'rgba(99,102,241,0.85)', border: '2px solid #6366f1',
                  padding: '3px 6px', zIndex: 10, pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>Nova tarefa</div>
                  {height > 28 && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)' }}>{minToLabel(minS)} – {minToLabel(minE)}</div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
