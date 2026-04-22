import React, { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

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
  const [selected, setSelected] = useState<Date[]>([])
  const [month, setMonth] = useState(new Date())

  const handleDayClick = (day: Date) => {
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

  const selectedSet = new Set(selected.map(d => format(d, 'yyyy-MM-dd')))

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: 16,
      padding: '16px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
      fontFamily: 'var(--font-body)',
      width: 300,
      userSelect: 'none',
    }}>
      <DayPicker
        mode="multiple"
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onDayClick={handleDayClick}
        locale={pt}
        showOutsideDays
        components={{
          Chevron: ({ orientation }) =>
            orientation === 'left'
              ? <ChevronLeft size={15} />
              : <ChevronRight size={15} />,
        }}
        classNames={{
          root: 'rdp-root',
          months: 'rdp-months',
          month: 'rdp-month',
          month_caption: 'rdp-month_caption',
          caption_label: 'rdp-caption_label',
          nav: 'rdp-nav',
          button_previous: 'rdp-button_previous',
          button_next: 'rdp-button_next',
          weekdays: 'rdp-weekdays',
          weekday: 'rdp-weekday',
          weeks: 'rdp-weeks',
          week: 'rdp-week',
          day: 'rdp-day',
          day_button: 'rdp-day_button',
          selected: 'rdp-selected',
          today: 'rdp-today',
          outside: 'rdp-outside',
          disabled: 'rdp-disabled',
        }}
      />

      {/* Selected badges */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          marginTop: 12, paddingTop: 12,
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
                  border: '1px solid rgba(46,107,230,0.18)',
                }}
              >
                {format(d, 'dd MMM yyyy', { locale: pt })}
                <button
                  onClick={() => removeDate(d)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', display: 'flex', opacity: 0.7 }}
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
            marginTop: 12, width: '100%', padding: '10px 16px', borderRadius: 10,
            background: selected.length > 0 ? 'var(--accent)' : 'var(--surface-3)',
            color: selected.length > 0 ? '#fff' : 'var(--text-muted)',
            border: 'none', cursor: selected.length > 0 ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            transition: 'background 160ms',
            boxShadow: selected.length > 0 ? '0 2px 8px rgba(46,107,230,0.25)' : 'none',
          }}
        >
          {confirmLabel}
        </button>
      )}

      <style>{`
        .rdp-root { --rdp-accent: var(--accent); }
        .rdp-months { display: flex; }
        .rdp-month { width: 100%; }
        .rdp-month_caption {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 36px;
          margin-bottom: 6px;
        }
        .rdp-caption_label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-body);
          text-transform: capitalize;
        }
        .rdp-nav {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 36px;
          pointer-events: none;
        }
        .rdp-button_previous,
        .rdp-button_next {
          pointer-events: all;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: var(--surface-2);
          color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: border-color 140ms, background 140ms;
        }
        .rdp-button_previous:hover,
        .rdp-button_next:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
        }
        .rdp-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
        }
        .rdp-weekday {
          text-align: center;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: var(--font-body);
        }
        .rdp-weeks {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .rdp-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .rdp-day {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rdp-day_button {
          width: 34px; height: 34px;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 12.5px;
          font-weight: 400;
          cursor: pointer;
          font-family: var(--font-body);
          transition: background 120ms, color 120ms;
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .rdp-day_button:hover {
          background: var(--surface-3);
        }
        .rdp-selected .rdp-day_button {
          background: var(--accent) !important;
          color: #fff !important;
          font-weight: 600;
        }
        .rdp-today .rdp-day_button:not(.rdp-selected .rdp-day_button) {
          font-weight: 700;
        }
        .rdp-today .rdp-day_button::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--accent);
        }
        .rdp-selected .rdp-today .rdp-day_button::after {
          background: #fff;
        }
        .rdp-outside .rdp-day_button {
          color: var(--text-muted);
          opacity: 0.4;
        }
        .rdp-disabled .rdp-day_button {
          opacity: 0.25;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
