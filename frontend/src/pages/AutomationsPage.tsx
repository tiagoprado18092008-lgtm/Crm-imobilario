import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  MessageSquare,
  Mail,
  CheckSquare,
  Clock,
  Bell,
  Loader2,
  Users,
  Edit3,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Repeat,
  Settings,
} from 'lucide-react'
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  listAutomationsV2,
  deleteAutomationV2,
  toggleAutomationV2,
} from '../api/automations.api'
import { useUIStore } from '../store/ui.store'
import { CustomSelect } from '../components/ui/CustomSelect'
import AutomationBuilder from '../components/automations/AutomationBuilder'
import EnrollmentPanel from '../components/automations/EnrollmentPanel'
import type { AutomationV2, TriggerType } from '../types/automation'
import { TRIGGER_LABELS } from '../types/automation'

/* ── Style tokens ─────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
}

// ─── V1 TYPES ────────────────────────────────────────────────────────────────

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
  { value: 'NEW_LEAD', label: 'Novo Lead criado' },
  { value: 'VISIT_SCHEDULED', label: 'Visita agendada' },
  { value: 'MISSED_CALL', label: 'Chamada não atendida' },
  { value: 'NO_RESPONSE_2H', label: 'Sem resposta após 2h' },
  { value: 'LEAD_QUALIFIED', label: 'Lead qualificado' },
  { value: 'PROPOSAL_SENT', label: 'Proposta enviada' },
]

const ACTION_TYPES = [
  { value: 'SEND_WHATSAPP', label: 'Enviar WhatsApp', icon: MessageSquare, color: '#25D366' },
  { value: 'SEND_EMAIL', label: 'Enviar Email', icon: Mail, color: 'var(--accent)' },
  { value: 'SEND_SMS', label: 'Enviar SMS', icon: Bell, color: '#f59e0b' },
  { value: 'CREATE_TASK', label: 'Criar Tarefa', icon: CheckSquare, color: '#8b5cf6' },
]

// ─── TRIGGER ICON/COLOR ────────────────────────────────────────────────────

const TRIGGER_STYLE: Record<TriggerType, { color: string; bg: string }> = {
  lead_created:       { color: '#16a34a', bg: '#f0fdf4' },
  lead_stage_changed: { color: '#d97706', bg: '#fffbeb' },
  lead_assigned:      { color: '#2563eb', bg: '#eff6ff' },
  lead_tag_added:     { color: '#9333ea', bg: '#fdf4ff' },
  property_added:     { color: '#db2777', bg: '#fdf2f8' },
  form_submitted:     { color: '#059669', bg: '#ecfdf5' },
  scheduled:          { color: '#ea580c', bg: '#fff7ed' },
}

// ─── V2 AUTOMATION CARD ───────────────────────────────────────────────────

function AutomationV2Card({
  automation,
  onEdit,
  onDelete,
  onToggle,
  onViewEnrollments,
}: {
  automation: AutomationV2
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onViewEnrollments: () => void
}) {
  const triggerType = automation.trigger?.type as TriggerType
  const triggerStyle = TRIGGER_STYLE[triggerType] || { color: '#818cf8', bg: 'rgba(46,107,230,0.12)' }
  const triggerLabel = TRIGGER_LABELS[triggerType] || triggerType

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 20,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Active indicator line */}
      {automation.isActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, var(--accent), #818cf8)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: automation.isActive ? '#eff6ff' : 'var(--surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={20} style={{ color: automation.isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {automation.name}
            </h3>
            {/* Toggle badge */}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
              background: automation.isActive ? '#f0fdf4' : 'var(--surface-3)',
              color: automation.isActive ? '#16a34a' : 'var(--text-muted)',
            }}>
              {automation.isActive ? 'ATIVO' : 'INATIVO'}
            </span>
          </div>

          {automation.description && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {automation.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Trigger badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 100,
              background: triggerStyle.bg, color: triggerStyle.color,
              fontSize: 11, fontWeight: 600,
            }}>
              <Zap size={9} /> {triggerLabel}
            </span>

            {/* Step count */}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {automation.steps?.length || 0} steps
            </span>

            {/* Enrollment count */}
            {(automation._count?.enrollments || 0) > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <Users size={11} /> {automation._count!.enrollments} lead(s)
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={onViewEnrollments}
            title="Ver leads inscritos"
            style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}
          >
            <Users size={14} />
          </button>
          <button
            onClick={onEdit}
            title="Editar"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onToggle}
            title={automation.isActive ? 'Desativar' : 'Ativar'}
            style={{ width: 32, height: 32, borderRadius: 8, background: automation.isActive ? '#f0fdf4' : 'var(--surface-3)', border: `1px solid ${automation.isActive ? '#bbf7d0' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: automation.isActive ? '#16a34a' : 'var(--text-muted)' }}
          >
            {automation.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as any).style.color = '#dc2626'; (e.currentTarget as any).style.borderColor = '#fecaca'; (e.currentTarget as any).style.background = '#fef2f2' }}
            onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.borderColor = 'transparent'; (e.currentTarget as any).style.background = 'transparent' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const AutomationsPage: React.FC = () => {
  const { showToast } = useUIStore()

  // Tab state
  const [activeTab, setActiveTab] = useState<'v2' | 'v1'>('v2')

  // V1 state
  const [rules, setRules] = useState<Rule[]>([])
  const [v1Loading, setV1Loading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState<Partial<Rule>>({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true })
  const [newAction, setNewAction] = useState<Partial<Action>>({ type: 'SEND_WHATSAPP', delay: 0, message: '' })

  // V2 state
  const [automationsV2, setAutomationsV2] = useState<AutomationV2[]>([])
  const [v2Loading, setV2Loading] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | undefined>()
  const [enrollmentPanelOpen, setEnrollmentPanelOpen] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationV2 | null>(null)

  useEffect(() => {
    if (activeTab === 'v1') loadRules()
    else loadV2()
  }, [activeTab])

  // ── V1 functions ──────────────────────────────────────────────────────────

  const loadRules = async () => {
    try {
      setV1Loading(true)
      const res = await listAutomations()
      const data = (Array.isArray(res.data) ? res.data : res.data?.data ?? []).map((r: any) => ({
        ...r,
        actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : r.actions,
      }))
      setRules(data)
    } catch {
      showToast('Erro ao carregar automações.', 'error')
    } finally {
      setV1Loading(false)
    }
  }

  const toggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return
    try {
      await updateAutomation(id, { isActive: !rule.isActive })
      setRules(r => r.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
    } catch {
      showToast('Erro ao atualizar automação.', 'error')
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Eliminar esta automação?')) return
    try {
      await deleteAutomation(id)
      setRules(r => r.filter(r => r.id !== id))
    } catch {
      showToast('Erro ao eliminar automação.', 'error')
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
      const res = await createAutomation({
        name: newRule.name!,
        trigger: newRule.trigger!,
        isActive: true,
        actions: newRule.actions!,
      })
      const created = { ...res.data, actions: typeof res.data.actions === 'string' ? JSON.parse(res.data.actions) : res.data.actions }
      setRules(r => [...r, created])
      setShowNew(false)
      setNewRule({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true })
      showToast('Automação criada.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao criar automação.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const getTriggerLabel = (trigger: string) => TRIGGERS.find(t => t.value === trigger)?.label || trigger
  const getActionConfig = (type: string) => ACTION_TYPES.find(a => a.value === type)

  // ── V2 functions ──────────────────────────────────────────────────────────

  const loadV2 = async () => {
    try {
      setV2Loading(true)
      const res = await listAutomationsV2()
      setAutomationsV2(Array.isArray(res.data) ? res.data : [])
    } catch {
      showToast('Erro ao carregar automações.', 'error')
    } finally {
      setV2Loading(false)
    }
  }

  const handleV2Toggle = async (id: string) => {
    try {
      const res = await toggleAutomationV2(id)
      setAutomationsV2(list => list.map(a => a.id === id ? res.data : a))
    } catch {
      showToast('Erro ao alterar estado.', 'error')
    }
  }

  const handleV2Delete = async (id: string) => {
    if (!confirm('Eliminar esta automação e todos os dados associados?')) return
    try {
      await deleteAutomationV2(id)
      setAutomationsV2(list => list.filter(a => a.id !== id))
      showToast('Automação eliminada.', 'success')
    } catch {
      showToast('Erro ao eliminar automação.', 'error')
    }
  }

  const openBuilder = (automation?: AutomationV2) => {
    setEditingAutomation(automation)
    setBuilderOpen(true)
  }

  const handleBuilderSaved = (automation: AutomationV2) => {
    setAutomationsV2(list => {
      const exists = list.find(a => a.id === automation.id)
      if (exists) return list.map(a => a.id === automation.id ? automation : a)
      return [automation, ...list]
    })
    setBuilderOpen(false)
    showToast(editingAutomation ? 'Automação atualizada.' : 'Automação criada.', 'success')
  }

  // V2 stats
  const v2Stats = {
    total: automationsV2.length,
    active: automationsV2.filter(a => a.isActive).length,
    totalEnrollments: automationsV2.reduce((acc, a) => acc + (a._count?.enrollments || 0), 0),
    activeEnrollments: 0, // would need separate query
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
          {(['v2', 'v1'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
                transition: 'all 0.2s',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab === 'v2' ? 'Automações' : 'Regras Clássicas'}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          {activeTab === 'v2' ? (
            <button
              onClick={() => openBuilder()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} /> Nova Automação
            </button>
          ) : (
            <button onClick={() => setShowNew(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} /> Nova Regra
            </button>
          )}
        </div>
      </div>

      {/* ═══ V2 TAB ═══ */}
        {activeTab === 'v2' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total de automações', value: v2Stats.total, color: 'var(--accent)' },
                { label: 'Ativas', value: v2Stats.active, color: '#16a34a' },
                { label: 'Total de inscrições', value: v2Stats.totalEnrollments, color: '#2563eb' },
                { label: 'Tipos de trigger', value: new Set(automationsV2.map(a => a.trigger?.type)).size, color: '#d97706' },
              ].map(s => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ ...card, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </motion.div>
              ))}
            </div>

            {v2Loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : automationsV2.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ ...card, padding: '60px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div style={{ width: 64, height: 64, borderRadius: 20, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Zap size={28} style={{ color: 'var(--accent)' }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Ainda não tens automações
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Cria o teu primeiro fluxo automático para nutrir leads sem esforço
                </p>
                <button
                  onClick={() => openBuilder()}
                  style={{ padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus size={16} /> Criar primeira automação
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AnimatePresence>
                  {automationsV2.map(automation => (
                    <AutomationV2Card
                      key={automation.id}
                      automation={automation}
                      onEdit={() => openBuilder(automation)}
                      onDelete={() => handleV2Delete(automation.id)}
                      onToggle={() => handleV2Toggle(automation.id)}
                      onViewEnrollments={() => {
                        setSelectedAutomation(automation)
                        setEnrollmentPanelOpen(true)
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ═══ V1 TAB ═══ */}
        {activeTab === 'v1' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Regras ativas', value: rules.filter(r => r.isActive).length, color: '#16a34a' },
                { label: 'Ações configuradas', value: rules.reduce((acc, r) => acc + r.actions.length, 0), color: '#2563eb' },
                { label: 'Execuções totais', value: rules.reduce((acc, r) => acc + (r._count?.logs || 0), 0), color: 'var(--accent)' },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {v1Loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : rules.length === 0 ? (
              <div style={{ ...card, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Zap size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhuma regra configurada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map(rule => (
                  <div key={rule.id} style={{ ...card, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: rule.isActive ? '#eff6ff' : 'var(--surface-3)' }}>
                          <Zap size={18} style={{ color: rule.isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rule.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Trigger: {getTriggerLabel(rule.trigger)}
                            {rule._count?.logs ? ` · ${rule._count.logs} execuções` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleRule(rule.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: rule.isActive ? '#f0fdf4' : 'var(--surface-3)',
                            color: rule.isActive ? '#16a34a' : 'var(--text-muted)',
                            border: `1px solid ${rule.isActive ? '#bbf7d0' : 'var(--border)'}`, cursor: 'pointer',
                          }}>
                          {rule.isActive ? <><Play size={12} /> Ativo</> : <><Pause size={12} /> Inativo</>}
                        </button>
                        <button onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded-lg"
                          style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.currentTarget as any).style.color = '#dc2626'; (e.currentTarget as any).style.background = '#fef2f2' }}
                          onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'none' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        {getTriggerLabel(rule.trigger)}
                      </div>
                      {rule.actions.map((action, i) => {
                        const cfg = getActionConfig(action.type)
                        const Icon = cfg?.icon || MessageSquare
                        return (
                          <React.Fragment key={i}>
                            <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                            {action.delay > 0 && (
                              <>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                                  style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706' }}>
                                  <Clock size={11} />
                                  +{action.delay >= 60 ? `${Math.round(action.delay / 60)}h` : `${action.delay}min`}
                                </div>
                                <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
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
                        <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Sem ações configuradas</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      {/* ═══ V1 NEW RULE MODAL ═══ */}
      {showNew && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Nova Regra Clássica</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Nome
                </label>
                <input type="text" value={newRule.name || ''}
                  onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
                  placeholder="Ex: Speed to Lead"
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <CustomSelect
                  label="Trigger"
                  value={newRule.trigger}
                  onChange={val => setNewRule(r => ({ ...r, trigger: val }))}
                  options={TRIGGERS.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Ações
                </label>
                {(newRule.actions || []).map((action, i) => {
                  const cfg = getActionConfig(action.type)
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2 p-3 rounded-xl"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                      <span className="text-xs font-medium" style={{ color: cfg?.color }}>{cfg?.label}</span>
                      {action.delay > 0 && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(+{action.delay}min)</span>
                      )}
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{action.message}</span>
                    </div>
                  )
                })}
                <div className="mt-3 p-4 rounded-xl space-y-3"
                  style={{ background: 'var(--surface-3)', border: '1px dashed var(--border)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Adicionar ação</p>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomSelect
                      value={newAction.type}
                      onChange={val => setNewAction(a => ({ ...a, type: val as any }))}
                      options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label }))}
                      size="sm"
                    />
                    <input type="number" value={newAction.delay || 0}
                      onChange={e => setNewAction(a => ({ ...a, delay: Number(e.target.value) }))}
                      placeholder="Delay (min)"
                      className="px-3 py-2 text-xs rounded-lg outline-none"
                      style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
                  </div>
                  <input type="text" value={newAction.message || ''}
                    onChange={e => setNewAction(a => ({ ...a, message: e.target.value }))}
                    placeholder="Mensagem (use {{nome}}, {{consultor}}, {{data}})"
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
                  <button onClick={addAction}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: '#eff6ff', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}>
                    + Adicionar ação
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowNew(false); setNewRule({ name: '', trigger: 'NEW_LEAD', actions: [], isActive: true }) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveRule} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--accent)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ V2 BUILDER ═══ */}
      <AutomationBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialData={editingAutomation}
        onSaved={handleBuilderSaved}
      />

      {/* ═══ ENROLLMENT PANEL ═══ */}
      {selectedAutomation && (
        <EnrollmentPanel
          open={enrollmentPanelOpen}
          onClose={() => setEnrollmentPanelOpen(false)}
          automationId={selectedAutomation.id}
          automationName={selectedAutomation.name}
        />
      )}
    </div>
  )
}
