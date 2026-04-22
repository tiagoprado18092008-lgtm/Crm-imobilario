import React, { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DatePickerInputProps {
  value?: string           // ISO date string: "YYYY-MM-DD"
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  clearable?: boolean
  style?: React.CSSProperties
}

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i)

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Selecionar data',
  required,
  error,
  disabled,
  clearable = true,
  style,
}) => {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(
    value && isValid(parse(value, 'yyyy-MM-dd', new Date()))
      ? parse(value, 'yyyy-MM-dd', new Date())
      : new Date()
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = value && isValid(parse(value, 'yyyy-MM-dd', new Date()))
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined

  useEffect(() => {
    if (value && isValid(parse(value, 'yyyy-MM-dd', new Date()))) {
      setMonth(parse(value, 'yyyy-MM-dd', new Date()))
    }
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

  const handleSelect = (day: Date | undefined) => {
    if (!day) return
    onChange?.(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  const goToPrev = () => {
    const d = new Date(month)
    d.setMonth(d.getMonth() - 1)
    setMonth(d)
  }

  const goToNext = () => {
    const d = new Date(month)
    d.setMonth(d.getMonth() + 1)
    setMonth(d)
  }

  const displayValue = selected
    ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: pt })
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
        {clearable && selected && !disabled && (
          <span
            onClick={handleClear}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4 }}
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
          animation: 'dpiFadeIn 130ms cubic-bezier(0.16,1,0.3,1)',
          width: 290,
        }}>
          {/* Year / Month selectors */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              className="dpi-select"
              value={month.getFullYear()}
              onChange={e => { const d = new Date(month); d.setFullYear(Number(e.target.value)); setMonth(d) }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              className="dpi-select"
              value={month.getMonth()}
              onChange={e => { const d = new Date(month); d.setMonth(Number(e.target.value)); setMonth(d) }}
            >
              {MONTHS_EN.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>

          {/* Month header with navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
            <button className="dpi-nav-btn" onClick={goToPrev}><ChevronLeft size={14} strokeWidth={2} /></button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              {format(month, 'MMMM yyyy', { locale: pt }).replace(/^\w/, c => c.toUpperCase())}
            </span>
            <button className="dpi-nav-btn" onClick={goToNext}><ChevronRight size={14} strokeWidth={2} /></button>
          </div>

          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={handleSelect}
            showOutsideDays
            components={{ Chevron: () => null }}
            classNames={{
              root: 'dpi-picker',
              months: 'dpi-months',
              month: 'dpi-month',
              month_caption: 'dpi-hidden',
              caption_label: 'dpi-hidden',
              nav: 'dpi-hidden',
              button_previous: 'dpi-hidden',
              button_next: 'dpi-hidden',
              weekdays: 'dpi-weekdays',
              weekday: 'dpi-weekday',
              weeks: 'dpi-weeks',
              week: 'dpi-week',
              day: 'dpi-day',
              day_button: 'dpi-day_button',
              selected: 'dpi-selected',
              today: 'dpi-today',
              outside: 'dpi-outside',
              disabled: 'dpi-disabled',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="button"
              onClick={() => { onChange?.(''); setOpen(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#60a5fa', fontFamily: 'inherit', padding: '2px 0' }}
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => { handleSelect(new Date()) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#60a5fa', fontFamily: 'inherit', padding: '2px 0' }}
            >
              Hoje
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}

      <style>{`
        @keyframes dpiFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dpi-select {
          flex: 1; padding: 6px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #e2e8f0; font-size: 13px; font-weight: 500;
          cursor: pointer; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; padding-right: 26px;
          font-family: inherit; transition: border-color 120ms;
        }
        .dpi-select:focus { border-color: rgba(255,255,255,0.25); }
        .dpi-select option { background: #1e2535; color: #e2e8f0; }
        .dpi-nav-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .dpi-nav-btn:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; border-color: rgba(255,255,255,0.2); }
        .dpi-hidden { display: none !important; }
        .dpi-months { display: flex; }
        .dpi-month { width: 258px; }
        .dpi-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .dpi-weekday {
          text-align: center; font-size: 11px; font-weight: 600;
          color: #64748b; padding: 4px 0;
        }
        .dpi-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dpi-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dpi-day { display: flex; align-items: center; justify-content: center; }
        .dpi-day_button {
          width: 34px; height: 34px; border-radius: 50%;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 13px; font-weight: 400;
          cursor: pointer; transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .dpi-day_button:hover { background: rgba(255,255,255,0.09); color: #f1f5f9; }
        .dpi-selected .dpi-day_button {
          background: #2563eb !important; color: #fff !important; font-weight: 600;
        }
        .dpi-today .dpi-day_button {
          border: 1px solid rgba(255,255,255,0.25); color: #f1f5f9;
        }
        .dpi-selected.dpi-today .dpi-day_button { border-color: #2563eb; }
        .dpi-outside .dpi-day_button { color: #334155; }
        .dpi-disabled .dpi-day_button { opacity: 0.2; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
