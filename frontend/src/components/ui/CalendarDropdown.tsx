import React, { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react'

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

/* ── Inline mini-select (used internally for month/year) ───── */
const MiniSelect: React.FC<{
  value: number
  options: { value: number; label: string }[]
  onChange: (v: number) => void
}> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 8px', borderRadius: 8,
          border: `1.5px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(46,107,230,0.1)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 150ms, box-shadow 150ms',
          fontFamily: 'var(--font-body)',
        }}
      >
        {selected?.label}
        <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              zIndex: 9999, minWidth: 100,
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 10px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              animation: 'selectFadeIn 120ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px' }}>
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  style={{
                    width: '100%', display: 'block',
                    padding: '6px 10px', fontSize: 13,
                    borderRadius: 7, border: 'none',
                    background: opt.value === value ? 'var(--accent-soft)' : 'transparent',
                    color: opt.value === value ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: opt.value === value ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'
                  }}
                  onMouseLeave={e => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes selectFadeIn {
          from { opacity: 0; transform: translateY(-5px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
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

  const monthStart = startOfMonth(viewDate)
  const monthEnd   = endOfMonth(viewDate)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)

  const days: Date[] = []
  let cur = gridStart
  while (cur <= gridEnd) { days.push(cur); cur = addDays(cur, 1) }

  const years = Array.from({ length: 50 }, (_, i) => viewDate.getFullYear() - 25 + i)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
      fontFamily: 'var(--font-body)',
      width: 320,
    }}>
      {/* Header: month nav + selectors */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'border-color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ChevronLeft size={14} />
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          <MiniSelect
            value={viewDate.getMonth()}
            options={MONTHS_PT.map((m, i) => ({ value: i, label: m }))}
            onChange={m => setViewDate(new Date(viewDate.getFullYear(), m, 1))}
          />
          <MiniSelect
            value={viewDate.getFullYear()}
            options={years.map(y => ({ value: y, label: String(y) }))}
            onChange={y => setViewDate(new Date(y, viewDate.getMonth(), 1))}
          />
        </div>

        <button
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'border-color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
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
                width: '100%', aspectRatio: '1', borderRadius: 9, border: 'none',
                background: isSelected ? 'var(--accent)' : 'transparent',
                color: isSelected ? '#fff' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: isSelected || isTodayDay ? 700 : 400,
                cursor: 'pointer',
                outline: isTodayDay && !isSelected ? '2px solid var(--accent)' : 'none',
                outlineOffset: -2,
                transition: 'background 120ms, color 120ms',
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = isSelected ? 'var(--accent)' : 'transparent'
              }}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selected badges */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          marginTop: 14, paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}>
          {selected
            .sort((a, b) => a.getTime() - b.getTime())
            .map(d => (
              <span
                key={d.toISOString()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 11, fontWeight: 600,
                  border: '1px solid rgba(46,107,230,0.2)',
                }}
              >
                {format(d, 'dd MMM yyyy')}
                <button
                  onClick={() => removeDate(d)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, color: 'var(--accent)', display: 'flex',
                    opacity: 0.7,
                  }}
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
            background: selected.length > 0 ? 'var(--accent)' : 'var(--surface-3)',
            color: selected.length > 0 ? '#fff' : 'var(--text-muted)',
            border: 'none',
            cursor: selected.length > 0 ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)',
            transition: 'background 160ms',
            boxShadow: selected.length > 0 ? '0 2px 8px rgba(46,107,230,0.25)' : 'none',
          }}
        >
          {confirmLabel}
        </button>
      )}
    </div>
  )
}
