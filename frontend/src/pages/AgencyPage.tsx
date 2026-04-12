import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, UserPlus, Settings, Mail, Trash2, Send, Building2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import { listAgencyMembers } from '../api/agency.api'
import { createInvitation, listInvitations, revokeInvitation } from '../api/invitations.api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate, getInitials } from '../utils/formatters'
import { ROLE_LABELS } from '../utils/constants'
import type { User } from '../types'

/* ── Types ─────────────────────────────────────────────────── */
interface Invitation {
  id: string
  email: string
  role: string
  token: string
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

type Tab = 'members' | 'invites' | 'settings'

/* ── Badge helpers ──────────────────────────────────────────── */
const roleBadgeVariant = (role: string): any => {
  if (['AGENCY_OWNER', 'AGENCY_DIRECTOR'].includes(role)) return 'warning'
  if (role === 'AGENCY_ADMIN') return 'info'
  if (role === 'TEAM_LEADER') return 'info'
  return 'default'
}

const inviteStatus = (inv: Invitation): { label: string; variant: any; icon: React.ReactNode } => {
  if (inv.usedAt) return { label: 'Aceite', variant: 'success', icon: <CheckCircle size={12} /> }
  if (new Date(inv.expiresAt) < new Date()) return { label: 'Expirado', variant: 'danger', icon: <XCircle size={12} /> }
  return { label: 'Pendente', variant: 'warning', icon: <Clock size={12} /> }
}

/* ── Invite form roles ──────────────────────────────────────── */
const INVITE_ROLES = [
  { value: 'CONSULTANT', label: 'Consultor' },
  { value: 'TEAM_LEADER', label: 'Líder de Equipa' },
  { value: 'AGENCY_ADMIN', label: 'Admin de Agência' },
]

/* ── Styles shared ──────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.75)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

/* ── Tab button ─────────────────────────────────────────────── */
const TabBtn: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
    style={{
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
      color: active ? '#818cf8' : 'rgba(255,255,255,0.45)',
      cursor: 'pointer',
    }}
  >
    {icon}
    {label}
  </button>
)

/* ── Main page ──────────────────────────────────────────────── */
export const AgencyPage: React.FC = () => {
  const { user } = useAuthStore()
  const { showToast } = useUIStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(rawTab && ['members', 'invites', 'settings'].includes(rawTab) ? rawTab : 'members')

  const [members, setMembers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)

  /* Invite modal state */
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('CONSULTANT')
  const [inviteSending, setInviteSending] = useState(false)

  const switchTab = (t: Tab) => {
    setTab(t)
    setSearchParams(t === 'members' ? {} : { tab: t })
  }

  /* Load members */
  const loadMembers = useCallback(async () => {
    if (!user?.agencyId) return
    setLoading(true)
    try {
      const res = await listAgencyMembers(user.agencyId)
      const data = res.data
      setMembers(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      // agencyId may not be set yet — show empty
    } finally {
      setLoading(false)
    }
  }, [user?.agencyId])

  /* Load invitations */
  const loadInvitations = useCallback(async () => {
    try {
      const res = await listInvitations()
      const data = res.data
      setInvitations(Array.isArray(data) ? data : data?.data ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    if (tab === 'members') loadMembers()
    if (tab === 'invites') loadInvitations()
  }, [tab, loadMembers, loadInvitations])

  /* Send invite */
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    try {
      await createInvitation(inviteEmail.trim(), inviteRole)
      showToast('Convite enviado com sucesso.', 'success')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('CONSULTANT')
      loadInvitations()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao enviar convite.', 'error')
    } finally {
      setInviteSending(false)
    }
  }

  /* Revoke invite */
  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id)
      showToast('Convite revogado.', 'success')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } catch {
      showToast('Erro ao revogar convite.', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#080d1a', minHeight: 0 }}>
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 38, height: 38, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Building2 size={18} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight" style={{ letterSpacing: '-0.01em' }}>
              {user?.agency || 'A minha agência'}
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
        </div>

        {tab === 'invites' && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} />
            Convidar membro
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-6 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <TabBtn active={tab === 'members'} icon={<Users size={14} />} label="Membros" onClick={() => switchTab('members')} />
        <TabBtn active={tab === 'invites'} icon={<Mail size={14} />} label="Convites" onClick={() => switchTab('invites')} />
        <TabBtn active={tab === 'settings'} icon={<Settings size={14} />} label="Configurações" onClick={() => switchTab('settings')} />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* MEMBERS TAB */}
        {tab === 'members' && (
          loading ? <PageSpinner /> :
          members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem membros"
              description="A agência ainda não tem membros. Convide consultores no separador Convites."
            />
          ) : (
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Membro</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Função</th>
                    <th style={thStyle}>Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                      <td style={tdStyle}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
                            style={{
                              width: 30, height: 30, fontSize: 10,
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            }}
                          >
                            {getInitials(member.name)}
                          </div>
                          <span className="font-medium text-white" style={{ fontSize: 13 }}>{member.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{member.email}</td>
                      <td style={tdStyle}>
                        <Badge variant={roleBadgeVariant(member.role)} size="sm">
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)' }}>
                        {formatDate(member.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* INVITES TAB */}
        {tab === 'invites' && (
          invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Sem convites"
              description="Ainda não enviou nenhum convite. Clique em 'Convidar membro' para começar."
              action={<Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus size={14} /> Convidar membro</Button>}
            />
          ) : (
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Função</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Expira em</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map(inv => {
                    const status = inviteStatus(inv)
                    const isPending = !inv.usedAt && new Date(inv.expiresAt) >= new Date()
                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td style={tdStyle}>
                          <div className="flex items-center gap-2">
                            <Mail size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                            <span>{inv.email}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <Badge variant={roleBadgeVariant(inv.role)} size="sm">
                            {ROLE_LABELS[inv.role] || inv.role}
                          </Badge>
                        </td>
                        <td style={tdStyle}>
                          <Badge variant={status.variant} size="sm">
                            <span className="flex items-center gap-1">
                              {status.icon}
                              {status.label}
                            </span>
                          </Badge>
                        </td>
                        <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)' }}>
                          {formatDate(inv.expiresAt)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {isPending && (
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-red-500/10"
                              style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                              title="Revogar convite"
                            >
                              <Trash2 size={12} />
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="max-w-lg">
            <div style={{ ...cardStyle, padding: '24px' }}>
              <h3 className="text-white font-semibold text-sm mb-4">Informações da agência</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Nome da agência
                  </label>
                  <input
                    type="text"
                    value={user?.agency || ''}
                    readOnly
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      outline: 'none',
                      cursor: 'default',
                    }}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Para alterar o nome da agência contacte o suporte.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Gestor
                  </label>
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
                      style={{ width: 24, height: 24, fontSize: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      {getInitials(user?.name || '')}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium leading-tight">{user?.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Invite Modal ── */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Convidar membro"
        size="sm"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Email
            </label>
            <Input
              type="email"
              placeholder="consultor@agencia.pt"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Função
            </label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {INVITE_ROLES.map(r => (
                <option key={r.value} value={r.value} style={{ background: '#131c2e' }}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" type="button" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={inviteSending}>
              <Send size={13} />
              {inviteSending ? 'A enviar...' : 'Enviar convite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
