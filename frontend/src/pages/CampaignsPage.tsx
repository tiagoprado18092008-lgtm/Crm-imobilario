import React, { useEffect, useState } from 'react'
import { Mail, Plus, Send, Trash2, Eye, BarChart2, X, Users } from 'lucide-react'
import { listCampaigns, createCampaign, deleteCampaign, sendCampaign } from '../api/campaigns.api'

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
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  const load = async () => {
    try { setCampaigns((await listCampaigns()).data) }
    catch { } finally { setLoading(false) }
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
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar campanha?')) return
    await deleteCampaign(id)
    setCampaigns(c => c.filter(x => x.id !== id))
  }

  const handleSend = async (id: string) => {
    if (!confirm('Enviar campanha agora para todos os destinatários?')) return
    setSending(id)
    try {
      const res = await sendCampaign(id)
      setCampaigns(c => c.map(x => x.id === id ? res.data : x))
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao enviar campanha')
    } finally { setSending(null) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campanhas de Email</h1>
          <p className="text-slate-500 text-sm mt-1">Envia emails em massa para os teus contactos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus size={16} /> Nova campanha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total campanhas', value: campaigns.length, color: '#6366f1' },
          { label: 'Enviadas', value: campaigns.filter(c => c.status === 'SENT').length, color: '#10b981' },
          { label: 'Emails enviados', value: campaigns.reduce((s, c) => s + (c.sentCount || 0), 0), color: '#f59e0b' },
          { label: 'Rascunhos', value: campaigns.filter(c => c.status === 'DRAFT').length, color: '#94a3b8' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">A carregar...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Mail size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Sem campanhas</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Nome', 'Assunto', 'Estado', 'Enviados', 'Data', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm max-w-[200px] truncate">{c.subject}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: STATUS_COLORS[c.status] + '15', color: STATUS_COLORS[c.status] }}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Users size={12} className="text-slate-400" />
                      {c.sentCount || 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {c.sentAt ? new Date(c.sentAt).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowPreview(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Pré-visualizar">
                        <Eye size={14} />
                      </button>
                      {c.status === 'DRAFT' && (
                        <button onClick={() => handleSend(c.id)} disabled={sending === c.id}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 disabled:opacity-40" title="Enviar agora">
                          <Send size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nova campanha de email</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Nome da campanha *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                    placeholder="ex: Novos imóveis Março" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Destinatários</label>
                  <select value={form.targetFilter.type}
                    onChange={e => setForm(f => ({ ...f, targetFilter: { ...f.targetFilter, type: e.target.value } }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                    <option value="LEAD">Todos os Leads</option>
                    <option value="CLIENT">Todos os Clientes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Assunto *</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="ex: Novos imóveis disponíveis para si" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Corpo do email (HTML) *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={8} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none font-mono"
                  placeholder="<h1>Olá!</h1><p>Temos novidades para si...</p>" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={saving || !form.name || !form.subject || !form.body}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  {saving ? 'A guardar...' : 'Criar campanha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{showPreview.subject}</h3>
              <button onClick={() => setShowPreview(null)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-6" dangerouslySetInnerHTML={{ __html: showPreview.body }} />
          </div>
        </div>
      )}
    </div>
  )
}
