import React, { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight, CalendarDays, Clock, X } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DateTimePickerInputProps {
  value?: string           // datetime-local string "YYYY-MM-DDTHH:mm"
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  clearable?: boolean
  style?: React.CSSProperties
}

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 8
  return `${String(h).padStart(2, '0')}:00`
})

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i)

function parseLocalDT(v: string): Date | undefined {
  if (!v) return undefined
  const d = parse(v, "yyyy-MM-dd'T'HH:mm", new Date())
  return isValid(d) ? d : undefined
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const DateTimePickerInput: React.FC<DateTimePickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Selecionar data e hora',
  required,
  error,
  disabled,
  clearable = true,
  style,
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = parseLocalDT(value || '')
  const [month, setMonth] = useState<Date>(selected || new Date())

  const selectedTime = selected
    ? `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
    : ''

  useEffect(() => {
    const d = parseLocalDT(value || '')
    if (d) setMonth(d)
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return
    const h = selected ? selected.getHours() : 9
    const m = selected ? selected.getMinutes() : 0
    const newDate = new Date(day)
    newDate.setHours(h, m, 0, 0)
    onChange?.(toLocalInput(newDate))
  }

  const handleTimeSelect = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const base = selected || new Date()
    const newDate = new Date(base)
    newDate.setHours(h, m, 0, 0)
    onChange?.(toLocalInput(newDate))
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  const goToPrev = () => {
    const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d)
  }
  const goToNext = () => {
    const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d)
  }

  const displayValue = selected
    ? format(selected, "d 'de' MMMM, HH:mm", { locale: pt })
    : ''

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', fontSize: 13, borderRadius: 10,
          border: `1.5px solid ${error ? '#f87171' : open ? '#2563eb' : 'var(--border)'}`,
          background: disabled ? 'var(--surface-3)' : 'var(--surface)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left', outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 150ms, box-shadow 150ms',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        <CalendarDays size={14} style={{ flexShrink: 0, color: open ? '#2563eb' : 'var(--text-muted)', transition: 'color 150ms' }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue || placeholder}
        </span>
        {selected && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#60a5fa', fontSize: 11, fontWeight: 600, background: 'rgba(37,99,235,0.12)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
            <Clock size={10} />
            {selectedTime}
          </span>
        )}
        {clearable && selected && !disabled && (
          <span
            onClick={handleClear}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f87171'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: '#0f1117',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
          padding: '16px',
          display: 'flex', gap: 16,
          animation: 'dtpFadeIn 130ms cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Calendar side */}
          <div style={{ width: 258 }}>
            {/* Year / Month selectors */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select
                className="dtp-select"
                value={month.getFullYear()}
                onChange={e => { const d = new Date(month); d.setFullYear(Number(e.target.value)); setMonth(d) }}
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                className="dtp-select"
                value={month.getMonth()}
                onChange={e => { const d = new Date(month); d.setMonth(Number(e.target.value)); setMonth(d) }}
              >
                {MONTHS_EN.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>

            {/* Month header with navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
              <button className="dtp-nav-btn" onClick={goToPrev}><ChevronLeft size={13} strokeWidth={2} /></button>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                {format(month, 'MMMM yyyy', { locale: pt }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <button className="dtp-nav-btn" onClick={goToNext}><ChevronRight size={13} strokeWidth={2} /></button>
            </div>

            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={handleDaySelect}
              showOutsideDays
              components={{ Chevron: () => null }}
              classNames={{
                root: 'dtp-picker',
                months: 'dtp-months',
                month: 'dtp-month',
                month_caption: 'dtp-hidden',
                caption_label: 'dtp-hidden',
                nav: 'dtp-hidden',
                button_previous: 'dtp-hidden',
                button_next: 'dtp-hidden',
                weekdays: 'dtp-weekdays',
                weekday: 'dtp-weekday',
                weeks: 'dtp-weeks',
                week: 'dtp-week',
                day: 'dtp-day',
                day_button: 'dtp-day_button',
                selected: 'dtp-selected',
                today: 'dtp-today',
                outside: 'dtp-outside',
                disabled: 'dtp-disabled',
              }}
            />
          </div>

          {/* Time slots side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              Hora
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
              {TIME_SLOTS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTimeSelect(t)}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    border: selectedTime === t ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedTime === t ? '#2563eb' : 'rgba(255,255,255,0.04)',
                    color: selectedTime === t ? '#fff' : '#94a3b8',
                    transition: 'all 120ms',
                  }}
                  onMouseEnter={e => {
                    if (selectedTime !== t) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                      ;(e.currentTarget as HTMLElement).style.color = '#f1f5f9'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedTime !== t) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                      ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
                    }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <input
                type="time"
                value={selectedTime}
                onChange={e => handleTimeSelect(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 12,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#f1f5f9', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}

      <style>{`
        @keyframes dtpFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dtp-select {
          flex: 1; padding: 6px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #e2e8f0; font-size: 12px; font-weight: 500;
          cursor: pointer; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; padding-right: 26px;
          font-family: inherit; transition: border-color 120ms;
        }
        .dtp-select:focus { border-color: rgba(255,255,255,0.25); }
        .dtp-select option { background: #1e2535; color: #e2e8f0; }
        .dtp-nav-btn {
          width: 26px; height: 26px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .dtp-nav-btn:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }
        .dtp-hidden { display: none !important; }
        .dtp-months { display: flex; }
        .dtp-month { width: 258px; }
        .dtp-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .dtp-weekday {
          text-align: center; font-size: 10px; font-weight: 600;
          color: #64748b; padding: 4px 0;
        }
        .dtp-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dtp-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .dtp-day { display: flex; align-items: center; justify-content: center; }
        .dtp-day_button {
          width: 32px; height: 32px; border-radius: 50%;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 12px; font-weight: 400;
          cursor: pointer; transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .dtp-day_button:hover { background: rgba(255,255,255,0.09); color: #f1f5f9; }
        .dtp-selected .dtp-day_button {
          background: #2563eb !important; color: #fff !important; font-weight: 600;
        }
        .dtp-today .dtp-day_button {
          border: 1px solid rgba(255,255,255,0.25); color: #f1f5f9;
        }
        .dtp-selected.dtp-today .dtp-day_button { border-color: #2563eb; }
        .dtp-outside .dtp-day_button { color: #334155; }
        .dtp-disabled .dtp-day_button { opacity: 0.2; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
