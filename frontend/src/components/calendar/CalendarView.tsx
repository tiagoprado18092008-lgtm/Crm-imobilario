import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../../types'
import { TASK_STATUS_LABELS } from '../../utils/constants'
import { Badge } from '../ui/Badge'

interface CalendarViewProps {
  tasks: Task[]
}

const priorityDotColor: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#22c55e'
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const goToPrev = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNext = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(null) }

  const tasksByDay: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!task.dueDate) continue
    const d = new Date(task.dueDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      if (!tasksByDay[key]) tasksByDay[key] = []
      tasksByDay[key].push(task)
    }
  }

  const selectedTasks = selectedDate ? (tasksByDay[selectedDate] || []) : []

  const today = new Date()
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold min-w-40 text-center" style={{ color: 'var(--text-primary)' }}>
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', cursor: 'pointer' }}
        >
          Hoje
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-xs font-semibold text-center py-2" style={{ color: 'var(--text-secondary)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for start padding */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="h-20 rounded-lg" style={{ background: 'var(--bg-page)' }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayKey = day.toString()
          const dayTasks = tasksByDay[dayKey] || []
          const isSelected = selectedDate === dayKey
          const todayDay = isToday(day)

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : dayKey)}
              className="h-20 rounded-lg p-1.5 cursor-pointer transition-colors relative"
              style={{
                border: `1px solid ${todayDay ? '#6366f1' : isSelected ? '#818cf8' : 'var(--border-color)'}`,
                background: todayDay
                  ? 'rgba(99,102,241,0.08)'
                  : isSelected
                  ? 'rgba(99,102,241,0.12)'
                  : 'var(--bg-card)',
              }}
            >
              <span
                className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                style={{
                  background: todayDay ? '#6366f1' : 'transparent',
                  color: todayDay ? '#fff' : 'var(--text-primary)',
                }}
              >
                {day}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {dayTasks.slice(0, 4).map((task) => (
                    <span
                      key={task.id}
                      className="w-2 h-2 rounded-full"
                      style={{ background: priorityDotColor[task.priority] }}
                      title={task.title}
                    />
                  ))}
                  {dayTasks.length > 4 && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{dayTasks.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Day Tasks */}
      {selectedDate && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Tarefas para {selectedDate} de {MONTH_NAMES[month]}
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({selectedTasks.length} {selectedTasks.length === 1 ? 'tarefa' : 'tarefas'})
            </span>
          </h4>
          {selectedTasks.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem tarefas para este dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--hover-bg)' }}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: priorityDotColor[task.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                    {task.contact && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{task.contact.name}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      task.status === 'COMPLETED' ? 'success' :
                      task.status === 'CANCELLED' ? 'danger' :
                      task.status === 'IN_PROGRESS' ? 'info' : 'default'
                    }
                    small
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
