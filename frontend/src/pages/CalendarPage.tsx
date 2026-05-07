import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getTasks, createTask, updateTask } from '../api/tasks.api'
import { getContacts } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import { listCalendarEvents, getCalendarStatus, syncCalendar } from '../api/calendar.api'
import { useAuthStore } from '../store/auth.store'
import { usePermissions } from '../hooks/usePermissions'
import type { Task, Contact, User } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CustomSelect } from '../components/ui/CustomSelect'
import { DatePickerInput } from '../components/ui/DatePickerInput'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { CalendarView } from '../components/calendar/CalendarView'
import { EventModal } from '../components/calendar/EventModal'
import { SyncStatusBadge } from '../components/calendar/SyncStatusBadge'
import { useUIStore } from '../store/ui.store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
  assignedToId: z.string().min(1, 'Responsável obrigatório'),
  contactId: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)',
}

function TaskForm({
  task, contacts, users, defaultDate, onSaved, onCancel,
}: {
  task?: Task; contacts: Contact[]; users: User[]; defaultDate?: string;
  onSaved: () => void; onCancel: () => void;
}) {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'PENDING',
      priority: task?.priority ?? 'MEDIUM',
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : (defaultDate ?? ''),
      assignedToId: task?.assignedToId ?? user?.id ?? '',
      contactId: task?.contactId ?? '',
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        dueDate: data.dueDate || undefined,
        contactId: data.contactId || undefined,
      }
      if (task) {
        await updateTask(task.id, payload)
        showToast('Tarefa atualizada', 'success')
      } else {
        await createTask(payload)
        showToast('Tarefa criada', 'success')
      }
      onSaved()
    } catch {
      showToast('Erro ao guardar tarefa', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Título *</label>
        <input style={inputStyle} {...register('title')} placeholder="Título da tarefa" />
        {errors.title && <span style={{ color: '#ef4444', fontSize: 11 }}>{errors.title.message}</span>}
      </div>
      <div>
        <label style={labelStyle}>Descrição</label>
        <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} {...register('description')} placeholder="Descrição opcional" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <CustomSelect
            label="Estado"
            value={watch('status')}
            onChange={v => setValue('status', v as any, { shouldValidate: true })}
            options={[
              { value: 'PENDING', label: 'Pendente' },
              { value: 'IN_PROGRESS', label: 'Em curso' },
              { value: 'COMPLETED', label: 'Concluída' },
              { value: 'CANCELLED', label: 'Cancelada' },
            ]}
          />
        </div>
        <div>
          <CustomSelect
            label="Prioridade"
            value={watch('priority')}
            onChange={v => setValue('priority', v as any, { shouldValidate: true })}
            options={[
              { value: 'LOW', label: 'Baixa' },
              { value: 'MEDIUM', label: 'Média' },
              { value: 'HIGH', label: 'Alta' },
            ]}
          />
        </div>
      </div>
      <div>
        <DatePickerInput
          label="Data limite"
          value={watch('dueDate')}
          onChange={v => setValue('dueDate', v, { shouldValidate: true })}
        />
      </div>
      <div>
        <CustomSelect
          label="Responsável *"
          value={watch('assignedToId')}
          onChange={v => setValue('assignedToId', v, { shouldValidate: true })}
          placeholder="Selecionar..."
          options={users.map(u => ({ value: u.id, label: u.name }))}
          searchable
          error={errors.assignedToId?.message}
        />
      </div>
      <div>
        <CustomSelect
          label="Contacto"
          value={watch('contactId') || ''}
          onChange={v => setValue('contactId', v, { shouldValidate: true })}
          placeholder="Nenhum"
          options={contacts.map(c => ({ value: c.id, label: c.name }))}
          searchable
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'A guardar...' : task ? 'Guardar' : 'Criar Tarefa'}</Button>
      </div>
    </form>
  )
}

export const CalendarPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { isAgencyAdmin } = usePermissions()
  const { user } = useAuthStore()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [calendarDefaultDate, setCalendarDefaultDate] = useState<string | undefined>()
  const [showEventModal, setShowEventModal] = useState(false)
  const [editEvent, setEditEvent] = useState<any | undefined>()
  const [defaultEventStart, setDefaultEventStart] = useState<Date | undefined>()
  const [syncStatus, setSyncStatus] = useState<{ lastSyncedAt?: string } | null>(null)
  const [syncing, setSyncing] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTasks({ limit: 500 })
      const d = res.data
      setAllTasks(Array.isArray(d) ? d : d.data || [])
    } catch {
      showToast('Erro ao carregar tarefas', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const params: any = {}
      if (selectedUserId) params.userId = selectedUserId
      const res = await listCalendarEvents(params)
      setCalendarEvents(res.data || [])
    } catch {}
  }, [selectedUserId])

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await getCalendarStatus()
      const integrations: any[] = res.data || []
      const active = integrations.find(i => i.isActive && i.lastSyncedAt)
      setSyncStatus(active ? { lastSyncedAt: active.lastSyncedAt } : null)
    } catch {}
  }, [])

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await syncCalendar()
      await fetchCalendarEvents()
      await fetchSyncStatus()
    } catch {} finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchCalendarEvents()
    fetchSyncStatus()
    Promise.allSettled([getContacts({ limit: 500 }), getUsers()]).then(([cRes, uRes]) => {
      if (cRes.status === 'fulfilled') {
        const d = cRes.value.data
        setContacts(Array.isArray(d) ? d : d.data || [])
      }
      if (uRes.status === 'fulfilled') {
        const d = uRes.value.data
        setUsers(Array.isArray(d) ? d : d.data || [])
      }
    })
  }, [fetchTasks, fetchCalendarEvents, fetchSyncStatus, selectedUserId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Sync status + settings strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {(user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN' || user?.role === 'TEAM_LEADER') && users.length > 0 && (
            <CustomSelect
              value={selectedUserId || ''}
              onChange={v => setSelectedUserId(v || null)}
              placeholder="Todos os consultores"
              options={users.map((u: any) => ({ value: u.id, label: u.name }))}
              searchable
              size="sm"
            />
          )}
          {syncStatus && (
            <SyncStatusBadge
              lastSyncedAt={syncStatus.lastSyncedAt}
              syncing={syncing}
              onRetry={handleSyncNow}
            />
          )}
        </div>
        <Link to="/calendar/settings" style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
          borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-secondary)',
          textDecoration: 'none', fontSize: 12, fontWeight: 600,
        }}>
          <Settings size={13} /> Definições
        </Link>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 700 }}>
          <CalendarView
            tasks={allTasks}
            calendarEvents={calendarEvents}
            teamUsers={isAgencyAdmin ? users.map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })) : []}
            onTaskClick={(task) => { setEditTask(task); setCalendarDefaultDate(undefined); setShowModal(true) }}
            onEventClick={(event) => { setEditEvent(event); setShowEventModal(true) }}
            onCreateOnDate={(date) => {
              const pad = (n: number) => String(n).padStart(2, '0')
              const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
              setEditTask(undefined); setCalendarDefaultDate(dateStr); setShowModal(true)
            }}
            onCreateEventOnDate={(date) => {
              setEditEvent(undefined); setDefaultEventStart(date); setShowEventModal(true)
            }}
          />
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTask ? 'Editar Tarefa' : 'Nova Tarefa'}
      >
        <TaskForm
          task={editTask}
          contacts={contacts}
          users={users}
          defaultDate={calendarDefaultDate}
          onSaved={() => { setShowModal(false); fetchTasks() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {showEventModal && (
        <EventModal
          event={editEvent}
          defaultStart={defaultEventStart}
          onClose={() => setShowEventModal(false)}
          onSaved={() => { setShowEventModal(false); fetchCalendarEvents() }}
        />
      )}
    </div>
  )
}
