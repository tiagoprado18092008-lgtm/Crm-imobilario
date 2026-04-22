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

// Time slots: 08:00 to 20:00 in 1h increments
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 8
  return `${String(h).padStart(2, '0')}:00`
})

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

  // Selected time as "HH:mm"
  const selectedTime = selected
    ? `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
    : ''

  // Sync month when external value changes
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
    // Preserve time if already selected
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
          <div>
            <DayPicker
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={handleDaySelect}
              locale={pt}
              showOutsideDays
              components={{
                Chevron: ({ orientation }: { orientation?: string }) =>
                  orientation === 'left'
                    ? <ChevronLeft size={14} strokeWidth={2} />
                    : <ChevronRight size={14} strokeWidth={2} />,
              }}
              classNames={{
                root: 'dtp-picker',
                months: 'dtp-months',
                month: 'dtp-month',
                month_caption: 'dtp-month_caption',
                caption_label: 'dtp-caption_label',
                nav: 'dtp-nav',
                button_previous: 'dtp-nav-btn',
                button_next: 'dtp-nav-btn',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
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

            {/* Custom time input */}
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
        .dtp-months { display: flex; }
        .dtp-month { width: 232px; }
        .dtp-month_caption {
          display: flex; align-items: center; justify-content: center;
          position: relative; height: 34px; margin-bottom: 8px;
        }
        .dtp-caption_label {
          font-size: 13px; font-weight: 600; color: #f1f5f9;
          text-transform: capitalize; letter-spacing: -0.01em;
        }
        .dtp-nav {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          height: 34px; pointer-events: none;
        }
        .dtp-nav-btn {
          pointer-events: all;
          width: 26px; height: 26px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .dtp-nav-btn:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }
        .dtp-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .dtp-weekday {
          text-align: center; font-size: 9.5px; font-weight: 600;
          color: #475569; padding: 4px 0;
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .dtp-weeks { display: flex; flex-direction: column; gap: 2px; }
        .dtp-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .dtp-day { display: flex; align-items: center; justify-content: center; }
        .dtp-day_button {
          width: 30px; height: 30px; border-radius: 7px;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 12px; font-weight: 400;
          cursor: pointer; transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .dtp-day_button:hover { background: rgba(255,255,255,0.08); color: #f1f5f9; }
        .dtp-selected .dtp-day_button {
          background: #2563eb !important; color: #fff !important;
          font-weight: 700; box-shadow: 0 2px 8px rgba(37,99,235,0.4);
        }
        .dtp-today .dtp-day_button::after {
          content: ''; position: absolute; bottom: 3px; left: 50%;
          transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%; background: #60a5fa;
        }
        .dtp-selected.dtp-today .dtp-day_button::after { background: rgba(255,255,255,0.7); }
        .dtp-outside .dtp-day_button { color: #334155; }
        .dtp-disabled .dtp-day_button { opacity: 0.2; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
