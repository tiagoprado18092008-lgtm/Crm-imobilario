import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasks.api'
import { getContacts } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import type { Task, Contact, User } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CustomSelect } from '../components/ui/CustomSelect'
import { Badge } from '../components/ui/Badge'
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

const statusVariant: Record<string, any> = {
  PENDING: 'default',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger'
}

const priorityVariant: Record<string, any> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'danger'
}

interface TaskFormProps {
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    Promise.all([getContacts({ limit: 200 }), getUsers()])
      .then(([cRes, uRes]) => {
        const cd = cRes.data; setContacts(Array.isArray(cd) ? cd : cd.data || [])
        const ud = uRes.data; setUsers(Array.isArray(ud) ? ud : ud.data || [])
      })
      .catch(() => {})
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'PENDING',
      priority: task?.priority || 'MEDIUM',
      dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedToId: task?.assignedToId || '',
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
        description: data.description || undefined
      }
      if (task) {
        await updateTask(task.id, payload)
        showToast('Tarefa atualizada', 'success')
      } else {
        await createTask(payload)
        showToast('Tarefa criada', 'success')
      }
      onSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao guardar tarefa', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Título" required error={errors.title?.message} {...register('title')} />
      <div className="grid grid-cols-2 gap-4">
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
        <div className="col-span-2">
          <Select
            label="Contacto"
            placeholder="Nenhum"
            options={contacts.map(c => ({ value: c.id, label: c.name }))}
            {...register('contactId')}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div className="flex justify-end gap-3">
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
    try {
      await updateTask(task.id, { status: 'COMPLETED' })
      showToast('Tarefa concluída', 'success')
      fetchTasks()
    } catch {
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

  return (
    <div className="space-y-4">
      {/* Tab + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('list')}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={
              activeTab === 'list'
                ? { background: '#2563eb', color: '#ffffff' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }
            }
            onMouseEnter={e => { if (activeTab !== 'list') e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { if (activeTab !== 'list') e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            Lista
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={
              activeTab === 'calendar'
                ? { background: '#2563eb', color: '#ffffff' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }
            }
            onMouseEnter={e => { if (activeTab !== 'calendar') e.currentTarget.style.background = 'var(--hover-bg)' }}
            onMouseLeave={e => { if (activeTab !== 'calendar') e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            Calendário
          </button>
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
          className="ml-auto"
          size="sm"
        >
          <Plus className="w-4 h-4" /> Nova Tarefa
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : activeTab === 'calendar' ? (
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <CalendarView tasks={tasks} />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa encontrada"
          description="Crie a sua primeira tarefa."
          actionLabel="Nova Tarefa"
          onAction={() => { setEditTask(undefined); setShowModal(true) }}
        />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Título</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Prioridade</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Prazo</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Responsável</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
                  return (
                    <tr
                      key={task.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{task.contact?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityVariant[task.priority]} small>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <span style={{ color: overdue ? '#dc2626' : 'var(--text-secondary)', fontWeight: overdue ? 500 : undefined }}>
                            {formatDate(task.dueDate)}
                            {overdue && ' ⚠'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[task.status]} small>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{task.assignedTo?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleComplete(task)}
                              className="p-1.5 rounded hover:text-green-600 hover:bg-green-50"
                              style={{ color: 'var(--text-muted)' }}
                              title="Marcar como concluída"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditTask(task); setShowModal(true) }}
                            className="p-1.5 rounded hover:text-blue-600 hover:bg-blue-50"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(task.id)}
                            className="p-1.5 rounded hover:text-red-600 hover:bg-red-50"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Trash2 className="w-4 h-4" />
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
          onSuccess={() => { setShowModal(false); setEditTask(undefined); fetchTasks() }}
          onCancel={() => { setShowModal(false); setEditTask(undefined) }}
        />
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Deseja eliminar esta tarefa?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
