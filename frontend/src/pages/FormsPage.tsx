import React, { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, Copy, Eye, X, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { listForms, createForm, deleteForm, updateForm } from '../api/forms.api'
import { useAuthStore } from '../store/auth.store'
import { CustomSelect } from '../components/ui/CustomSelect'

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
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    try { setForms((await listForms()).data) }
    catch { } finally { setLoading(false) }
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
      } else {
        const res = await createForm(payload)
        setForms(fs => [res.data, ...fs])
      }
      setShowModal(false)
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar formulário?')) return
    await deleteForm(id)
    setForms(fs => fs.filter(x => x.id !== id))
  }

  const handleToggle = async (f: any) => {
    const res = await updateForm(f.id, { isActive: !f.isActive })
    setForms(fs => fs.map(x => x.id === f.id ? res.data : x))
  }

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Formulários</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Captura leads com formulários personalizados</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus size={16} /> Novo formulário
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>A carregar...</div>
      ) : forms.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sem formulários</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Cria formulários para capturar leads automaticamente</p>
          <button onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            Criar primeiro formulário
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(f => (
            <div key={f.id} className="rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</h3>
                  {f.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{f.description}</p>}
                </div>
                <button onClick={() => handleToggle(f)} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {f.isActive ? <ToggleRight size={22} className="text-indigo-500" /> : <ToggleLeft size={22} />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                <span>{JSON.parse(f.fields || '[]').length} campos</span>
                <span>·</span>
                <span>{f._count?.submissions || 0} submissões</span>
                <span>·</span>
                <span style={{ color: f.isActive ? '#22c55e' : 'var(--text-muted)' }}>{f.isActive ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyLink(f.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
                  <Copy size={12} />{copied === f.id ? 'Copiado!' : 'Copiar link'}
                </button>
                <button onClick={() => openEdit(f)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
                  <Eye size={12} /> Editar
                </button>
                <button onClick={() => handleDelete(f.id)}
                  className="p-2 rounded-xl hover:bg-red-50 text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar formulário' : 'Novo formulário'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  placeholder="ex: Formulário de contacto" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Mensagem de confirmação</label>
                <input value={form.thankYouMessage} onChange={e => setForm(f => ({ ...f, thankYouMessage: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Campos do formulário</label>
                  <button onClick={addField}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    <Plus size={12} /> Adicionar campo
                  </button>
                </div>
                {form.fields.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center text-sm" style={{ borderColor: 'var(--input-border)', color: 'var(--text-muted)' }}>
                    Adiciona pelo menos um campo ao formulário
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                        <GripVertical size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)}
                          className="flex-1 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                          style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                          placeholder="Etiqueta do campo" />
                        <div style={{ width: 150 }}>
                          <CustomSelect
                            value={field.type}
                            onChange={val => updateField(field.id, 'type', val)}
                            options={FIELD_TYPES}
                            size="sm"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} />
                          Obrig.
                        </label>
                        <button onClick={() => removeField(field.id)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.name || form.fields.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
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
