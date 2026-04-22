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

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i)

export const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  mode = 'multiple',
  onSelect,
  confirmLabel = 'Confirm',
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

  const setYear = (y: number) => {
    const d = new Date(month)
    d.setFullYear(y)
    setMonth(d)
  }

  const setMonthIndex = (m: number) => {
    const d = new Date(month)
    d.setMonth(m)
    setMonth(d)
  }

  return (
    <div className="cd-root">
      {/* Year / Month selectors */}
      <div className="cd-selectors">
        <select
          className="cd-select"
          value={month.getFullYear()}
          onChange={e => setYear(Number(e.target.value))}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="cd-select"
          value={month.getMonth()}
          onChange={e => setMonthIndex(Number(e.target.value))}
        >
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {/* Month header with navigation */}
      <div className="cd-month_header">
        <button className="cd-nav-btn" onClick={goToPrev}><ChevronLeft size={14} strokeWidth={2} /></button>
        <span className="cd-caption_label">
          {format(month, 'MMMM yyyy', { locale: pt }).replace(/^\w/, c => c.toUpperCase())}
        </span>
        <button className="cd-nav-btn" onClick={goToNext}><ChevronRight size={14} strokeWidth={2} /></button>
      </div>

      <DayPicker
        mode="multiple"
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onDayClick={handleDayClick}
        showOutsideDays
        components={{
          Chevron: () => null,
        }}
        classNames={{
          root: 'cd-picker',
          months: 'cd-months',
          month: 'cd-month',
          month_caption: 'cd-month_caption_hidden',
          caption_label: 'cd-caption_hidden',
          nav: 'cd-nav_hidden',
          button_previous: 'cd-nav_hidden',
          button_next: 'cd-nav_hidden',
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

      {/* Footer */}
      <div className="cd-footer">
        {selected.length === 0 ? (
          <span className="cd-no-dates">No dates selected</span>
        ) : (
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
      </div>

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
          padding: 16px 16px 14px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset;
          font-family: var(--font-body, system-ui);
          width: 290px;
          user-select: none;
        }

        /* Year / Month selects */
        .cd-selectors {
          display: flex; gap: 8px; margin-bottom: 12px;
        }
        .cd-select {
          flex: 1; padding: 6px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #e2e8f0; font-size: 13px; font-weight: 500;
          cursor: pointer; outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 26px;
          font-family: inherit;
          transition: border-color 120ms;
        }
        .cd-select:focus { border-color: rgba(255,255,255,0.25); }
        .cd-select option { background: #1e2535; color: #e2e8f0; }

        /* Month header */
        .cd-month_header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; padding: 0 2px;
        }
        .cd-caption_label {
          font-size: 14px; font-weight: 600; color: #f1f5f9;
          letter-spacing: -0.01em;
        }
        .cd-nav-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 150ms;
        }
        .cd-nav-btn:hover {
          background: rgba(255,255,255,0.1); color: #f1f5f9;
          border-color: rgba(255,255,255,0.2);
        }

        /* DayPicker overrides — hide internal header/nav */
        .cd-month_caption_hidden { display: none !important; }
        .cd-caption_hidden { display: none !important; }
        .cd-nav_hidden { display: none !important; }

        .cd-months { display: flex; }
        .cd-month { width: 100%; }
        .cd-weekdays {
          display: grid; grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
        }
        .cd-weekday {
          text-align: center; font-size: 11px; font-weight: 600;
          color: #64748b; padding: 4px 0;
        }
        .cd-weeks { display: flex; flex-direction: column; gap: 2px; }
        .cd-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cd-day { display: flex; align-items: center; justify-content: center; }
        .cd-day_button {
          width: 34px; height: 34px; border-radius: 50%;
          border: none; background: transparent;
          color: #cbd5e1; font-size: 13px; font-weight: 400;
          cursor: pointer;
          transition: background 110ms, color 110ms;
          position: relative; display: flex; align-items: center; justify-content: center;
        }
        .cd-day_button:hover { background: rgba(255,255,255,0.09); color: #f1f5f9; }
        .cd-selected .cd-day_button {
          background: #2563eb !important;
          color: #fff !important;
          font-weight: 600;
        }
        .cd-today .cd-day_button {
          border: 1px solid rgba(255,255,255,0.25);
          color: #f1f5f9;
        }
        .cd-selected.cd-today .cd-day_button { border-color: #2563eb; }
        .cd-outside .cd-day_button { color: #334155; }
        .cd-disabled .cd-day_button { opacity: 0.2; cursor: not-allowed; }

        /* Footer */
        .cd-footer {
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.07);
          min-height: 28px;
        }
        .cd-no-dates {
          font-size: 12px; color: #475569;
        }
        .cd-badges {
          display: flex; flex-wrap: wrap; gap: 5px;
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
          margin-top: 12px; width: 100%; padding: 10px;
          border-radius: 10px; border: none;
          background: rgba(255,255,255,0.08);
          color: #64748b; font-size: 13px; font-weight: 600;
          cursor: default; transition: all 150ms;
          font-family: inherit;
        }
        .cd-confirm--active {
          background: #2563eb; color: #fff;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(37,99,235,0.35);
        }
        .cd-confirm--active:hover { background: #1d4ed8; }
      `}</style>
    </div>
  )
}
