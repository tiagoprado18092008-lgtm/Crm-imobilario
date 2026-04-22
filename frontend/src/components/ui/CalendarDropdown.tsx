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

  return (
    <div className="cd-root">
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
              ? <ChevronLeft size={14} strokeWidth={2} />
              : <ChevronRight size={14} strokeWidth={2} />,
        }}
        classNames={{
          root: 'cd-picker',
          months: 'cd-months',
          month: 'cd-month',
          month_caption: 'cd-month_caption',
          caption_label: 'cd-caption_label',
          nav: 'cd-nav',
          button_previous: 'cd-nav-btn',
          button_next: 'cd-nav-btn',
          weekdays: 'cd-weekdays',
          weekday: 'cd-weekday',
          weeks: 'cd-weeks',
          week: 'cd-week',
          day: 'cd-day',
          day_button: 'cd-day_button',
          selected: 'cd-selected',
          today: 'cd-today',
          outside: 'cd-outside',
          disabled: 'cd-disabled',
        }}
      />

      {selected.length > 0 && (
        <div className="cd-badges">
          {selected
            .sort((a, b) => a.getTime() - b.getTime())
            .map(d => (
              <span key={d.toISOString()} className="cd-badge">
                {format(d, 'dd MMM', { locale: pt })}
                <button onClick={() => removeDate(d)} className="cd-badge-remove">
                  <X size={10} />
                </button>
              </span>
            ))}
        </div>
      )}

      {onConfirm && (
        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          className={`cd-confirm${selected.length > 0 ? ' cd-confirm--active' : ''}`}
        >
          {confirmLabel}
        </button>
      )}

      <style>{`
        .cd-root {
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset;
          font-family: var(--font-body, system-ui);
          width: 280px;
          user-select: none;
        }
        .cd-months { display: flex; }
        .cd-month { width: 100%; }
        .cd-month_caption {
          display: flex; align-items: center; justify-content: center;
          position: relative; height: 36px; margin-bottom: 8px;
        }
        .cd-caption_label {
          font-size: 14px; font-weight: 600;
          color: #f1f5f9;
          text-transform: capitalize; letter-spacing: -0.01em;
        }
        .cd-nav {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          height: 36px; pointer-events: none;
        }
        .cd-nav-btn {
          pointer-events: all;
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 150ms;
        }
        .cd-nav-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #f1f5f9;
          border-color: rgba(255,255,255,0.2);
        }
        .cd-weekdays {
          display: grid; grid-template-columns: repeat(7, 1fr);
          margin-bottom: 6px;
        }
        .cd-weekday {
          text-align: center; font-size: 10px; font-weight: 600;
          color: #475569; padding: 4px 0;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .cd-weeks { display: flex; flex-direction: column; gap: 2px; }
        .cd-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cd-day { display: flex; align-items: center; justify-content: center; }
        .cd-day_button {
          width: 34px; height: 34px; border-radius: 8px;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 13px; font-weight: 400;
          cursor: pointer;
          transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .cd-day_button:hover { background: rgba(255,255,255,0.08); color: #f1f5f9; }
        .cd-selected .cd-day_button {
          background: #2563eb !important;
          color: #fff !important;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(37,99,235,0.4);
        }
        .cd-today .cd-day_button::after {
          content: '';
          position: absolute; bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 3px; height: 3px; border-radius: 50%;
          background: #60a5fa;
        }
        .cd-selected.cd-today .cd-day_button::after { background: rgba(255,255,255,0.7); }
        .cd-outside .cd-day_button { color: #334155; }
        .cd-disabled .cd-day_button { opacity: 0.2; cursor: not-allowed; }

        .cd-badges {
          display: flex; flex-wrap: wrap; gap: 5px;
          margin-top: 14px; padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .cd-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(37,99,235,0.2); color: #93c5fd;
          border: 1px solid rgba(37,99,235,0.3);
          border-radius: 20px; padding: 3px 9px;
          font-size: 11px; font-weight: 600;
        }
        .cd-badge-remove {
          background: none; border: none; cursor: pointer;
          padding: 0; color: #60a5fa; display: flex; opacity: 0.7;
          transition: opacity 120ms;
        }
        .cd-badge-remove:hover { opacity: 1; }

        .cd-confirm {
          margin-top: 14px; width: 100%; padding: 10px;
          border-radius: 10px; border: none;
          background: rgba(255,255,255,0.06);
          color: #475569; font-size: 13px; font-weight: 600;
          cursor: default; transition: all 150ms;
          font-family: inherit;
        }
        .cd-confirm--active {
          background: #2563eb; color: #fff;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(37,99,235,0.4);
        }
        .cd-confirm--active:hover { background: #1d4ed8; }
      `}</style>
    </div>
  )
}
