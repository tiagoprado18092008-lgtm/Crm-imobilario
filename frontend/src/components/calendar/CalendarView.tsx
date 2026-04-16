import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react'
import type { Task } from '../../types'

interface TeamUser {
  id: string
  name: string
  avatarUrl?: string
}

interface CalendarViewProps {
  tasks: Task[]
  calendarEvents?: any[]
  teamUsers?: TeamUser[]
  onTaskClick?: (task: Task) => void
  onEventClick?: (event: any) => void
  onCreateOnDate?: (date: Date) => void
  onCreateEventOnDate?: (date: Date) => void
}

// ── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => i)   // 0–23
const HOUR_H = 60   // px per hour — matches Google Calendar density

const TASK_COLORS: Record<string, string> = {
  PENDING: '#6366f1', IN_PROGRESS: '#2563eb', COMPLETED: '#64748b', CANCELLED: '#94a3b8',
}

function taskColor(t: Task) { return TASK_COLORS[t.status] ?? '#6366f1' }
function evColor(ev: any) {
  if (ev.externalProvider === 'google') return ev.color || '#039be5'
  if (ev.externalProvider === 'outlook') return ev.color || '#0078d4'
  return ev.color || '#33b679'
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getWeekStart(d: Date) {
  const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0,0,0,0); return s
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function sameDay(a: Date, b: Date) { return toKey(a) === toKey(b) }
function fmt2(n: number) { return String(n).padStart(2,'0') }
function fmtTime(d: Date) { return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}` }

// position an event block in the time grid
function evPos(ev: any): { top: number; height: number } | null {
  if (!ev.startAt || ev.isAllDay) return null
  const s = new Date(ev.startAt)
  const e = ev.endAt ? new Date(ev.endAt) : new Date(s.getTime() + 3600000)
  const sm = s.getHours() * 60 + s.getMinutes()
  const em = e.getHours() * 60 + e.getMinutes()
  if (em <= 0 || sm >= 24 * 60) return null
  return { top: (sm / 60) * HOUR_H, height: Math.max(20, ((em - sm) / 60) * HOUR_H) }
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [mini, setMini] = useState(new Date(value))
  // Keep mini in sync when value changes from outside (e.g. Hoje button or week header click)
  useEffect(() => {
    setMini(new Date(value))
  }, [value.getFullYear(), value.getMonth()])
  const year = mini.getFullYear()
  const month = mini.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = toKey(new Date())
  const selected = toKey(value)

  const prev = () => setMini(m => { const n = new Date(m); n.setMonth(n.getMonth()-1); return n })
  const next = () => setMini(m => { const n = new Date(m); n.setMonth(n.getMonth()+1); return n })

  return (
    <div style={{ width: 224, padding: '8px 4px' }}>
      {/* Mini header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#3c4043' }}>{MONTH_NAMES[month]} {year}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={prev} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', color: '#3c4043', display: 'flex' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={next} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', color: '#3c4043', display: 'flex' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#70757a', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`p${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(year, month, day)
          const key = toKey(date)
          const isToday = key === today
          const isSel = key === selected
          return (
            <button key={day} onClick={() => onChange(date)} style={{
              border: 'none', background: isSel ? '#1a73e8' : 'none',
              borderRadius: '50%', cursor: 'pointer',
              color: isSel ? '#fff' : isToday ? '#1a73e8' : '#3c4043',
              fontSize: 11, fontWeight: isSel || isToday ? 700 : 400,
              width: 26, height: 26, margin: '1px auto', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Event Tooltip ─────────────────────────────────────────────────────────────
function EvTooltip({ ev, pos }: { ev: any; pos: { x: number; y: number } }) {
  const isGoogle = ev.externalProvider === 'google'
  const isOutlook = ev.externalProvider === 'outlook'
  const sourceLabel = isGoogle ? 'Google Calendar' : isOutlook ? 'Outlook Calendar' : 'CRM'
  const sourceColor = isGoogle ? '#4285f4' : isOutlook ? '#0078d4' : '#6366f1'
  const sourceIcon = isGoogle ? '🗓' : isOutlook ? '📅' : '📌'
  const start = ev.startAt ? new Date(ev.startAt) : null
  const end = ev.endAt ? new Date(ev.endAt) : null

  return (
    <div style={{
      position: 'fixed',
      left: pos.x + 12,
      top: pos.y - 8,
      zIndex: 9999,
      background: '#202124',
      color: '#fff',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 200,
      maxWidth: 280,
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, lineHeight: 1.3 }}>{ev.title}</div>
      {start && (
        <div style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 4, fontSize: 11 }}>
          {fmtTime(start)}{end ? ` – ${fmtTime(end)}` : ''}
          {start ? ` · ${start.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
        </div>
      )}
      {ev.location && (
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 4 }}>📍 {ev.location}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <span style={{ fontSize: 12 }}>{sourceIcon}</span>
        <span style={{ fontSize: 11, color: sourceColor, fontWeight: 600 }}>{sourceLabel}</span>
      </div>
    </div>
  )
}

// ── Event Block (on grid) ─────────────────────────────────────────────────────
function EvBlock({ ev, onClick, col = 0, cols = 1 }: { ev: any; onClick?: (e: any) => void; col?: number; cols?: number }) {
  const pos = evPos(ev)
  if (!pos) return null
  const color = evColor(ev)
  const isGoogle = ev.externalProvider === 'google'
  const isCrm = !ev.externalProvider
  const w = cols > 1 ? `calc(${100/cols}% - 2px)` : 'calc(100% - 4px)'
  const left = cols > 1 ? `calc(${col * 100/cols}% + 2px)` : 2
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  return (
    <>
      <div
        onClick={e => { e.stopPropagation(); onClick?.(ev) }}
        onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY })}
        onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltip(null)}
        style={{
          position: 'absolute',
          top: pos.top + 1,
          left,
          width: w,
          height: pos.height - 2,
          background: color + 'cc',
          borderLeft: `3px solid ${color}`,
          borderRadius: 4,
          padding: '2px 5px',
          cursor: 'pointer',
          zIndex: 2,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {ev.title}
          </div>
          <span style={{ fontSize: 8, padding: '0 3px', borderRadius: 2, background: 'rgba(255,255,255,0.3)', flexShrink: 0, lineHeight: '14px', whiteSpace: 'nowrap' }}>
            {isGoogle ? 'Google' : isCrm ? 'CRM' : 'Outlook'}
          </span>
        </div>
        {pos.height > 32 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2, marginTop: 1 }}>
            {fmtTime(new Date(ev.startAt))}{ev.endAt ? ` – ${fmtTime(new Date(ev.endAt))}` : ''}
          </div>
        )}
        {ev.externalProvider === 'google' && (
          <div
            title="Google Calendar"
            style={{ position: 'absolute', top: 3, right: 4, width: 14, height: 14 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="#4285F4"/>
            </svg>
          </div>
        )}
        {ev.externalProvider === 'outlook' && (
          <div
            title="Outlook"
            style={{ position: 'absolute', top: 3, right: 4, width: 14, height: 14, fontSize: 9, fontWeight: 700, color: '#0078d4', lineHeight: '14px', textAlign: 'center' as const }}
          >
            O
          </div>
        )}
      </div>
      {tooltip && <EvTooltip ev={ev} pos={tooltip} />}
    </>
  )
}

// Chip for all-day / month view
function SourceBadge({ provider }: { provider?: string }) {
  const label = provider === 'google' ? 'Google' : provider === 'outlook' ? 'Outlook' : 'CRM'
  return (
    <span style={{ fontSize: 8, padding: '0 3px', borderRadius: 2, background: 'rgba(255,255,255,0.3)', flexShrink: 0, lineHeight: '14px' }}>
      {label}
    </span>
  )
}

function EvChip({ ev, onClick, task }: { ev?: any; onClick?: (e: any) => void; task?: Task; onTaskClick?: (t: Task) => void }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  if (task) {
    const color = taskColor(task)
    const fakeEv = { title: task.title, startAt: task.dueDate ? task.dueDate + 'T00:00' : undefined }
    return (
      <>
        <div onClick={e => { e.stopPropagation(); onClick?.(task as any) }}
          onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY })}
          onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setTooltip(null)}
          style={{ background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
          <SourceBadge />
        </div>
        {tooltip && <EvTooltip ev={fakeEv} pos={tooltip} />}
      </>
    )
  }
  if (!ev) return null
  const color = evColor(ev)
  return (
    <>
      <div onClick={e => { e.stopPropagation(); onClick?.(ev) }}
        onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY })}
        onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltip(null)}
        style={{ background: color + 'cc', borderLeft: `3px solid ${color}`, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
        {ev.externalProvider === 'google' && (
          <svg viewBox="0 0 24 24" width="11" height="11" style={{ marginLeft: 3, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="white"/>
          </svg>
        )}
        <SourceBadge provider={ev.externalProvider} />
      </div>
      {tooltip && <EvTooltip ev={ev} pos={tooltip} />}
    </>
  )
}

// ── Week/Day grid shared ──────────────────────────────────────────────────────
function TimeGrid({
  days,
  tasksByKey,
  eventsByKey,
  todayKey,
  onTaskClick,
  onEventClick,
  onCreateOnDate,
}: {
  days: Date[]
  tasksByKey: Record<string, Task[]>
  eventsByKey: Record<string, any[]>
  todayKey: string
  onTaskClick?: (t: Task) => void
  onEventClick?: (e: any) => void
  onCreateOnDate?: (d: Date) => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>([])
  const [drag, setDrag] = useState<{ col: number; startMin: number; endMin: number } | null>(null)
  const dragRef = useRef<typeof drag>(null)

  // Scroll to 8am on mount
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 8 * HOUR_H
  }, [])

  // Current time
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const snap15 = (min: number) => Math.round(min / 15) * 15
  const yToMin = (y: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect()
    return snap15(Math.max(0, Math.min((y - rect.top + (gridRef.current?.scrollTop || 0)) / HOUR_H * 60, 24 * 60 - 15)))
  }

  const onColDown = (e: React.MouseEvent, ci: number) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = colRefs.current[ci]; if (!el) return
    const sm = yToMin(e.clientY, el)
    const s = { col: ci, startMin: sm, endMin: sm + 60 }
    dragRef.current = s; setDrag(s)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      const el = colRefs.current[d.col]; if (!el) return
      const em = Math.max(yToMin(e.clientY, el), d.startMin + 15)
      const next = { ...d, endMin: em }
      dragRef.current = next; setDrag({ ...next })
    }
    const onUp = () => {
      const d = dragRef.current; if (!d) return
      dragRef.current = null; setDrag(null)
      onCreateOnDate?.(days[d.col])
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [days, onCreateOnDate])

  const nowTop = (nowMin / 60) * HOUR_H

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* All-day strip */}
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0 }}>
        <div style={{ borderRight: '1px solid #e0e0e0', fontSize: 10, color: '#70757a', padding: '4px 8px', textAlign: 'right' }}>
          todo o dia
        </div>
        {days.map((d, i) => {
          const k = toKey(d)
          const allEvs = (eventsByKey[k] || []).filter(ev => ev.isAllDay)
          const tasks = tasksByKey[k] || []
          if (allEvs.length === 0 && tasks.length === 0) {
            return <div key={i} style={{ borderLeft: i > 0 ? '1px solid #e0e0e0' : undefined, minHeight: 20, padding: 2 }} />
          }
          return (
            <div key={i} style={{ borderLeft: i > 0 ? '1px solid #e0e0e0' : undefined, padding: '2px 3px', minHeight: 28 }}>
              {tasks.map(t => <EvChip key={t.id} task={t} onClick={() => onTaskClick?.(t)} />)}
              {allEvs.map(ev => <EvChip key={ev.id} ev={ev} onClick={() => onEventClick?.(ev)} />)}
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, minHeight: 24 * HOUR_H }}>
          {/* Hour labels */}
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: h === 0 ? 0 : -6, position: 'relative' }}>
                {h > 0 && (
                  <span style={{ fontSize: 10, color: '#70757a', marginTop: -6, whiteSpace: 'nowrap' }}>
                    {fmt2(h)}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const k = toKey(d)
            const isToday = k === todayKey
            const dayEvs = (eventsByKey[k] || []).filter(ev => !ev.isAllDay)
            const isDragging = drag?.col === di

            return (
              <div
                key={di}
                ref={el => { colRefs.current[di] = el }}
                onMouseDown={e => onColDown(e, di)}
                style={{
                  borderLeft: '1px solid #e0e0e0',
                  position: 'relative',
                  height: 24 * HOUR_H,
                  cursor: 'crosshair',
                  userSelect: 'none',
                  background: isToday ? 'rgba(26,115,232,0.02)' : 'transparent',
                }}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, borderTop: h === 0 ? 'none' : '1px solid #e0e0e0' }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div key={`h${h}`} style={{ position: 'absolute', top: h * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px solid #f1f3f4' }} />
                ))}

                {/* Events */}
                {dayEvs.map(ev => (
                  <EvBlock key={ev.id} ev={ev} onClick={onEventClick} />
                ))}

                {/* Current time */}
                {isToday && (
                  <>
                    <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: '#ea4335', zIndex: 5 }} />
                    <div style={{ position: 'absolute', top: nowTop - 4, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#ea4335', zIndex: 6 }} />
                  </>
                )}

                {/* Drag preview */}
                {isDragging && drag && (() => {
                  const ms = Math.min(drag.startMin, drag.endMin)
                  const me = Math.max(drag.startMin, drag.endMin)
                  const top = (ms / 60) * HOUR_H
                  const h = Math.max(15, me - ms) / 60 * HOUR_H
                  return (
                    <div style={{
                      position: 'absolute', top: top + 1, left: 2, right: 2, height: h - 2,
                      background: 'rgba(26,115,232,0.2)', border: '1px solid #1a73e8',
                      borderRadius: 4, zIndex: 10, pointerEvents: 'none',
                      padding: '3px 6px',
                    }}>
                      <div style={{ fontSize: 11, color: '#1a73e8', fontWeight: 600 }}>
                        {fmt2(Math.floor(ms / 60))}:{fmt2(ms % 60)} – {fmt2(Math.floor(me / 60))}:{fmt2(me % 60)}
                      </div>
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

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ currentDate, tasksByKey, eventsByKey, todayKey, onTaskClick, onEventClick, onCreateOnDate }: {
  currentDate: Date; tasksByKey: Record<string, Task[]>; eventsByKey: Record<string, any[]>
  todayKey: string; onTaskClick?: (t: Task) => void; onEventClick?: (e: any) => void; onCreateOnDate?: (d: Date) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day name header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #e0e0e0' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 600, color: '#70757a', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flex: 1, overflow: 'auto' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`p${i}`} style={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', minHeight: 120, background: '#f8f9fa' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(year, month, day)
          const key = toKey(date)
          const isToday = key === todayKey
          const col = (firstDay + i) % 7
          const tasks = tasksByKey[key] || []
          const evs = eventsByKey[key] || []
          const MAX = 3
          const allCount = tasks.length + evs.length
          return (
            <div key={day}
              onClick={() => onCreateOnDate?.(date)}
              style={{
                borderRight: col < 6 ? '1px solid #e0e0e0' : 'none',
                borderBottom: '1px solid #e0e0e0',
                minHeight: 120, padding: '4px 4px 2px',
                cursor: 'pointer',
                background: 'var(--bg-card)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 400,
                  background: isToday ? '#1a73e8' : 'transparent',
                  color: isToday ? '#fff' : '#3c4043',
                }}>{day}</span>
              </div>
              {tasks.slice(0, MAX).map((t, idx) =>
                <EvChip key={`t${idx}`} task={t} onClick={tk => onTaskClick?.(tk as any)} />
              )}
              {evs.slice(0, Math.max(0, MAX - tasks.length)).map((ev, idx) =>
                <EvChip key={`e${idx}`} ev={ev} onClick={e => onEventClick?.(e)} />
              )}
              {allCount > MAX && (
                <div style={{ fontSize: 10, color: '#70757a', paddingLeft: 4 }}>+{allCount - MAX} mais</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Calendars sidebar list ────────────────────────────────────────────────────
interface CalendarSource {
  id: string
  label: string
  color: string
  provider: 'google' | 'outlook' | 'crm' | 'tasks'
  enabled: boolean
}

// ── Main CalendarView ─────────────────────────────────────────────────────────
export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks, calendarEvents = [], teamUsers = [], onTaskClick, onEventClick, onCreateOnDate, onCreateEventOnDate,
}) => {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const [sources, setSources] = useState<CalendarSource[]>([
    { id: 'crm_events', label: 'Eventos CRM', color: '#33b679', provider: 'crm', enabled: true },
    { id: 'tasks', label: 'Tarefas', color: '#6366f1', provider: 'tasks', enabled: true },
    { id: 'google', label: 'Google Calendar', color: '#4285f4', provider: 'google', enabled: true },
    { id: 'outlook', label: 'Outlook Calendar', color: '#0078d4', provider: 'outlook', enabled: true },
  ])

  const toggleSource = (id: string) =>
    setSources(s => s.map(src => src.id === id ? { ...src, enabled: !src.enabled } : src))

  const isEnabled = (id: string) => sources.find(s => s.id === id)?.enabled ?? true

  // Team user filter (admin only) — all selected by default
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(() => new Set(teamUsers.map(u => u.id)))
  // Keep in sync if teamUsers prop changes (e.g. loaded async)
  useEffect(() => {
    setSelectedUsers(prev => {
      const ids = new Set(teamUsers.map(u => u.id))
      // add any new users as selected
      const next = new Set(prev)
      ids.forEach(id => { if (!next.has(id)) next.add(id) })
      return next
    })
  }, [teamUsers.length])

  const toggleUser = (id: string) =>
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const userFilterActive = teamUsers.length > 0

  const today = new Date()
  const todayKey = toKey(today)

  // Group tasks (filtered by source + user)
  const tasksByKey: Record<string, Task[]> = {}
  if (isEnabled('tasks')) {
    for (const t of tasks) {
      if (!t.dueDate) continue
      if (userFilterActive && t.assignedToId && !selectedUsers.has(t.assignedToId)) continue
      const k = t.dueDate.slice(0, 10)
      if (!tasksByKey[k]) tasksByKey[k] = []
      tasksByKey[k].push(t)
    }
  }

  // Group events (filtered by source + user)
  const eventsByKey: Record<string, any[]> = {}
  for (const ev of calendarEvents) {
    if (!ev.startAt) continue
    const provider = ev.externalProvider
    if (provider === 'google' && !isEnabled('google')) continue
    if (provider === 'outlook' && !isEnabled('outlook')) continue
    if (!provider && !isEnabled('crm_events')) continue
    if (userFilterActive && ev.userId && !selectedUsers.has(ev.userId)) continue
    const k = new Date(ev.startAt).toISOString().slice(0, 10)
    if (!eventsByKey[k]) eventsByKey[k] = []
    eventsByKey[k].push(ev)
  }

  // Which sources actually have data (to show in sidebar)
  const hasGoogle = calendarEvents.some(e => e.externalProvider === 'google')
  const hasOutlook = calendarEvents.some(e => e.externalProvider === 'outlook')
  const hasCrmEvents = calendarEvents.some(e => !e.externalProvider)
  const hasTasks = tasks.length > 0

  const visibleSources = sources.filter(s =>
    (s.id === 'google' && hasGoogle) ||
    (s.id === 'outlook' && hasOutlook) ||
    (s.id === 'crm_events' && hasCrmEvents) ||
    (s.id === 'tasks' && hasTasks)
  )

  // Navigation
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

  // Week days
  const weekStart = getWeekStart(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Header title
  let title = ''
  if (view === 'month') {
    title = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  } else if (view === 'week') {
    const ws = weekDays[0]; const we = weekDays[6]
    title = ws.getMonth() === we.getMonth()
      ? `${MONTH_NAMES[ws.getMonth()]} ${ws.getFullYear()}`
      : `${MONTH_NAMES[ws.getMonth()]} – ${MONTH_NAMES[we.getMonth()]} ${we.getFullYear()}`
  } else {
    title = `${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  const days = view === 'day' ? [currentDate] : weekDays

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 600, background: '#fff', fontFamily: 'Google Sans, Roboto, Arial, sans-serif', color: '#3c4043' }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 240, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, background: '#fff', overflowY: 'auto' }}>
        {/* Create button */}
        <div style={{ padding: '16px 12px 8px' }}>
          <button
            onClick={() => onCreateEventOnDate?.(new Date())}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 24,
              border: 'none', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#3c4043',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)')}
          >
            <Plus size={20} color="#1a73e8" />
            Criar
          </button>
        </div>

        {/* Mini calendar — clicking a day navigates to that day */}
        <MiniCalendar value={currentDate} onChange={d => { setCurrentDate(d); setView('day') }} />

        {/* Calendários section */}
        <div style={{ padding: '12px 16px 8px', borderTop: '1px solid #e0e0e0', marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#70757a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Os meus calendários
          </div>
          {visibleSources.map(src => (
            <label key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 4px', borderRadius: 6, cursor: 'pointer', userSelect: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Custom checkbox */}
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                background: src.enabled ? src.color : 'transparent',
                border: `2px solid ${src.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
                onClick={() => toggleSource(src.id)}
              >
                {src.enabled && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span style={{ fontSize: 13, color: '#3c4043', flex: 1 }} onClick={() => toggleSource(src.id)}>{src.label}</span>
            </label>
          ))}
          {visibleSources.length === 0 && (
            <p style={{ fontSize: 12, color: '#9aa0a6', margin: 0 }}>Sem calendários activos</p>
          )}
        </div>

        {/* Equipa (admin only) */}
        {teamUsers.length > 0 && (
          <div style={{ padding: '12px 16px 8px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#70757a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Equipa
              </div>
              <button
                onClick={() => {
                  if (selectedUsers.size === teamUsers.length) setSelectedUsers(new Set())
                  else setSelectedUsers(new Set(teamUsers.map(u => u.id)))
                }}
                style={{ fontSize: 11, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {selectedUsers.size === teamUsers.length ? 'Nenhum' : 'Todos'}
              </button>
            </div>
            {teamUsers.map(u => {
              const enabled = selectedUsers.has(u.id)
              const initials = u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px', borderRadius: 6, cursor: 'pointer', userSelect: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => toggleUser(u.id)}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: enabled ? '#1a73e8' : 'transparent',
                    border: `2px solid #1a73e8`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    {enabled && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8f0fe', color: '#1a73e8', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initials}
                  </span>
                  <span style={{ fontSize: 12, color: '#3c4043', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                </label>
              )
            })}
          </div>
        )}

        {/* Settings link */}
        <div style={{ padding: '8px 12px 16px', marginTop: 'auto' }}>
          <a href="/calendar/settings" style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
            borderRadius: 8, textDecoration: 'none', color: '#5f6368', fontSize: 12, fontWeight: 500,
            border: '1px solid #e0e0e0',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f4')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings size={14} color="#5f6368" />
            Definições de calendário
          </a>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
          {/* Today */}
          <button onClick={() => setCurrentDate(new Date())} style={{
            padding: '8px 20px', borderRadius: 20, border: '1px solid #dadce0',
            background: '#fff', color: '#3c4043', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Hoje
          </button>

          {/* Prev / Next */}
          <div style={{ display: 'flex' }}>
            {[goBack, goForward].map((fn, i) => (
              <button key={i} onClick={fn} style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: '50%', color: '#3c4043', display: 'flex',
              }}>
                {i === 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>
            ))}
          </div>

          {/* Title */}
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400, color: '#3c4043', flex: 1 }}>{title}</h2>

          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid #dadce0', borderRadius: 4, overflow: 'hidden' }}>
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: view === v ? '#e8f0fe' : '#fff',
                color: view === v ? '#1a73e8' : '#3c4043',
                borderRight: v !== 'month' ? '1px solid #dadce0' : 'none',
              }}>
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Day header (week/day view) */}
        {view !== 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0 }}>
            <div style={{ borderRight: '1px solid #e0e0e0' }} />
            {days.map((d, i) => {
              const isToday = sameDay(d, today)
              return (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderLeft: i > 0 ? '1px solid #e0e0e0' : undefined, cursor: 'pointer' }}
                  onClick={() => { setCurrentDate(d); setView('day') }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: isToday ? '#1a73e8' : '#70757a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {DAY_NAMES_SHORT[d.getDay()]}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: '50%', marginTop: 4,
                    background: isToday ? '#1a73e8' : 'transparent',
                    color: isToday ? '#fff' : '#3c4043',
                    fontSize: 20, fontWeight: isToday ? 700 : 400,
                  }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Content */}
        {view === 'month' ? (
          <MonthView
            currentDate={currentDate}
            tasksByKey={tasksByKey}
            eventsByKey={eventsByKey}
            todayKey={todayKey}
            onTaskClick={onTaskClick}
            onEventClick={onEventClick}
            onCreateOnDate={onCreateOnDate}
          />
        ) : (
          <TimeGrid
            days={days}
            tasksByKey={tasksByKey}
            eventsByKey={eventsByKey}
            todayKey={todayKey}
            onTaskClick={onTaskClick}
            onEventClick={onEventClick}
            onCreateOnDate={onCreateOnDate}
          />
        )}
      </div>
    </div>
  )
}
