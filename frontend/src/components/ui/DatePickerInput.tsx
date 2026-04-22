import React, { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DatePickerInputProps {
  value?: string
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
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
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

  const goToPrev = () => { const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d) }
  const goToNext = () => { const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d) }

  const displayValue = selected
    ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: pt })
    : ''

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', fontSize: 13, borderRadius: 10,
          border: `1.5px solid ${error ? '#ef4444' : open ? '#6366f1' : 'var(--border)'}`,
          background: disabled ? 'var(--surface-3)' : 'var(--surface)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left', outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        <CalendarDays size={14} style={{ flexShrink: 0, color: open ? '#6366f1' : 'var(--text-muted)', transition: 'color 150ms' }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue || placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span onClick={handleClear} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          ><X size={13} /></span>
        )}
      </button>

      {open && (
        <div className="dpi-popup">
          {/* Year / Month selectors */}
          <div className="dpi-selectors">
            <select className="dpi-select" value={month.getFullYear()}
              onChange={e => { const d = new Date(month); d.setFullYear(Number(e.target.value)); setMonth(d) }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="dpi-select" value={month.getMonth()}
              onChange={e => { const d = new Date(month); d.setMonth(Number(e.target.value)); setMonth(d) }}>
              {MONTHS_EN.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>

          {/* Nav header */}
          <div className="dpi-nav-header">
            <button className="dpi-nav-btn" onClick={goToPrev}><ChevronLeft size={14} strokeWidth={2} /></button>
            <span className="dpi-month-label">
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
              root: 'dpi-root',
              months: 'dpi-months',
              month: 'dpi-month',
              month_caption: 'dpi-caption-hidden',
              caption_label: 'dpi-caption-hidden',
              nav: 'dpi-caption-hidden',
              button_previous: 'dpi-caption-hidden',
              button_next: 'dpi-caption-hidden',
              weekdays: 'dpi-weekdays',
              weekday: 'dpi-weekday',
              weeks: 'dpi-weeks',
              week: 'dpi-week',
              day: 'dpi-day',
              day_button: 'dpi-day-btn',
              selected: 'dpi-sel',
              today: 'dpi-tod',
              outside: 'dpi-out',
              disabled: 'dpi-dis',
            }}
          />

          <div className="dpi-footer">
            <button type="button" className="dpi-foot-btn" onClick={() => { onChange?.(''); setOpen(false) }}>Limpar</button>
            <button type="button" className="dpi-foot-btn" onClick={() => handleSelect(new Date())}>Hoje</button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{error}</p>}

      <style>{`
        .dpi-popup {
          position: absolute; top: calc(100% + 8px); left: 0; z-index: 9999;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
          padding: 16px;
          width: 300px;
          animation: dpiFadeIn 140ms cubic-bezier(0.16,1,0.3,1);
          font-family: var(--font-body, system-ui);
        }
        @keyframes dpiFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dpi-selectors { display: flex; gap: 8px; margin-bottom: 12px; }
        .dpi-select {
          flex: 1; padding: 7px 10px; border-radius: 10px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          color: #111827; font-size: 13px; font-weight: 500;
          cursor: pointer; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 9px center; padding-right: 28px;
          font-family: inherit; transition: border-color 120ms, box-shadow 120ms;
        }
        .dpi-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .dpi-select option { background: #fff; color: #111827; }

        .dpi-nav-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; padding: 0 2px;
        }
        .dpi-month-label { font-size: 14px; font-weight: 600; color: #111827; }
        .dpi-nav-btn {
          width: 30px; height: 30px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: #f9fafb; color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .dpi-nav-btn:hover { background: #f3f4f6; border-color: #d1d5db; color: #111827; }

        .dpi-caption-hidden { display: none !important; }
        .dpi-root { width: 100%; }
        .dpi-months { display: flex; }
        .dpi-month { width: 100%; }
        .dpi-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .dpi-weekday { text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .dpi-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dpi-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dpi-day { display: flex; align-items: center; justify-content: center; }
        .dpi-day-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: transparent;
          color: #374151; font-size: 13px; font-weight: 400;
          cursor: pointer; transition: background 100ms, color 100ms;
          display: flex; align-items: center; justify-content: center;
        }
        .dpi-day-btn:hover { background: #f3f4f6; color: #111827; }
        .dpi-sel .dpi-day-btn { background: #6366f1 !important; color: #fff !important; font-weight: 600; }
        .dpi-tod .dpi-day-btn { border: 1.5px solid #6366f1; color: #6366f1; font-weight: 600; }
        .dpi-sel.dpi-tod .dpi-day-btn { border-color: #6366f1; color: #fff; }
        .dpi-out .dpi-day-btn { color: #d1d5db; }
        .dpi-dis .dpi-day-btn { opacity: 0.3; cursor: not-allowed; }

        .dpi-footer {
          display: flex; justify-content: space-between;
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }
        .dpi-foot-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; color: #6366f1;
          font-family: inherit; padding: 4px 8px; border-radius: 8px;
          transition: background 120ms;
        }
        .dpi-foot-btn:hover { background: #eef2ff; }
      `}</style>
    </div>
  )
}
