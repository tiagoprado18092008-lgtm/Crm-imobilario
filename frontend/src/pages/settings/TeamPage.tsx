import React, { useEffect, useState } from 'react'
import { Users, UserPlus, Send, Trash2 } from 'lucide-react'
import { getUsers } from '../../api/users.api'
import { getMyAgency, listAgencyMembers } from '../../api/agency.api'
import { createInvitation, listInvitations, revokeInvitation } from '../../api/invitations.api'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { PageSpinner } from '../../components/ui/Spinner'
import { ROLE_LABELS } from '../../utils/constants'
import { getInitials, formatDate, isImageAvatar } from '../../utils/formatters'
import { CustomSelect } from '../../components/ui/CustomSelect'

interface Member { id: string; name: string; email: string; role: string; isActive: boolean; avatarUrl?: string; createdAt: string }
interface Invitation { id: string; email: string; role: string; usedAt: string | null; expiresAt: string }

const INVITE_ROLES = [
  { value: 'CONSULTANT', label: 'Consultor' },
  { value: 'TEAM_LEADER', label: 'Líder de Equipa' },
]

const ROLE_COLOR: Record<string, string> = {
  AGENCY_OWNER: '#f59e0b', AGENCY_ADMIN: '#6366f1', TEAM_LEADER: '#3b82f6', CONSULTANT: '#6b7a99',
}

export const TeamPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('CONSULTANT')
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Tenta carregar via agência (garante todos os membros); fallback para /users
      let membersData: Member[] = []
      try {
        const agencyRes = await getMyAgency()
        const membersRes = await listAgencyMembers(agencyRes.data.id)
        membersData = Array.isArray(membersRes.data) ? membersRes.data : []
      } catch {
        const usersRes = await getUsers()
        membersData = Array.isArray(usersRes.data) ? usersRes.data : []
      }
      setMembers(membersData)

      try {
        const invRes = await listInvitations()
        setInvitations(Array.isArray(invRes.data) ? invRes.data : [])
      } catch { setInvitations([]) }
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await createInvitation(inviteEmail.trim(), inviteRole)
      showToast('Convite enviado.', 'success')
      setInviteOpen(false); setInviteEmail(''); setInviteRole('CONSULTANT')
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao enviar convite.', 'error')
    } finally { setSending(false) }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id)
      showToast('Convite revogado.', 'success')
      setInvitations(p => p.filter(i => i.id !== id))
    } catch { showToast('Erro.', 'error') }
  }

  const pending = invitations.filter(i => !i.usedAt && new Date(i.expiresAt) >= new Date())

  const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7a99', borderBottom: '1px solid #e5e9f2' }
  const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Equipa</h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Membros e convites pendentes</p>
          </div>
        </div>
        {['AGENCY_OWNER', 'AGENCY_ADMIN', 'LOCATION_ADMIN'].includes(user?.role || '') && (
          <button onClick={() => setInviteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <UserPlus size={14} /> Convidar
          </button>
        )}
      </div>

      {loading ? <PageSpinner /> : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e9f2' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: 0 }}>Membros <span style={{ fontSize: 12, color: '#6b7a99', fontWeight: 400 }}>({members.length})</span></h2>
            </div>
            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7a99' }}><p>Nenhum membro.</p></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Membro</th>
                  <th style={thStyle}>Função</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Desde</th>
                </tr></thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
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
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f2553', fontSize: 13 }}>
                              {m.name} {m.id === user?.id && <span style={{ fontSize: 10, background: '#f0f1ff', color: '#6366f1', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>Eu</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7a99' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}><span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[m.role] || '#6b7a99' }}>{ROLE_LABELS[m.role] || m.role}</span></td>
                      <td style={tdStyle}><span style={{ fontSize: 12, fontWeight: 600, color: m.isActive ? '#22c55e' : '#ef4444' }}>{m.isActive ? '● Activo' : '● Inactivo'}</span></td>
                      <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pending.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e9f2' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: 0 }}>Convites pendentes <span style={{ fontSize: 12, color: '#6b7a99', fontWeight: 400 }}>({pending.length})</span></h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thStyle}>Email</th><th style={thStyle}>Função</th><th style={thStyle}>Expira</th><th style={{ ...thStyle, textAlign: 'right' }}></th>
                </tr></thead>
                <tbody>
                  {pending.map(inv => (
                    <tr key={inv.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={tdStyle}>{inv.email}</td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{ROLE_LABELS[inv.role] || inv.role}</span></td>
                      <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(inv.expiresAt)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => handleRevoke(inv.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Trash2 size={11} /> Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f2553', margin: '0 0 20px' }}>Convidar membro</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="consultor@agencia.pt" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Função</label>
                <CustomSelect
                  value={inviteRole}
                  onChange={v => setInviteRole(v)}
                  options={INVITE_ROLES}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setInviteOpen(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Send size={13} />{sending ? 'A enviar...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
