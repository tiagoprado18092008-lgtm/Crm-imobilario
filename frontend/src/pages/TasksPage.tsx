import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasks.api'
import { getContacts } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import { useAuthStore } from '../store/auth.store'
import type { Task, Contact, User } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CustomSelect } from '../components/ui/CustomSelect'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { CalendarView } from '../components/calendar/CalendarView'
import { useUIStore } from '../store/ui.store'
import { formatDate } from '../utils/formatters'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../utils/constants'
import { isOverdue } from '../utils/formatters'

const taskSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
  assignedToId: z.string().min(1, 'Responsável obrigatório'),
  contactId: z.string().optional()
})

type TaskFormData = z.infer<typeof taskSchema>

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:     { bg: '#f1f5f9', color: '#64748b' },
  IN_PROGRESS: { bg: '#eff6ff', color: '#2563eb' },
  COMPLETED:   { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626' },
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  LOW:    { bg: '#f1f5f9', color: '#64748b' },
  MEDIUM: { bg: '#fffbeb', color: '#d97706' },
  HIGH:   { bg: '#fef2f2', color: '#dc2626' },
}

function Pill({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: bg, color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

interface TaskFormProps {
  task?: Task
  onSuccess: (saved: Task) => void
  onCancel: () => void
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    Promise.all([getContacts({ limit: 200 }), getUsers()])
      .then(([cRes, uRes]) => {
        const cd = cRes.data; setContacts(Array.isArray(cd) ? cd : cd.data || [])
        const ud = uRes.data; setUsers(Array.isArray(ud) ? ud : ud.data || [])
        if (!task && currentUser?.id) setFormValue('assignedToId', currentUser.id)
      })
      .catch(() => {})
  }, [])

  const { register, handleSubmit, setValue: setFormValue, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'PENDING',
      priority: task?.priority || 'MEDIUM',
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedToId: task?.assignedToId || currentUser?.id || '',
      contactId: task?.contactId || ''
    }
  })

  const onSubmit = async (data: TaskFormData) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        dueDate: data.dueDate || undefined,
        contactId: data.contactId || undefined,
        assignedToId: data.assignedToId || undefined,
        description: data.description || undefined,
      }
      if (task) {
        const res = await updateTask(task.id, payload)
        showToast('Tarefa atualizada', 'success')
        onSuccess(res.data)
      } else {
        const res = await createTask(payload)
        showToast('Tarefa criada', 'success')
        onSuccess(res.data)
      }
    } catch (err: any) {
      const details = err?.response?.data?.details
      const msg = details?.length
        ? details.map((d: any) => d.message).join(', ')
        : err?.response?.data?.error || 'Erro ao guardar tarefa'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Título" required error={errors.title?.message} {...register('title')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select
          label="Estado"
          options={Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('status')}
        />
        <Select
          label="Prioridade"
          options={Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('priority')}
        />
        <Select
          label="Responsável"
          required
          error={errors.assignedToId?.message}
          placeholder="Selecionar responsável"
          options={users.map(u => ({ value: u.id, label: u.name }))}
          {...register('assignedToId')}
        />
        <Input label="Prazo" type="date" {...register('dueDate')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Select
            label="Contacto"
            placeholder="Nenhum"
            options={contacts.map(c => ({ value: c.id, label: c.name }))}
            {...register('contactId')}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Descrição</label>
        <textarea
          {...register('description')}
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
            border: '1px solid var(--border-color)', borderRadius: 8,
            background: 'var(--bg-page)', color: 'var(--text-primary)',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.12)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>
          {task ? 'Atualizar' : 'Criar'} Tarefa
        </Button>
      </div>
    </form>
  )
}

interface TasksPageProps {
  initialTab?: 'list' | 'calendar'
}

export const TasksPage: React.FC<TasksPageProps> = ({ initialTab = 'list' }) => {
  const { showToast } = useUIStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>(initialTab)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTasks({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        limit: 200
      })
      const d = res.data
      setTasks(Array.isArray(d) ? d : d.data || [])
    } catch {
      showToast('Erro ao carregar tarefas', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleComplete = async (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'COMPLETED' as const } : t))
    try {
      const res = await updateTask(task.id, { status: 'COMPLETED' })
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t))
      showToast('Tarefa concluída', 'success')
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      showToast('Erro ao atualizar tarefa', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteTask(deleteId)
      showToast('Tarefa eliminada', 'success')
      setDeleteId(null)
      fetchTasks()
    } catch {
      showToast('Erro ao eliminar tarefa', 'error')
    }
  }

  // summary counts
  const pending = tasks.filter(t => t.status === 'PENDING').length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Summary chips */}
      {activeTab === 'list' && !loading && tasks.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fffbeb', color: '#d97706' }}>
            {pending} pendente{pending !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb' }}>
            {inProgress} em curso
          </span>
          {overdueCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fef2f2', color: '#dc2626' }}>
              <AlertCircle style={{ width: 12, height: 12 }} /> {overdueCount} em atraso
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {(['list', 'calendar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 16px', fontSize: 13, fontWeight: 500,
                background: activeTab === tab ? '#6366f1' : 'var(--bg-card)',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              {tab === 'list' ? 'Lista' : 'Calendário'}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          <>
            <div style={{ width: 176 }}>
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'Todos os estados' },
                  ...Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l as string }))
                ]}
                size="sm"
              />
            </div>
            <div style={{ width: 176 }}>
              <CustomSelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: '', label: 'Todas as prioridades' },
                  ...Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l as string }))
                ]}
                size="sm"
              />
            </div>
          </>
        )}

        <Button
          onClick={() => { setEditTask(undefined); setShowModal(true) }}
          style={{ marginLeft: 'auto' }}
          size="sm"
        >
          <Plus className="w-4 h-4" /> Nova Tarefa
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : activeTab === 'calendar' ? (
        <div style={{ borderRadius: 12, padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <CalendarView
                tasks={tasks}
                onTaskClick={(task) => { setEditTask(task); setShowModal(true) }}
              />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Crie a sua primeira tarefa."
          actionLabel="Nova Tarefa"
          onAction={() => { setEditTask(undefined); setShowModal(true) }}
        />
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Título', 'Contacto', 'Prioridade', 'Prazo', 'Estado', 'Responsável'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
                  const st = STATUS_STYLE[task.status] ?? STATUS_STYLE.PENDING
                  const pr = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.MEDIUM
                  return (
                    <tr
                      key={task.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 100ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{task.contact?.name || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Pill bg={pr.bg} color={pr.color} label={TASK_PRIORITY_LABELS[task.priority]} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {task.dueDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? '#dc2626' : 'var(--text-secondary)', fontWeight: overdue ? 600 : 400, fontSize: 12 }}>
                            {overdue && <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} />}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Pill bg={st.bg} color={st.color} label={TASK_STATUS_LABELS[task.status]} />
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{task.assignedTo?.name || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleComplete(task)}
                              title="Marcar como concluída"
                              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#16a34a' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            >
                              <CheckCircle style={{ width: 15, height: 15 }} />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditTask(task); setShowModal(true) }}
                            title="Editar"
                            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Edit style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            onClick={() => setDeleteId(task.id)}
                            title="Eliminar"
                            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTask(undefined) }}
        title={editTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        size="lg"
      >
        <TaskForm
          task={editTask}
          onSuccess={(saved) => {
            setShowModal(false)
            setEditTask(undefined)
            if (editTask) {
              setTasks(prev => prev.map(t => t.id === saved.id ? saved : t))
            } else {
              setTasks(prev => [saved, ...prev])
            }
            fetchTasks()
          }}
          onCancel={() => { setShowModal(false); setEditTask(undefined) }}
        />
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Deseja eliminar esta tarefa?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
