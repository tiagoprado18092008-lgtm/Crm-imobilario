import React, { useEffect, useState } from 'react'
import { CustomSelect } from '../components/ui/CustomSelect'
import DOMPurify from 'dompurify'
import { Mail, Plus, Send, Trash2, Eye, X, Users } from 'lucide-react'
import { listCampaigns, createCampaign, deleteCampaign, sendCampaign } from '../api/campaigns.api'
import { useUIStore } from '../store/ui.store'

/* ── Dark inline style tokens (match project conventions) ────── */
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
}
const inputSt: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}
const thSt: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)',
  whiteSpace: 'nowrap',
}
const tdSt: React.CSSProperties = {
  padding: '11px 14px', fontSize: 13,
  color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8', SCHEDULED: '#f59e0b', SENDING: '#6366f1',
  SENT: '#10b981', CANCELLED: '#ef4444',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SCHEDULED: 'Agendada', SENDING: 'A enviar',
  SENT: 'Enviada', CANCELLED: 'Cancelada',
}

const EMPTY_FORM = {
  name: '', subject: '', body: '', type: 'BROADCAST',
  targetFilter: { type: 'LEAD' }, scheduledAt: '',
}

export const CampaignsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await listCampaigns()
      const data = res.data
      setCampaigns(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      showToast('Erro ao carregar campanhas.', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.body) return
    setSaving(true)
    try {
      const res = await createCampaign(form)
      setCampaigns(c => [res.data, ...c])
      setShowModal(false)
      setForm(EMPTY_FORM)
      showToast('Campanha criada.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao criar campanha.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar campanha?')) return
    try {
      await deleteCampaign(id)
      setCampaigns(c => c.filter(x => x.id !== id))
    } catch {
      showToast('Erro ao eliminar campanha.', 'error')
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm('Enviar campanha agora para todos os destinatários?')) return
    setSending(id)
    try {
      const res = await sendCampaign(id)
      setCampaigns(c => c.map(x => x.id === id ? res.data : x))
      showToast('Campanha enviada.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao enviar campanha.', 'error')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#080d1a', minHeight: 0 }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 38, height: 38, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Mail size={18} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight" style={{ letterSpacing: '-0.01em' }}>Campanhas de Email</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Envia emails em massa para os teus contactos</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> Nova campanha
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total campanhas', value: campaigns.length, color: '#6366f1' },
            { label: 'Enviadas', value: campaigns.filter(c => c.status === 'SENT').length, color: '#10b981' },
            { label: 'Emails enviados', value: campaigns.reduce((s, c) => s + (c.sentCount || 0), 0), color: '#f59e0b' },
            { label: 'Rascunhos', value: campaigns.filter(c => c.status === 'DRAFT').length, color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '16px 18px' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>A carregar...</div>
        ) : campaigns.length === 0 ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <Mail size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="font-medium text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Sem campanhas</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
              Criar primeira campanha
            </button>
          </div>
        ) : (
          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nome', 'Assunto', 'Estado', 'Enviados', 'Data', 'Ações'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td style={{ ...tdSt, color: '#fff', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ ...tdSt, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</td>
                    <td style={tdSt}>
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: STATUS_COLORS[c.status] + '20', color: STATUS_COLORS[c.status] }}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td style={tdSt}>
                      <div className="flex items-center gap-1 text-sm">
                        <Users size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        {c.sentCount || 0}
                      </div>
                    </td>
                    <td style={{ ...tdSt, color: 'rgba(255,255,255,0.35)' }}>
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td style={tdSt}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowPreview(c)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: 'rgba(255,255,255,0.4)', border: 'none', background: 'none', cursor: 'pointer' }}
                          title="Pré-visualizar">
                          <Eye size={14} />
                        </button>
                        {c.status === 'DRAFT' && (
                          <button onClick={() => handleSend(c.id)} disabled={sending === c.id}
                            className="p-1.5 rounded-lg transition-colors hover:bg-indigo-500/10"
                            style={{ color: '#818cf8', border: 'none', background: 'none', cursor: 'pointer', opacity: sending === c.id ? 0.4 : 1 }}
                            title="Enviar agora">
                            <Send size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                          style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-white font-bold text-base">Nova campanha de email</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'rgba(255,255,255,0.4)', border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Nome da campanha *
                  </label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputSt} placeholder="ex: Novos imóveis Março" />
                </div>
                <div>
                  <CustomSelect
                    label="Destinatários"
                    value={form.targetFilter.type}
                    onChange={val => setForm(f => ({ ...f, targetFilter: { ...f.targetFilter, type: val } }))}
                    options={[
                      { value: 'LEAD', label: 'Todos os Leads' },
                      { value: 'CLIENT', label: 'Todos os Clientes' },
                      { value: 'OWNER', label: 'Todos os Proprietários' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Assunto *
                </label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  style={inputSt} placeholder="ex: Novos imóveis disponíveis para si" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Corpo do email (HTML) *
                </label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={7}
                  style={{ ...inputSt, resize: 'none', fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="<h1>Olá!</h1><p>Temos novidades para si...</p>" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={saving || !form.name || !form.subject || !form.body}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
                  {saving ? 'A guardar...' : 'Criar campanha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#fff' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h3 className="font-semibold text-gray-800">{showPreview.subject}</h3>
              <button onClick={() => setShowPreview(null)} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-gray-800" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(showPreview.body) }} />
          </div>
        </div>
      )}
    </div>
  )
}
