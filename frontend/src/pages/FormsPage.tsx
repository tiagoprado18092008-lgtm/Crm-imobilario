import React, { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, Copy, Eye, X, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { listForms, createForm, deleteForm, updateForm } from '../api/forms.api'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import { CustomSelect } from '../components/ui/CustomSelect'

/* ── Dark inline style tokens ─────────────────────────────────── */
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

const FIELD_TYPES = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista de opções' },
  { value: 'checkbox', label: 'Caixa de seleção' },
]

const EMPTY_FORM = {
  name: '', description: '', submitAction: 'CREATE_CONTACT',
  thankYouMessage: 'Obrigado! Entraremos em contacto em breve.',
  fields: [] as any[],
}

export const FormsPage: React.FC = () => {
  const { user } = useAuthStore()
  const { showToast } = useUIStore()
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await listForms()
      const data = res.data
      setForms(Array.isArray(data) ? data : data?.data ?? [])
    } catch {
      showToast('Erro ao carregar formulários.', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (f: any) => {
    setEditing(f)
    setForm({ name: f.name, description: f.description || '', submitAction: f.submitAction, thankYouMessage: f.thankYouMessage, fields: JSON.parse(f.fields || '[]') })
    setShowModal(true)
  }

  const addField = () => {
    setForm(f => ({ ...f, fields: [...f.fields, { id: Date.now().toString(), label: '', type: 'text', required: false, options: '' }] }))
  }

  const updateField = (id: string, key: string, value: any) => {
    setForm(f => ({ ...f, fields: f.fields.map(fi => fi.id === id ? { ...fi, [key]: value } : fi) }))
  }

  const removeField = (id: string) => {
    setForm(f => ({ ...f, fields: f.fields.filter(fi => fi.id !== id) }))
  }

  const handleSave = async () => {
    if (!form.name || form.fields.length === 0) return
    setSaving(true)
    try {
      const payload = { ...form, assignedToId: user?.id }
      if (editing) {
        const res = await updateForm(editing.id, payload)
        setForms(fs => fs.map(x => x.id === editing.id ? res.data : x))
        showToast('Formulário atualizado.', 'success')
      } else {
        const res = await createForm(payload)
        setForms(fs => [res.data, ...fs])
        showToast('Formulário criado.', 'success')
      }
      setShowModal(false)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao guardar formulário.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar formulário?')) return
    try {
      await deleteForm(id)
      setForms(fs => fs.filter(x => x.id !== id))
    } catch {
      showToast('Erro ao eliminar formulário.', 'error')
    }
  }

  const handleToggle = async (f: any) => {
    try {
      const res = await updateForm(f.id, { isActive: !f.isActive })
      setForms(fs => fs.map(x => x.id === f.id ? res.data : x))
    } catch {
      showToast('Erro ao atualizar formulário.', 'error')
    }
  }

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#080d1a', minHeight: 0 }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 38, height: 38, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <FileText size={18} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight" style={{ letterSpacing: '-0.01em' }}>Formulários</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Captura leads com formulários personalizados</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> Novo formulário
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total formulários', value: forms.length, color: '#6366f1' },
            { label: 'Ativos', value: forms.filter(f => f.isActive).length, color: '#10b981' },
            { label: 'Submissões totais', value: forms.reduce((s, f) => s + (f._count?.submissions || 0), 0), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '16px 18px' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>A carregar...</div>
        ) : forms.length === 0 ? (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="font-medium text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Sem formulários</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Cria formulários para capturar leads automaticamente</p>
            <button onClick={openCreate}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
              Criar primeiro formulário
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forms.map(f => (
              <div key={f.id} style={{ ...card, padding: '16px' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate">{f.name}</h3>
                    {f.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.description}</p>
                    )}
                  </div>
                  <button onClick={() => handleToggle(f)} className="shrink-0 ml-2"
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    {f.isActive
                      ? <ToggleRight size={22} style={{ color: '#6366f1' }} />
                      : <ToggleLeft size={22} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    }
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <span>{JSON.parse(f.fields || '[]').length} campos</span>
                  <span>·</span>
                  <span>{f._count?.submissions || 0} submissões</span>
                  <span>·</span>
                  <span style={{ color: f.isActive ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{f.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyLink(f.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}>
                    <Copy size={12} />{copied === f.id ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button onClick={() => openEdit(f)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}>
                    <Eye size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(f.id)}
                    className="p-2 rounded-xl transition-colors hover:bg-red-500/10"
                    style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-white font-bold text-base">{editing ? 'Editar formulário' : 'Novo formulário'}</h2>
              <button onClick={() => setShowModal(false)}
                style={{ color: 'rgba(255,255,255,0.4)', border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Nome *
                </label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputSt} placeholder="ex: Formulário de contacto" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Descrição
                </label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={inputSt} placeholder="Descrição opcional" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Mensagem de confirmação
                </label>
                <input value={form.thankYouMessage} onChange={e => setForm(f => ({ ...f, thankYouMessage: e.target.value }))}
                  style={inputSt} />
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Campos do formulário
                  </label>
                  <button onClick={addField}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: '#818cf8', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <Plus size={12} /> Adicionar campo
                  </button>
                </div>
                {form.fields.length === 0 ? (
                  <div className="rounded-xl p-6 text-center text-sm"
                    style={{ border: '2px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                    Adiciona pelo menos um campo ao formulário
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <GripVertical size={14} className="shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)}
                          className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none"
                          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                          placeholder="Etiqueta do campo" />
                        <div style={{ width: 150 }}>
                          <CustomSelect
                            value={field.type}
                            onChange={val => updateField(field.id, 'type', val)}
                            options={FIELD_TYPES}
                            size="sm"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} />
                          Obrig.
                        </label>
                        <button onClick={() => removeField(field.id)}
                          style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.name || form.fields.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', cursor: 'pointer' }}>
                  {saving ? 'A guardar...' : editing ? 'Guardar' : 'Criar formulário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
