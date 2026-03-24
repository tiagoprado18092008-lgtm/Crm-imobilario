import React, { useState, useEffect } from 'react'
import { Zap, Plus, Play, Pause, Trash2, ChevronRight, MessageSquare, Mail, CheckSquare, Clock, Bell, AlertCircle, Loader2 } from 'lucide-react'
import api from '../api/client'

interface Action {
  type: 'SEND_WHATSAPP' | 'SEND_EMAIL' | 'CREATE_TASK' | 'SEND_SMS'
  delay: number
  message: string
  subject?: string
}

interface Rule {
  id: string
  name: string
  trigger: string
  actions: Action[]
  isActive: boolean
  _count?: { logs: number }
}

const TRIGGERS = [
  { value: 'NEW_LEAD', label: 'Novo Lead criado', icon: '👤' },
  { value: 'VISIT_SCHEDULED', label: 'Visita agendada', icon: '🏠' },
  { value: 'MISSED_CALL', label: 'Chamada não atendida', icon: '📞' },
  { value: 'NO_RESPONSE_2H', label: 'Sem resposta após 2h', icon: '⏰' },
  { value: 'LEAD_QUALIFIED', label: 'Lead qualificado', icon: '✅' },
  { value: 'PROPOSAL_SENT', label: 'Proposta enviada', icon: '📋' },
]

const ACTION_TYPES = [
  { value: 'SEND_WHATSAPP', label: 'Enviar WhatsApp', icon: MessageSquare, color: '#25D366' },
  { value: 'SEND_EMAIL', label: 'Enviar Email', icon: Mail, color: '#3b82f6' },
  { value: 'SEND_SMS', label: 'Enviar SMS', icon: Bell, color: '#f59e0b' },
  { value: 'CREATE_TASK', label: 'Criar Tarefa', icon: CheckSquare, color: '#8b5cf6' },
]

export const AutomationsPage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState<Partial<Rule>>({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true })
  const [newAction, setNewAction] = useState<Partial<Action>>({ type: 'SEND_WHATSAPP', delay: 0, message: '' })

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setLoading(true)
      const res = await api.get('/automations')
      const data = res.data.map((r: any) => ({
        ...r,
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
      }))
      setRules(data)
    } catch (err: any) {
      setError('Erro ao carregar automações')
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return
    try {
      await api.patch(`/automations/${id}`, { isActive: !rule.isActive })
      setRules(r => r.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
    } catch {
      setError('Erro ao atualizar automação')
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Eliminar esta automação?')) return
    try {
      await api.delete(`/automations/${id}`)
      setRules(r => r.filter(r => r.id !== id))
    } catch {
      setError('Erro ao eliminar automação')
    }
  }

  const addAction = () => {
    if (!newAction.message) return
    setNewRule(r => ({ ...r, actions: [...(r.actions || []), newAction as Action] }))
    setNewAction({ type: 'SEND_WHATSAPP', delay: 0, message: '' })
  }

  const saveRule = async () => {
    if (!newRule.name || !newRule.trigger || !newRule.actions?.length) return
    try {
      setSaving(true)
      const res = await api.post('/automations', {
        name: newRule.name,
        trigger: newRule.trigger,
        isActive: true,
        actions: newRule.actions,
      })
      const created = { ...res.data, actions: typeof res.data.actions === 'string' ? JSON.parse(res.data.actions) : res.data.actions }
      setRules(r => [...r, created])
      setShowNew(false)
      setNewRule({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true })
    } catch {
      setError('Erro ao criar automação')
    } finally {
      setSaving(false)
    }
  }

  const getTriggerLabel = (trigger: string) => TRIGGERS.find(t => t.value === trigger)?.label || trigger
  const getTriggerIcon = (trigger: string) => TRIGGERS.find(t => t.value === trigger)?.icon || '⚡'
  const getActionConfig = (type: string) => ACTION_TYPES.find(a => a.value === type)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Automações</h2>
          <p className="text-sm text-slate-500 mt-0.5">Workflows automáticos para nunca deixar um lead arrefecer</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} />
          Nova Automação
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Automações ativas', value: rules.filter(r => r.isActive).length, color: '#22c55e' },
          { label: 'Ações configuradas', value: rules.reduce((acc, r) => acc + r.actions.length, 0), color: '#3b82f6' },
          { label: 'Execuções totais', value: rules.reduce((acc, r) => acc + (r._count?.logs || 0), 0), color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rules list */}
      <div className="space-y-4">
        {rules.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma automação configurada</p>
          </div>
        )}
        {rules.map(rule => (
          <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: rule.isActive ? '#eef2ff' : '#f1f5f9' }}>
                  <Zap size={18} style={{ color: rule.isActive ? '#6366f1' : '#94a3b8' }} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{rule.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {getTriggerIcon(rule.trigger)} Trigger: {getTriggerLabel(rule.trigger)}
                    {rule._count?.logs ? ` · ${rule._count.logs} execuções` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: rule.isActive ? '#dcfce7' : '#f1f5f9',
                    color: rule.isActive ? '#16a34a' : '#64748b',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  {rule.isActive ? <><Play size={12} /> Ativo</> : <><Pause size={12} /> Inativo</>}
                </button>
                <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Actions flow */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                ⚡ {getTriggerLabel(rule.trigger)}
              </div>
              {rule.actions.map((action, i) => {
                const cfg = getActionConfig(action.type)
                const Icon = cfg?.icon || MessageSquare
                return (
                  <React.Fragment key={i}>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    {action.delay > 0 && (
                      <>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500" style={{ background: '#fef9c3', border: '1px solid #fef08a' }}>
                          <Clock size={11} />
                          +{action.delay >= 60 ? `${Math.round(action.delay / 60)}h` : `${action.delay}min`}
                        </div>
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                      </>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: `${cfg?.color}15`, color: cfg?.color, border: `1px solid ${cfg?.color}30` }}>
                      <Icon size={12} />
                      {cfg?.label}
                    </div>
                  </React.Fragment>
                )
              })}
              {rule.actions.length === 0 && (
                <span className="text-xs text-slate-400 italic">Sem ações configuradas</span>
              )}
            </div>

            {rule.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-2">Mensagens:</p>
                <div className="space-y-1">
                  {rule.actions.filter(a => a.message).map((action, i) => (
                    <p key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="font-medium">{getActionConfig(action.type)?.label}:</span> {action.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New rule modal */}
      {showNew && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-lg font-bold text-slate-900 mb-5">Nova Automação</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da automação</label>
                <input
                  type="text" value={newRule.name || ''} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
                  placeholder="Ex: Speed to Lead"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ border: '1.5px solid #e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trigger (quando disparar)</label>
                <select
                  value={newRule.trigger} onChange={e => setNewRule(r => ({ ...r, trigger: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ border: '1.5px solid #e2e8f0' }}
                >
                  {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>

              {/* Actions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ações</label>
                {(newRule.actions || []).map((action, i) => {
                  const cfg = getActionConfig(action.type)
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span className="text-xs font-medium" style={{ color: cfg?.color }}>{cfg?.label}</span>
                      {action.delay > 0 && <span className="text-xs text-slate-400">(+{action.delay}min)</span>}
                      <span className="text-xs text-slate-500 truncate flex-1">{action.message}</span>
                    </div>
                  )
                })}

                <div className="mt-3 p-4 rounded-xl space-y-3" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                  <p className="text-xs font-medium text-slate-600">Adicionar ação</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newAction.type} onChange={e => setNewAction(a => ({ ...a, type: e.target.value as any }))}
                      className="px-3 py-2 text-xs rounded-lg outline-none"
                      style={{ border: '1.5px solid #e2e8f0' }}
                    >
                      {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    <input
                      type="number" value={newAction.delay || 0} onChange={e => setNewAction(a => ({ ...a, delay: Number(e.target.value) }))}
                      placeholder="Delay (min)"
                      className="px-3 py-2 text-xs rounded-lg outline-none"
                      style={{ border: '1.5px solid #e2e8f0' }}
                    />
                  </div>
                  <input
                    type="text" value={newAction.message || ''} onChange={e => setNewAction(a => ({ ...a, message: e.target.value }))}
                    placeholder="Mensagem (use {{nome}}, {{consultor}}, {{data}})"
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ border: '1.5px solid #e2e8f0' }}
                  />
                  <button onClick={addAction} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer' }}>
                    + Adicionar ação
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowNew(false); setNewRule({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true }) }} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600" style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveRule} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar Automação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
