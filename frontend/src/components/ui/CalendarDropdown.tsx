import React, { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/* ── Design tokens ────────────────────────────────────────────── */
const T = {
  navy:    '#0f2553',
  gold:    '#b8963e',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface CalendarDropdownProps {
  mode?: 'single' | 'multiple'
  onSelect?: (dates: Date[]) => void
  confirmLabel?: string
  onConfirm?: (dates: Date[]) => void
}

export const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  mode = 'multiple',
  onSelect,
  confirmLabel = 'Confirmar',
  onConfirm,
}) => {
  const [viewDate, setViewDate] = useState(new Date())
  const [selected, setSelected] = useState<Date[]>([])

  const toggleDate = (day: Date) => {
    let next: Date[]
    if (mode === 'single') {
      next = [day]
    } else {
      const key = format(day, 'yyyy-MM-dd')
      const exists = selected.some(d => format(d, 'yyyy-MM-dd') === key)
      next = exists
        ? selected.filter(d => format(d, 'yyyy-MM-dd') !== key)
        : [...selected, day]
    }
    setSelected(next)
    onSelect?.(next)
  }

  const removeDate = (day: Date) => {
    const next = selected.filter(d => format(d, 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd'))
    setSelected(next)
    onSelect?.(next)
  }

  // Build calendar grid
  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)

  const days: Date[] = []
  let cur = gridStart
  while (cur <= gridEnd) { days.push(cur); cur = addDays(cur, 1) }

  const years = Array.from({ length: 50 }, (_, i) => viewDate.getFullYear() - 25 + i)

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${T.border}`,
    background: T.white, color: T.navy, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', cursor: 'pointer', flex: 1,
  }

  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: 20, boxShadow: '0 8px 32px rgba(15,37,83,0.10)',
      fontFamily: "'DM Sans', sans-serif", width: 320,
    }}>
      {/* Month / Year selectors */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <select
          value={viewDate.getFullYear()}
          onChange={e => setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))}
          style={selectStyle}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={viewDate.getMonth()}
          onChange={e => setViewDate(new Date(viewDate.getFullYear(), Number(e.target.value), 1))}
          style={selectStyle}
        >
          {MONTHS_PT.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          style={{ background: T.offWhite, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: T.navy, display: 'flex' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 13, color: T.navy, fontWeight: 600 }}>
          {MONTHS_PT[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          style={{ background: T.offWhite, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: T.navy, display: 'flex' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.muted, padding: '4px 0', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const isSelected = selected.some(d => format(d, 'yyyy-MM-dd') === key)
          const isCurrentMonth = isSameMonth(day, viewDate)
          const isTodayDay = isToday(day)

          return (
            <button
              key={key}
              onClick={() => toggleDate(day)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                background: isSelected ? T.navy : 'transparent',
                color: isSelected ? T.white : isCurrentMonth ? T.navy : T.muted,
                fontSize: 12, fontWeight: isSelected || isTodayDay ? 700 : 400,
                cursor: 'pointer',
                outline: isTodayDay && !isSelected ? `2px solid ${T.gold}` : 'none',
                outlineOffset: -1,
                transition: 'background 120ms',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = T.offWhite }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isSelected ? T.navy : 'transparent' }}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          {selected
            .sort((a, b) => a.getTime() - b.getTime())
            .map(d => (
              <span
                key={d.toISOString()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(15,37,83,0.07)', color: T.navy, borderRadius: 20,
                  padding: '3px 10px', fontSize: 11, fontWeight: 600, border: `1px solid ${T.border}`,
                }}
              >
                {format(d, 'dd MMM yyyy')}
                <button
                  onClick={() => removeDate(d)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.muted, display: 'flex' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Confirm */}
      {onConfirm && (
        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          style={{
            marginTop: 16, width: '100%', padding: '10px 16px', borderRadius: 10,
            background: selected.length > 0 ? T.navy : T.offWhite,
            color: selected.length > 0 ? T.white : T.muted,
            border: 'none', cursor: selected.length > 0 ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            transition: 'background 160ms',
          }}
        >
          {confirmLabel}
        </button>
      )}
    </div>
  )
}
