import React, { useEffect, useState } from 'react'
import { Users, UserPlus, Mail, Send, Trash2, Shield, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getUsers } from '../../api/users.api'
import { createInvitation, listInvitations, revokeInvitation } from '../../api/invitations.api'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { PageSpinner } from '../../components/ui/Spinner'
import { ROLE_LABELS } from '../../utils/constants'
import { getInitials, formatDate, isImageAvatar } from '../../utils/formatters'

interface User { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; avatarUrl?: string }
interface Invitation { id: string; email: string; role: string; usedAt: string | null; expiresAt: string; createdAt: string }

const INVITE_ROLES = [
  { value: 'CONSULTANT', label: 'Consultor' },
  { value: 'TEAM_LEADER', label: 'Líder de Equipa' },
  { value: 'AGENCY_ADMIN', label: 'Admin de Agência' },
]

const ROLE_COLOR: Record<string, string> = {
  AGENCY_OWNER: '#f59e0b', AGENCY_ADMIN: '#6366f1', TEAM_LEADER: '#3b82f6', CONSULTANT: '#6b7a99',
}

type Tab = 'members' | 'invites'

export const AgencyUsersPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('CONSULTANT')
  const [sending, setSending] = useState(false)

  const loadMembers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setMembers(Array.isArray(res.data) ? res.data : [])
    } catch { setMembers([]) }
    finally { setLoading(false) }
  }

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const res = await listInvitations()
      setInvitations(Array.isArray(res.data) ? res.data : [])
    } catch { setInvitations([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { tab === 'members' ? loadMembers() : loadInvitations() }, [tab])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await createInvitation(inviteEmail.trim(), inviteRole)
      showToast('Convite enviado.', 'success')
      setInviteOpen(false); setInviteEmail(''); setInviteRole('CONSULTANT')
      if (tab === 'invites') loadInvitations()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao enviar convite.', 'error')
    } finally { setSending(false) }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id)
      showToast('Convite revogado.', 'success')
      setInvitations(p => p.filter(i => i.id !== id))
    } catch { showToast('Erro ao revogar.', 'error') }
  }

  const inviteStatus = (inv: Invitation) => {
    if (inv.usedAt) return { label: 'Aceite', color: '#22c55e', Icon: CheckCircle }
    if (new Date(inv.expiresAt) < new Date()) return { label: 'Expirado', color: '#ef4444', Icon: XCircle }
    return { label: 'Pendente', color: '#f59e0b', Icon: Clock }
  }

  const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7a99', borderBottom: '1px solid #e5e9f2', whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '13px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Utilizadores da Agência</h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Membros e convites da sua agência</p>
          </div>
        </div>
        <button onClick={() => setInviteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <UserPlus size={14} /> Convidar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e9f2', paddingBottom: 0 }}>
        {(['members', 'invites'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#6366f1' : '#6b7a99', background: tab === t ? 'rgba(99,102,241,0.07)' : 'transparent', cursor: 'pointer', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent', marginBottom: -1 }}>
            {t === 'members' ? `Membros (${members.length})` : `Convites (${invitations.length})`}
          </button>
        ))}
      </div>

      {loading ? <PageSpinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden' }}>
          {tab === 'members' && (
            members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#6b7a99' }}><Users size={36} style={{ opacity: 0.3, marginBottom: 10 }} /><p>Nenhum membro encontrado.</p></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Membro</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Função</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Desde</th>
                </tr></thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isImageAvatar(m.avatarUrl) ? (
                              <img src={m.avatarUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.avatarUrl || 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                                {getInitials(m.name)}
                              </div>
                            )}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0f2553', fontSize: 13 }}>{m.name}</span>
                          {m.id === user?.id && <span style={{ fontSize: 10, background: '#f0f1ff', color: '#6366f1', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>Eu</span>}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7a99' }}>{m.email}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: ROLE_COLOR[m.role] || '#6b7a99', background: `${ROLE_COLOR[m.role]}15` || '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>
                          <Shield size={10} />{ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: m.isActive ? '#22c55e' : '#ef4444' }}>
                          {m.isActive ? '● Activo' : '● Inactivo'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'invites' && (
            invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#6b7a99' }}><Mail size={36} style={{ opacity: 0.3, marginBottom: 10 }} /><p>Nenhum convite enviado.</p></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Função</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Expira</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}></th>
                </tr></thead>
                <tbody>
                  {invitations.map(inv => {
                    const st = inviteStatus(inv)
                    const isPending = !inv.usedAt && new Date(inv.expiresAt) >= new Date()
                    return (
                      <tr key={inv.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={13} style={{ color: '#6b7a99' }} />{inv.email}</div></td>
                        <td style={tdStyle}><span style={{ fontSize: 12, color: ROLE_COLOR[inv.role] || '#6b7a99', fontWeight: 600 }}>{ROLE_LABELS[inv.role] || inv.role}</span></td>
                        <td style={tdStyle}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: st.color }}>
                            <st.Icon size={12} />{st.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(inv.expiresAt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {isPending && (
                            <button onClick={() => handleRevoke(inv.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Trash2 size={11} /> Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f2553', margin: '0 0 20px' }}>Convidar membro</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="consultor@agencia.pt" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Função</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
                  {INVITE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setInviteOpen(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Send size={13} />{sending ? 'A enviar...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
