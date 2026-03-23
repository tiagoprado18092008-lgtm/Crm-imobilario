import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, UserCheck, UserX } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsers, createUser, updateUser } from '../api/users.api'
import type { User } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { useUIStore } from '../store/ui.store'
import { formatDate, getInitials } from '../utils/formatters'
import { ROLE_LABELS } from '../utils/constants'

const roleVariant: Record<string, any> = {
  ADMIN: 'danger',
  PRINCIPAL_CONSULTANT: 'info',
  SUB_AGENT: 'default'
}

const userSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'PRINCIPAL_CONSULTANT', 'SUB_AGENT']),
  phone: z.string().optional(),
  supervisorId: z.string().optional()
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  user?: User
  supervisors: User[]
  onSuccess: () => void
  onCancel: () => void
}

const UserForm: React.FC<UserFormProps> = ({ user, supervisors, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'SUB_AGENT',
      phone: user?.phone || '',
      supervisorId: user?.supervisorId || ''
    }
  })

  const roleValue = watch('role')

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true)
    try {
      const payload: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || undefined,
        supervisorId: data.role === 'SUB_AGENT' ? (data.supervisorId || undefined) : undefined
      }
      if (data.password) payload.password = data.password

      if (user) {
        await updateUser(user.id, payload)
        showToast('Utilizador atualizado', 'success')
      } else {
        if (!data.password) {
          showToast('Password obrigatória para novo utilizador', 'error')
          setSubmitting(false)
          return
        }
        await createUser(payload)
        showToast('Utilizador criado', 'success')
      }
      onSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao guardar utilizador', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Nome" required error={errors.name?.message} {...register('name')} />
        </div>
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input
          label={user ? 'Nova Password (opcional)' : 'Password'}
          type="password"
          required={!user}
          error={errors.password?.message}
          {...register('password')}
        />
        <Select
          label="Função"
          required
          options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('role')}
        />
        <Input label="Telefone" {...register('phone')} />
        {roleValue === 'SUB_AGENT' && supervisors.length > 0 && (
          <div className="col-span-2">
            <Select
              label="Supervisor"
              placeholder="Nenhum"
              options={supervisors.map(s => ({ value: s.id, label: s.name }))}
              {...register('supervisorId')}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>
          {user ? 'Atualizar' : 'Criar'} Utilizador
        </Button>
      </div>
    </form>
  )
}

export const UsersPage: React.FC = () => {
  const { showToast } = useUIStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | undefined>()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      const d = res.data
      setUsers(Array.isArray(d) ? d : d.data || [])
    } catch {
      showToast('Erro ao carregar utilizadores', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive })
      showToast(`Utilizador ${user.isActive ? 'desativado' : 'ativado'}`, 'success')
      fetchUsers()
    } catch {
      showToast('Erro ao atualizar estado', 'error')
    }
  }

  const supervisors = users.filter(u => u.role === 'PRINCIPAL_CONSULTANT' || u.role === 'ADMIN')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} utilizadores registados</p>
        <Button onClick={() => { setEditUser(undefined); setShowModal(true) }} size="sm">
          <Plus className="w-4 h-4" /> Novo Utilizador
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : users.length === 0 ? (
        <EmptyState
          title="Nenhum utilizador encontrado"
          actionLabel="Novo Utilizador"
          onAction={() => { setEditUser(undefined); setShowModal(true) }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Utilizador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Função</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Supervisor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Criado</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant[user.role]} small>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.supervisor?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'default'} small>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-1.5 rounded transition-colors ${
                          user.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditUser(user); setShowModal(true) }}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditUser(undefined) }}
        title={editUser ? 'Editar Utilizador' : 'Novo Utilizador'}
        size="lg"
      >
        <UserForm
          user={editUser}
          supervisors={supervisors}
          onSuccess={() => { setShowModal(false); setEditUser(undefined); fetchUsers() }}
          onCancel={() => { setShowModal(false); setEditUser(undefined) }}
        />
      </Modal>
    </div>
  )
}
