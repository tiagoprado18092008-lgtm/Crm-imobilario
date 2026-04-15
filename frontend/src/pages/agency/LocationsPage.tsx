import React, { useEffect, useState } from 'react'
import { Building2, Plus, MapPin, Users, Settings, Trash2, Edit2, X, Check } from 'lucide-react'
import { getLocations, createLocation, updateLocation, deleteLocation } from '../../api/locations.api'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { PageSpinner } from '../../components/ui/Spinner'

interface Location {
  id: string
  name: string
  address?: string
  city?: string
  phone?: string
  email?: string
  _count?: { members?: number }
  createdAt: string
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e9f2',
  borderRadius: 14,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1.5px solid #dce3ef',
  fontSize: 13,
  color: '#0f2553',
  outline: 'none',
  fontFamily: 'inherit',
  background: '#f8f9fc',
}

export const LocationsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getLocations()
      setLocations(Array.isArray(res.data) ? res.data : res.data?.data ?? [])
    } catch { setLocations([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => setForm({ name: '', address: '', city: '', phone: '', email: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await createLocation({ ...form, agencyId: user?.agencyId })
      showToast('Escritório criado.', 'success')
      setShowCreate(false)
      resetForm()
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao criar escritório.', 'error')
    } finally { setSaving(false) }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    try {
      await updateLocation(id, form)
      showToast('Escritório atualizado.', 'success')
      setEditId(null)
      load()
    } catch {
      showToast('Erro ao atualizar.', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar escritório "${name}"?`)) return
    try {
      await deleteLocation(id)
      showToast('Escritório eliminado.', 'success')
      load()
    } catch {
      showToast('Erro ao eliminar.', 'error')
    }
  }

  const startEdit = (loc: Location) => {
    setEditId(loc.id)
    setForm({ name: loc.name, address: loc.address || '', city: loc.city || '', phone: loc.phone || '', email: loc.email || '' })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Escritórios</h1>
            <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Gerir os escritórios da agência</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditId(null); resetForm() }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Plus size={14} /> Novo escritório
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: 20, border: '1.5px solid #6366f1' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f2553', margin: 0 }}>Novo escritório</p>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Escritório Lisboa" required />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cidade</label>
                <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Lisboa" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Morada</label>
                <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua..." />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Telefone</label>
                <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+351 21..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'A criar...' : 'Criar'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <PageSpinner /> : locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7a99' }}>
          <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Nenhum escritório criado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locations.map(loc => (
            <div key={loc.id} style={cardStyle}>
              {editId === loc.id ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome" />
                    <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
                    <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Morada" />
                    <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefone" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}><X size={12} /> Cancelar</button>
                    <button onClick={() => handleUpdate(loc.id)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Check size={12} /> Guardar</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={20} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#0f2553', margin: '0 0 4px' }}>{loc.name}</p>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {loc.city && <span style={{ fontSize: 12, color: '#6b7a99', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{loc.city}</span>}
                        {loc.address && <span style={{ fontSize: 12, color: '#6b7a99' }}>{loc.address}</span>}
                        {loc.phone && <span style={{ fontSize: 12, color: '#6b7a99' }}>{loc.phone}</span>}
                        {typeof loc._count?.members === 'number' && (
                          <span style={{ fontSize: 12, color: '#6b7a99', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{loc._count.members} membros</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(loc)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #dce3ef', background: '#fff', color: '#6b7a99', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(loc.id, loc.name)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
