import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, UserPlus, Settings, Mail, Trash2, Send, Building2, CheckCircle, Clock, XCircle, Shield, Save, Globe, Phone, MapPin, Image, Upload, X } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import { listAgencyMembers, getMyAgency, updateAgency } from '../api/agency.api'
import { createInvitation, listInvitations, revokeInvitation } from '../api/invitations.api'
import { PageSpinner } from '../components/ui/Spinner'
import { formatDate, getInitials } from '../utils/formatters'
import { ROLE_LABELS } from '../utils/constants'
import type { User } from '../types'

/* ── Agency settings form types ─────────────────────────────── */
interface Agency {
  id: string; name: string; slug: string; logoUrl?: string; coverUrl?: string;
  phone?: string; email?: string; website?: string; address?: string; city?: string; country?: string; description?: string
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #dce3ef',
  fontSize: 13, color: '#0f2553', outline: 'none', fontFamily: 'inherit', background: '#f8f9fc',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const labelSt: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
}
const sectionSt: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, padding: '24px 28px', marginBottom: 20,
}
function SecTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      {icon}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: 0 }}>{title}</h2>
    </div>
  )
}

function AgencySettingsTab() {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loadingAg, setLoadingAg] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', logoUrl: '', coverUrl: '',
    phone: '', email: '', website: '',
    address: '', city: '', country: '', description: '',
  })
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyAgency().then(res => {
      const data = res.data
      setAgency(data)
      setForm({
        name: data.name || '', slug: data.slug || '',
        logoUrl: data.logoUrl || '', coverUrl: data.coverUrl || '',
        phone: data.phone || '', email: data.email || '',
        website: data.website || '', address: data.address || '',
        city: data.city || '', country: data.country || '', description: data.description || '',
      })
    }).catch(() => {}).finally(() => setLoadingAg(false))
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#6366f1')
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#dce3ef')

  const handleImagePick = (field: 'logoUrl' | 'coverUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, [field]: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agency) return
    setSaving(true)
    try {
      await updateAgency(agency.id, {
        name: form.name, slug: form.slug, logoUrl: form.logoUrl, coverUrl: form.coverUrl,
        phone: form.phone, email: form.email, website: form.website,
        address: form.address, city: form.city, country: form.country, description: form.description,
      })
      showToast('Configurações guardadas.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao guardar.', 'error')
    } finally { setSaving(false) }
  }

  if (loadingAg) return <PageSpinner />

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 680 }}>

      {/* Aparência */}
      <div style={sectionSt}>
        <SecTitle icon={<Image size={15} style={{ color: '#6366f1' }} />} title="Aparência" />
        <div style={{ marginBottom: 20 }}>
          <label style={labelSt}>Imagem de Capa</label>
          <div
            style={{ width: '100%', height: 130, borderRadius: 10, border: '1.5px dashed #dce3ef', background: form.coverUrl ? 'transparent' : '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
            onClick={() => coverInputRef.current?.click()}
          >
            {form.coverUrl ? (
              <>
                <img src={form.coverUrl} alt="capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                <button type="button" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, coverUrl: '' })) }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7a99' }}>
                <Upload size={22} style={{ marginBottom: 6, opacity: 0.5 }} />
                <p style={{ fontSize: 12, margin: 0 }}>Clique para carregar uma imagem de capa</p>
              </div>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick('coverUrl')} />
        </div>
        <div>
          <label style={labelSt}>Logótipo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 12, border: '1.5px dashed #dce3ef', background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, position: 'relative' }}
              onClick={() => logoInputRef.current?.click()}>
              {form.logoUrl ? (
                <>
                  <img src={form.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                  <button type="button" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, logoUrl: '' })) }}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} />
                  </button>
                </>
              ) : <Upload size={18} style={{ color: '#6b7a99', opacity: 0.5 }} />}
            </div>
            <div>
              <button type="button" onClick={() => logoInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #dce3ef', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                <Upload size={13} /> Carregar logótipo
              </button>
              <p style={{ fontSize: 11, color: '#6b7a99', margin: '6px 0 0' }}>PNG, JPG ou SVG. Recomendado 200×200px.</p>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick('logoUrl')} />
          </div>
        </div>
      </div>

      {/* Identidade */}
      <div style={sectionSt}>
        <SecTitle icon={<Building2 size={15} style={{ color: '#6366f1' }} />} title="Identidade" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSt}>Nome da Agência *</label>
            <input style={inputSt} value={form.name} onChange={set('name')} placeholder="Nome da agência" required onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelSt}>Slug (URL)</label>
            <input style={inputSt} value={form.slug} onChange={set('slug')} placeholder="minha-agencia" onFocus={focus} onBlur={blur} />
            <p style={{ fontSize: 11, color: '#6b7a99', margin: '5px 0 0' }}>Identificador único da agência na plataforma.</p>
          </div>
          <div>
            <label style={labelSt}>Descrição</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Breve descrição da agência..." rows={3}
              onFocus={focus} onBlur={blur} style={{ ...inputSt, resize: 'vertical', minHeight: 80 }} />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div style={sectionSt}>
        <SecTitle icon={<Phone size={15} style={{ color: '#6366f1' }} />} title="Contacto" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelSt}>Email</label>
            <input style={inputSt} type="email" value={form.email} onChange={set('email')} placeholder="geral@agencia.pt" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelSt}>Telefone</label>
            <input style={inputSt} type="tel" value={form.phone} onChange={set('phone')} placeholder="+351 210 000 000" onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelSt}>Website</label>
            <input style={inputSt} type="url" value={form.website} onChange={set('website')} placeholder="https://www.agencia.pt" onFocus={focus} onBlur={blur} />
          </div>
        </div>
      </div>

      {/* Localização */}
      <div style={sectionSt}>
        <SecTitle icon={<MapPin size={15} style={{ color: '#6366f1' }} />} title="Localização" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSt}>Morada</label>
            <input style={inputSt} value={form.address} onChange={set('address')} placeholder="Rua, número, andar..." onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelSt}>Cidade</label>
              <input style={inputSt} value={form.city} onChange={set('city')} placeholder="Lisboa" onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelSt}>País</label>
              <input style={inputSt} value={form.country} onChange={set('country')} placeholder="Portugal" onFocus={focus} onBlur={blur} />
            </div>
          </div>
        </div>
      </div>

      {/* Informações de conta (read-only) */}
      <div style={sectionSt}>
        <SecTitle icon={<Globe size={15} style={{ color: '#6366f1' }} />} title="Informações de Conta" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#6b7a99' }}>ID da Agência</span>
            <span style={{ fontSize: 13, color: '#0f2553', fontFamily: 'monospace', background: '#f8f9fc', padding: '2px 8px', borderRadius: 6 }}>{agency?.id?.slice(0, 16)}...</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#6b7a99' }}>Gestor da conta</span>
            <span style={{ fontSize: 13, color: '#0f2553', fontWeight: 600 }}>{user?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
            <span style={{ fontSize: 13, color: '#6b7a99' }}>Email de contacto</span>
            <span style={{ fontSize: 13, color: '#0f2553' }}>{user?.email}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
        <button type="submit" disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: saving ? '#a5b4fc' : '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          <Save size={14} />{saving ? 'A guardar...' : 'Guardar alterações'}
        </button>
      </div>
    </form>
  )
}

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

/* ── Helpers ────────────────────────────────────────────────── */
const ROLE_COLOR: Record<string, string> = {
  AGENCY_OWNER: '#f59e0b',
  AGENCY_DIRECTOR: '#f59e0b',
  AGENCY_ADMIN: '#6366f1',
  TEAM_LEADER: '#3b82f6',
  CONSULTANT: '#6b7a99',
}

const inviteStatus = (inv: Invitation): { label: string; color: string; Icon: React.ElementType } => {
  if (inv.usedAt) return { label: 'Aceite', color: '#22c55e', Icon: CheckCircle }
  if (new Date(inv.expiresAt) < new Date()) return { label: 'Expirado', color: '#ef4444', Icon: XCircle }
  return { label: 'Pendente', color: '#f59e0b', Icon: Clock }
}

const INVITE_ROLES = [
  { value: 'CONSULTANT', label: 'Consultor' },
  { value: 'TEAM_LEADER', label: 'Líder de Equipa' },
  { value: 'AGENCY_ADMIN', label: 'Admin de Agência' },
]

/* ── Shared styles ──────────────────────────────────────────── */
const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: '#6b7a99',
  borderBottom: '1px solid #e5e9f2',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '13px 16px',
  fontSize: 13,
  color: '#374151',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle',
}

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

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('CONSULTANT')
  const [inviteSending, setInviteSending] = useState(false)

  const switchTab = (t: Tab) => {
    setTab(t)
    setSearchParams(t === 'members' ? {} : { tab: t })
  }

  const loadMembers = useCallback(async () => {
    if (!user?.agencyId) return
    setLoading(true)
    try {
      const res = await listAgencyMembers(user.agencyId)
      const data = res.data
      setMembers(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [user?.agencyId])

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
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>
              {(user?.agency as any)?.name || 'A minha agência'}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
        </div>

        {tab === 'invites' && (
          <button
            onClick={() => setInviteOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <UserPlus size={14} /> Convidar membro
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e9f2' }}>
        {([
          { key: 'members', label: 'Membros', icon: <Users size={14} /> },
          { key: 'invites', label: 'Convites', icon: <Mail size={14} /> },
          { key: 'settings', label: 'Configurações', icon: <Settings size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              border: 'none', fontFamily: 'inherit', fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#6366f1' : '#6b7a99',
              background: tab === t.key ? 'rgba(99,102,241,0.07)' : 'transparent',
              cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? <PageSpinner /> : (
        <>
          {/* MEMBERS TAB */}
          {tab === 'members' && (
            members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#6b7a99' }}>
                <Users size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p>Sem membros na agência.</p>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden' }}>
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
                      <tr
                        key={member.id}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        style={{ transition: 'background 0.15s' }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(member.name)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#0f2553', fontSize: 13 }}>{member.name}</span>
                            {member.id === user?.id && (
                              <span style={{ fontSize: 10, background: '#f0f1ff', color: '#6366f1', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>Eu</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7a99' }}>{member.email}</td>
                        <td style={tdStyle}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: ROLE_COLOR[member.role] || '#6b7a99', background: `${ROLE_COLOR[member.role] || '#6b7a99'}15`, padding: '3px 8px', borderRadius: 6 }}>
                            <Shield size={10} />{ROLE_LABELS[member.role] || member.role}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(member.createdAt)}</td>
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
              <div style={{ textAlign: 'center', padding: 48, color: '#6b7a99' }}>
                <Mail size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p>Ainda não enviou nenhum convite.</p>
                <button
                  onClick={() => setInviteOpen(true)}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <UserPlus size={14} /> Convidar membro
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, overflow: 'hidden' }}>
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
                      const st = inviteStatus(inv)
                      const isPending = !inv.usedAt && new Date(inv.expiresAt) >= new Date()
                      return (
                        <tr
                          key={inv.id}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fc')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                          style={{ transition: 'background 0.15s' }}
                        >
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Mail size={13} style={{ color: '#6b7a99' }} />{inv.email}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, color: ROLE_COLOR[inv.role] || '#6b7a99', fontWeight: 600 }}>
                              {ROLE_LABELS[inv.role] || inv.role}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: st.color }}>
                              <st.Icon size={12} />{st.label}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(inv.expiresAt)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {isPending && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                <Trash2 size={11} /> Revogar
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
            <div style={{ maxWidth: 480 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: '0 0 20px' }}>Informações da agência</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Nome da agência
                    </label>
                    <input
                      type="text"
                      value={(user?.agency as any)?.name || ''}
                      readOnly
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#374151', background: '#f8f9fc', boxSizing: 'border-box', cursor: 'default' }}
                    />
                    <p style={{ fontSize: 12, color: '#6b7a99', margin: '6px 0 0' }}>
                      Para alterar o nome da agência contacte o suporte.
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Gestor
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', background: '#f8f9fc' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(user?.name || '')}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f2553', margin: 0 }}>{user?.name}</p>
                        <p style={{ fontSize: 12, color: '#6b7a99', margin: 0 }}>{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f2553', margin: '0 0 20px' }}>Convidar membro</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="consultor@agencia.pt"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Função</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #dce3ef', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                >
                  {INVITE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setInviteOpen(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={inviteSending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Send size={13} />{inviteSending ? 'A enviar...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
