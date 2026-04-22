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
        }}>
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={handleSelect}
            locale={pt}
            showOutsideDays
            components={{
              Chevron: ({ orientation }: { orientation?: string }) =>
                orientation === 'left'
                  ? <ChevronLeft size={14} strokeWidth={2} />
                  : <ChevronRight size={14} strokeWidth={2} />,
            }}
            classNames={{
              root: 'dpi-picker',
              months: 'dpi-months',
              month: 'dpi-month',
              month_caption: 'dpi-month_caption',
              caption_label: 'dpi-caption_label',
              nav: 'dpi-nav',
              button_previous: 'dpi-nav-btn',
              button_next: 'dpi-nav-btn',
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
        .dpi-months { display: flex; }
        .dpi-month { width: 248px; }
        .dpi-month_caption {
          display: flex; align-items: center; justify-content: center;
          position: relative; height: 34px; margin-bottom: 8px;
        }
        .dpi-caption_label {
          font-size: 13.5px; font-weight: 600; color: #f1f5f9;
          text-transform: capitalize; letter-spacing: -0.01em;
        }
        .dpi-nav {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          height: 34px; pointer-events: none;
        }
        .dpi-nav-btn {
          pointer-events: all;
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .dpi-nav-btn:hover {
          background: rgba(255,255,255,0.1); color: #f1f5f9;
          border-color: rgba(255,255,255,0.2);
        }
        .dpi-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .dpi-weekday {
          text-align: center; font-size: 10px; font-weight: 600;
          color: #475569; padding: 4px 0;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .dpi-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dpi-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dpi-day { display: flex; align-items: center; justify-content: center; }
        .dpi-day_button {
          width: 32px; height: 32px; border-radius: 8px;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 12.5px; font-weight: 400;
          cursor: pointer; transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .dpi-day_button:hover { background: rgba(255,255,255,0.08); color: #f1f5f9; }
        .dpi-selected .dpi-day_button {
          background: #2563eb !important; color: #fff !important;
          font-weight: 700; box-shadow: 0 2px 8px rgba(37,99,235,0.4);
        }
        .dpi-today .dpi-day_button::after {
          content: ''; position: absolute; bottom: 3px; left: 50%;
          transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%; background: #60a5fa;
        }
        .dpi-selected.dpi-today .dpi-day_button::after { background: rgba(255,255,255,0.7); }
        .dpi-outside .dpi-day_button { color: #334155; }
        .dpi-disabled .dpi-day_button { opacity: 0.2; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
