import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, MapPin, Settings } from 'lucide-react'
import { getAgencyDetail, updateAgency, deactivateAgency } from '../../api/super-admin.api'
import { resendInvitation } from '../../api/invitations.api'
import { ROLE_LABELS } from '../../utils/constants'

const T = { navy: '#0f2553', gold: '#d4a843', white: '#ffffff', border: '#dce3ef', muted: '#6b7a99', error: '#c0392b' }

type Tab = 'members' | 'settings'

export const SuperAdminAgencyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('members')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try { setAgency((await getAgencyDetail(id!)).data) }
    catch { setMsg('Erro ao carregar agência') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleToggleActive = async () => {
    if (!agency) return
    setSaving(true)
    try {
      if (agency.isActive) {
        await deactivateAgency(id!)
      } else {
        await updateAgency(id!, { isActive: true })
      }
      await load()
      setMsg(agency.isActive ? 'Agência desativada.' : 'Agência reativada.')
    } catch { setMsg('Erro ao atualizar agência.') }
    finally { setSaving(false) }
  }

  if (loading) return <p style={{ color: T.muted }}>A carregar...</p>
  if (!agency) return <p style={{ color: T.error }}>Agência não encontrada.</p>

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'members', label: 'Membros', icon: <Users size={15} /> },
    { key: 'settings', label: 'Definições', icon: <Settings size={15} /> },
  ]

  return (
    <div>
      <button onClick={() => navigate('/super-admin/agencies')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={15} /> Agências
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: T.navy }}>{agency.name}</h1>
          <p style={{ margin: '4px 0 0', color: T.muted, fontSize: 13 }}>{agency.email} · {agency.slug}</p>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: agency.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: agency.isActive ? '#16a34a' : '#dc2626' }}>
          {agency.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      {msg && <p style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? T.navy : T.muted,
            borderBottom: tab === t.key ? `2px solid ${T.navy}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {agency.users.map((u: any) => (
            <div key={u.id} style={{ background: T.white, borderRadius: 10, border: `1px solid ${T.border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: T.navy, fontSize: 14 }}>
                {u.name?.[0] || u.email[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.navy, fontSize: 14 }}>{u.name || '—'}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 12, color: T.muted }}>{ROLE_LABELS[u.role] || u.role}</span>
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: u.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#16a34a' : '#dc2626' }}>
                {u.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          ))}
          {agency.users.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 40 }}>Sem membros ainda.</p>}
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ background: T.white, borderRadius: 10, border: `1px solid ${T.border}`, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: T.navy, fontSize: 16 }}>Ações da Agência</h3>
          <button
            onClick={handleToggleActive}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
              background: agency.isActive ? '#dc2626' : '#16a34a', color: T.white, fontWeight: 600, fontSize: 14,
            }}
          >
            {saving ? 'A processar...' : agency.isActive ? 'Desativar Agência' : 'Reativar Agência'}
          </button>
        </div>
      )}
    </div>
  )
}
