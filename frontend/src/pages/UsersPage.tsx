import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, UserCheck, UserX, Mail, Send, Copy, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getUsers, createUser, updateUser } from '../api/users.api'
import { createInvitation, listInvitations, revokeInvitation } from '../api/invitations.api'
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
  role: z.enum(['ADMIN', 'PRINCIPAL_CONSULTANT', 'CONSULTANT', 'SUB_AGENT', 'VIEWER']),
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
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('CONSULTANT')
  const [inviting, setInviting] = useState(false)
  const [invitations, setInvitations] = useState<any[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const fetchInvitations = useCallback(async () => {
    try { setInvitations((await listInvitations()).data) } catch {}
  }, [])

  useEffect(() => { if (showInviteModal) fetchInvitations() }, [showInviteModal, fetchInvitations])

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    try {
      await createInvitation(inviteEmail, inviteRole)
      showToast('Convite enviado com sucesso!', 'success')
      setInviteEmail('')
      fetchInvitations()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao enviar convite', 'error')
    } finally { setInviting(false) }
  }

  const copyInviteLink = (token: string, id: string) => {
    const url = `${window.location.origin}/register?token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevokeInvite = async (id: string) => {
    try {
      await revokeInvitation(id)
      fetchInvitations()
      showToast('Convite revogado', 'success')
    } catch { showToast('Erro ao revogar convite', 'error') }
  }

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
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{users.length} utilizadores registados</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowInviteModal(true)} size="sm">
            <Mail className="w-4 h-4" /> Convidar Consultor
          </Button>
          <Button onClick={() => { setEditUser(undefined); setShowModal(true) }} size="sm">
            <Plus className="w-4 h-4" /> Novo Utilizador
          </Button>
        </div>
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
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Utilizador</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Email</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Função</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Supervisor</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Estado</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Criado</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant[user.role]} small>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.supervisor?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'default'} small>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-1.5 rounded transition-colors ${
                          user.isActive
                            ? 'hover:text-red-600 hover:bg-red-50'
                            : 'hover:text-green-600 hover:bg-green-50'
                        }`}
                        style={{ color: 'var(--text-muted)' }}
                        title={user.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditUser(user); setShowModal(true) }}
                        className="p-1.5 rounded hover:text-blue-600 hover:bg-blue-50"
                        style={{ color: 'var(--text-muted)' }}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4" style={{ background: 'var(--bg-card)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Convidar Consultor</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>O convite é enviado por email e expira em 7 dias</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="consultor@email.com" type="email"
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ width: 160 }}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Função</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'ADMIN').map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleInvite} disabled={inviting || !inviteEmail}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer' }}>
                <Send size={14} />{inviting ? 'A enviar...' : 'Enviar convite'}
              </button>

              {invitations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Convites enviados</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {invitations.map(inv => {
                      const expired = new Date(inv.expiresAt) < new Date()
                      const used = !!inv.usedAt
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv.email}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {used ? '✓ Utilizado' : expired ? '✗ Expirado' : `Expira ${new Date(inv.expiresAt).toLocaleDateString('pt-PT')}`}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            {!used && !expired && (
                              <button onClick={() => copyInviteLink(inv.token, inv.id)}
                                className="p-1.5 rounded-lg" title="Copiar link"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                                onMouseOut={e => (e.currentTarget.style.background = 'none')}>
                                {copiedId === inv.id ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                              </button>
                            )}
                            <button onClick={() => handleRevokeInvite(inv.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50" title="Revogar"
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
