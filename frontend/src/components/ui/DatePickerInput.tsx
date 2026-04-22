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

  // Sync month when value changes externally
  useEffect(() => {
    if (value && isValid(parse(value, 'yyyy-MM-dd', new Date()))) {
      setMonth(parse(value, 'yyyy-MM-dd', new Date()))
    }
  }, [value])

  // Close on outside click
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
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, ...style }}
    >
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
          {label}
          {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          fontSize: 13,
          borderRadius: 10,
          border: `1.5px solid ${error ? '#f87171' : open ? 'var(--accent)' : 'var(--border)'}`,
          background: disabled ? 'var(--surface-3)' : 'var(--surface)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(46,107,230,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'border-color 150ms, box-shadow 150ms',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        <CalendarDays size={14} style={{ flexShrink: 0, color: open ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 150ms' }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue || placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            onClick={handleClear}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--danger)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '14px',
            animation: 'dpFadeIn 130ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
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
                  ? <ChevronLeft size={14} />
                  : <ChevronRight size={14} />,
            }}
            classNames={{
              root: 'dpk-root',
              months: 'dpk-months',
              month: 'dpk-month',
              month_caption: 'dpk-month_caption',
              caption_label: 'dpk-caption_label',
              nav: 'dpk-nav',
              button_previous: 'dpk-btn-nav',
              button_next: 'dpk-btn-nav',
              weekdays: 'dpk-weekdays',
              weekday: 'dpk-weekday',
              weeks: 'dpk-weeks',
              week: 'dpk-week',
              day: 'dpk-day',
              day_button: 'dpk-day_button',
              selected: 'dpk-selected',
              today: 'dpk-today',
              outside: 'dpk-outside',
              disabled: 'dpk-disabled',
            }}
          />
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{error}</p>}

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dpk-months { display: flex; }
        .dpk-month { width: 252px; }
        .dpk-month_caption {
          display: flex; align-items: center; justify-content: center;
          position: relative; height: 34px; margin-bottom: 8px;
        }
        .dpk-caption_label {
          font-size: 13.5px; font-weight: 600;
          color: var(--text-primary); font-family: var(--font-body);
          text-transform: capitalize;
        }
        .dpk-nav {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          height: 34px; pointer-events: none;
        }
        .dpk-btn-nav {
          pointer-events: all;
          width: 28px; height: 28px; border-radius: 8px;
          border: 1.5px solid var(--border);
          background: var(--surface-2);
          color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: border-color 140ms, background 140ms, color 140ms;
        }
        .dpk-btn-nav:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
        }
        .dpk-weekdays {
          display: grid; grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
        }
        .dpk-weekday {
          text-align: center; font-size: 10px; font-weight: 700;
          color: var(--text-muted); padding: 3px 0;
          text-transform: uppercase; letter-spacing: 0.07em;
          font-family: var(--font-body);
        }
        .dpk-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dpk-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dpk-day { display: flex; align-items: center; justify-content: center; }
        .dpk-day_button {
          width: 32px; height: 32px; border-radius: 8px;
          border: none; background: transparent;
          color: var(--text-primary); font-size: 12.5px; font-weight: 400;
          cursor: pointer; font-family: var(--font-body);
          transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .dpk-day_button:hover { background: var(--surface-3); }
        .dpk-selected .dpk-day_button {
          background: var(--accent) !important;
          color: #fff !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(46,107,230,0.3);
        }
        .dpk-today .dpk-day_button::after {
          content: '';
          position: absolute; bottom: 3px; left: 50%;
          transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%;
          background: var(--accent);
        }
        .dpk-selected .dpk-today .dpk-day_button::after { background: #fff; }
        .dpk-outside .dpk-day_button { color: var(--text-muted); opacity: 0.35; }
        .dpk-disabled .dpk-day_button { opacity: 0.2; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
