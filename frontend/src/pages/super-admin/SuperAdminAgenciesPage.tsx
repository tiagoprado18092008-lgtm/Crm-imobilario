import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Building2, Users, ChevronRight } from 'lucide-react'
import { listAgencies, createAgency } from '../../api/super-admin.api'

const T = { navy: '#0f2553', gold: '#d4a843', white: '#ffffff', border: '#dce3ef', muted: '#6b7a99', error: '#c0392b' }

interface Agency {
  id: string; name: string; slug: string; email?: string; isActive: boolean
  createdAt: string; _count: { users: number }
}

export const SuperAdminAgenciesPage: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', ownerEmail: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try { setAgencies((await listAgencies()).data) }
    catch { setError('Erro ao carregar agências') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setCreating(true)
    try {
      await createAgency({ ...form, slug: form.slug || slugify(form.name) })
      setShowModal(false)
      setForm({ name: '', slug: '', email: '', phone: '', ownerEmail: '' })
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar agência')
    } finally { setCreating(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: T.navy }}>Agências</h1>
          <p style={{ margin: '4px 0 0', color: T.muted, fontSize: 14 }}>{agencies.length} agência{agencies.length !== 1 ? 's' : ''} registada{agencies.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 8, border: 'none',
            background: T.navy, color: T.white, cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
          }}
        >
          <Plus size={16} /> Nova Agência
        </button>
      </div>

      {loading ? (
        <p style={{ color: T.muted }}>A carregar...</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {agencies.map(a => (
            <Link key={a.id} to={`/super-admin/agencies/${a.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: T.white, borderRadius: 10, border: `1px solid ${T.border}`,
                padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
                transition: 'box-shadow 150ms', cursor: 'pointer',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,37,83,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color={T.navy} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 15 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{a.email || a.slug}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted, fontSize: 13 }}>
                  <Users size={14} /> {a._count.users}
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: a.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: a.isActive ? '#16a34a' : '#dc2626',
                }}>
                  {a.isActive ? 'Ativa' : 'Inativa'}
                </div>
                <ChevronRight size={16} color={T.muted} />
              </div>
            </Link>
          ))}
          {agencies.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
              <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Nenhuma agência criada ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: T.white, borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: T.navy }}>Nova Agência</h2>
            {error && <p style={{ color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nome da Agência *', key: 'name', type: 'text', required: true },
                { label: 'Slug (auto)', key: 'slug', type: 'text', required: false },
                { label: 'Email da Agência', key: 'email', type: 'email', required: false },
                { label: 'Telefone', key: 'phone', type: 'tel', required: false },
                { label: 'Email do Proprietário *', key: 'ownerEmail', type: 'email', required: true },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={(form as any)[f.key]}
                    onChange={e => {
                      const val = e.target.value
                      setForm(prev => ({
                        ...prev,
                        [f.key]: val,
                        ...(f.key === 'name' && !prev.slug ? { slug: slugify(val) } : {}),
                      }))
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => { setShowModal(false); setError('') }} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, cursor: 'pointer', fontSize: 14 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: T.navy, color: T.white, cursor: creating ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                  {creating ? 'A criar...' : 'Criar Agência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
