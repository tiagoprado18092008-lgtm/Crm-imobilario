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

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i)

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

  const goToPrev = () => { const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d) }
  const goToNext = () => { const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d) }

  return (
    <div className="cd-root">
      {/* Year / Month selectors */}
      <div className="cd-selectors">
        <select className="cd-select" value={month.getFullYear()}
          onChange={e => { const d = new Date(month); d.setFullYear(Number(e.target.value)); setMonth(d) }}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="cd-select" value={month.getMonth()}
          onChange={e => { const d = new Date(month); d.setMonth(Number(e.target.value)); setMonth(d) }}>
          {MONTHS_PT.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {/* Nav header */}
      <div className="cd-nav-header">
        <button className="cd-nav-btn" onClick={goToPrev}><ChevronLeft size={14} strokeWidth={2} /></button>
        <span className="cd-month-label">
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
        components={{ Chevron: () => null }}
        classNames={{
          root: 'cd-picker',
          months: 'cd-months',
          month: 'cd-month',
          month_caption: 'cd-hidden',
          caption_label: 'cd-hidden',
          nav: 'cd-hidden',
          button_previous: 'cd-hidden',
          button_next: 'cd-hidden',
          weekdays: 'cd-weekdays',
          weekday: 'cd-weekday',
          weeks: 'cd-weeks',
          week: 'cd-week',
          day: 'cd-day',
          day_button: 'cd-day-btn',
          selected: 'cd-sel',
          today: 'cd-tod',
          outside: 'cd-out',
          disabled: 'cd-dis',
        }}
      />

      {/* Footer */}
      <div className="cd-footer">
        {selected.length === 0 ? (
          <span className="cd-no-dates">Nenhuma data selecionada</span>
        ) : (
          <div className="cd-badges">
            {selected
              .sort((a, b) => a.getTime() - b.getTime())
              .map(d => (
                <span key={d.toISOString()} className="cd-badge">
                  {format(d, 'dd MMM', { locale: pt })}
                  <button onClick={() => removeDate(d)} className="cd-badge-remove"><X size={10} /></button>
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
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
          font-family: var(--font-body, system-ui);
          width: 300px;
          user-select: none;
        }
        .cd-selectors { display: flex; gap: 8px; margin-bottom: 12px; }
        .cd-select {
          flex: 1; padding: 7px 10px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: #f9fafb;
          color: #111827; font-size: 13px; font-weight: 500;
          cursor: pointer; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 9px center; padding-right: 28px;
          font-family: inherit; transition: border-color 120ms, box-shadow 120ms;
        }
        .cd-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .cd-select option { background: #fff; color: #111827; }

        .cd-nav-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; padding: 0 2px;
        }
        .cd-month-label { font-size: 14px; font-weight: 600; color: #111827; }
        .cd-nav-btn {
          width: 30px; height: 30px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: #f9fafb; color: #6b7280;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 150ms;
        }
        .cd-nav-btn:hover { background: #f3f4f6; border-color: #d1d5db; color: #111827; }

        .cd-hidden { display: none !important; }
        .cd-picker { width: 100%; }
        .cd-months { display: flex; }
        .cd-month { width: 100%; }
        .cd-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .cd-weekday { text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .cd-weeks { display: flex; flex-direction: column; gap: 2px; }
        .cd-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cd-day { display: flex; align-items: center; justify-content: center; }
        .cd-day-btn {
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: transparent;
          color: #374151; font-size: 13px; font-weight: 400;
          cursor: pointer; transition: background 100ms, color 100ms;
          display: flex; align-items: center; justify-content: center;
        }
        .cd-day-btn:hover { background: #f3f4f6; color: #111827; }
        .cd-sel .cd-day-btn { background: #6366f1 !important; color: #fff !important; font-weight: 600; }
        .cd-tod .cd-day-btn { border: 1.5px solid #6366f1; color: #6366f1; font-weight: 600; }
        .cd-sel.cd-tod .cd-day-btn { border-color: #6366f1; color: #fff; }
        .cd-out .cd-day-btn { color: #d1d5db; }
        .cd-dis .cd-day-btn { opacity: 0.3; cursor: not-allowed; }

        .cd-footer {
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid #f3f4f6;
          min-height: 24px;
        }
        .cd-no-dates { font-size: 12px; color: #9ca3af; }
        .cd-badges { display: flex; flex-wrap: wrap; gap: 5px; }
        .cd-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: #eef2ff; color: #6366f1;
          border: 1px solid #c7d2fe;
          border-radius: 20px; padding: 3px 9px;
          font-size: 11px; font-weight: 600;
        }
        .cd-badge-remove {
          background: none; border: none; cursor: pointer;
          padding: 0; color: #6366f1; display: flex; opacity: 0.6;
          transition: opacity 120ms;
        }
        .cd-badge-remove:hover { opacity: 1; }

        .cd-confirm {
          margin-top: 12px; width: 100%; padding: 10px;
          border-radius: 10px; border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          color: #9ca3af; font-size: 13px; font-weight: 600;
          cursor: default; transition: all 150ms;
          font-family: inherit;
        }
        .cd-confirm--active {
          background: #6366f1; color: #fff; border-color: #6366f1;
          cursor: pointer; box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        }
        .cd-confirm--active:hover { background: #4f46e5; border-color: #4f46e5; }
      `}</style>
    </div>
  )
}
