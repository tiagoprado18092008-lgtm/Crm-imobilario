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
        <label className="text-sm font-medium text-gray-700">Descrição</label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Calendário
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <Select
              options={[
                { value: '', label: 'Todos os estados' },
                ...Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44"
            />
            <Select
              options={[
                { value: '', label: 'Todas as prioridades' },
                ...Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-44"
            />
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Prioridade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Prazo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Responsável</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                      <td className="px-4 py-3 text-gray-600">{task.contact?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityVariant[task.priority]} small>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {formatDate(task.dueDate)}
                            {overdue && ' ⚠'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[task.status]} small>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{task.assignedTo?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleComplete(task)}
                              className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                              title="Marcar como concluída"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditTask(task); setShowModal(true) }}
                            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(task.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
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
        <p className="text-sm text-gray-600 mb-6">Deseja eliminar esta tarefa?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
