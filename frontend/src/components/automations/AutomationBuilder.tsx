'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  X,
  Plus,
  GripVertical,
  Zap,
  GitBranch,
  Clock,
  Bell,
  Repeat,
  Trash2,
  Save,
  Settings,
  Mail,
  MessageSquare,
  Phone,
  CheckSquare,
  Tag,
  Edit3,
  Globe,
  UserCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type {
  AutomationV2,
  Step,
  StepType,
  ActionStep,
  ConditionStep,
  DelayStep,
  WaitEventStep,
  LoopStep,
  ActionType,
  TriggerType,
  Condition,
  DelayUnit,
} from '../../types/automation'
import {
  TRIGGER_LABELS,
  ACTION_LABELS,
  DELAY_UNIT_LABELS,
  WAIT_EVENT_LABELS,
  OPERATOR_LABELS,
} from '../../types/automation'
import { createAutomationV2, updateAutomationV2 } from '../../api/automations.api'
import { CustomSelect } from '../ui/CustomSelect'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STEP_TYPES: {
  type: StepType
  label: string
  icon: React.ElementType
  color: string
  bg: string
  description: string
}[] = [
  { type: 'action',     label: 'Ação',            icon: Zap,       color: 'var(--accent)', bg: '#eff6ff',  description: 'Email, SMS, WhatsApp, tarefa...' },
  { type: 'condition',  label: 'Condição',         icon: GitBranch, color: '#d97706', bg: '#fffbeb',  description: 'Divide o fluxo em Sim / Não' },
  { type: 'delay',      label: 'Aguardar',         icon: Clock,     color: '#16a34a', bg: '#f0fdf4',  description: 'Pausa X tempo antes de continuar' },
  { type: 'wait_event', label: 'Aguardar Evento',  icon: Bell,      color: '#2563eb', bg: '#eff6ff',  description: 'Pausa até acontecer um evento' },
  { type: 'loop',       label: 'Loop',             icon: Repeat,    color: '#db2777', bg: '#fdf2f8',  description: 'Repete steps até condição' },
]

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  send_email:    Mail,
  send_whatsapp: MessageSquare,
  send_sms:      Phone,
  create_task:   CheckSquare,
  change_stage:  ArrowRight,
  add_tag:       Tag,
  remove_tag:    Tag,
  update_field:  Edit3,
  send_webhook:  Globe,
  notify_user:   UserCheck,
}

function newStep(type: StepType): Step {
  const id = crypto.randomUUID()
  switch (type) {
    case 'action':
      return { id, type: 'action', actionType: 'send_email', config: {} } as ActionStep
    case 'condition':
      return { id, type: 'condition', label: '', conditions: [], logic: 'AND', trueBranchStepId: undefined, falseBranchStepId: undefined } as ConditionStep
    case 'delay':
      return { id, type: 'delay', duration: 1, unit: 'days' } as DelayStep
    case 'wait_event':
      return { id, type: 'wait_event', event: 'email_opened', timeoutDays: 7, onTimeout: 'continue' } as WaitEventStep
    case 'loop':
      return { id, type: 'loop', maxIterations: 3, exitCondition: [], stepIds: [] } as LoopStep
  }
}

// ─── SHARED STYLES ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--input-bg, #f9fafb)',
  border: '1px solid var(--input-border, #e5e7eb)',
  borderRadius: 8,
  padding: '7px 10px',
  color: 'var(--text-primary, #111827)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg, #f9fafb)',
  border: '1px solid var(--input-border, #e5e7eb)',
  borderRadius: 8,
  padding: '7px 10px',
  color: 'var(--text-primary, #111827)',
  fontSize: 13,
  outline: 'none',
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  initialData?: AutomationV2
  onSaved: (automation: AutomationV2) => void
}

// ─── CONDITION ROW ───────────────────────────────────────────────────────────

function ConditionRow({
  cond,
  onChange,
  onRemove,
}: {
  cond: Condition
  onChange: (c: Condition) => void
  onRemove: () => void
}) {
  const operators = Object.entries(OPERATOR_LABELS) as [string, string][]
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
      <input
        placeholder="campo (ex: contact.email)"
        value={cond.field}
        onChange={e => onChange({ ...cond, field: e.target.value })}
        style={{ ...inputStyle, flex: 1 }}
      />
      <CustomSelect
        value={cond.operator}
        onChange={v => onChange({ ...cond, operator: v as any })}
        options={operators.map(([k, v]) => ({ value: k, label: v }))}
        size="sm"
      />
      {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
        <input
          placeholder="valor"
          value={String(cond.value ?? '')}
          onChange={e => onChange({ ...cond, value: e.target.value })}
          style={{ ...inputStyle, width: 80 }}
        />
      )}
      <button onClick={onRemove} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ─── STEP EDITOR ─────────────────────────────────────────────────────────────

function StepEditor({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  if (step.type === 'action') {
    const s = step as ActionStep
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Tipo de Ação</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([k, v]) => {
              const Icon = ACTION_ICONS[k] || Zap
              return (
                <button
                  key={k}
                  onClick={() => onChange({ ...s, actionType: k, config: {} })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                    background: s.actionType === k ? '#eff6ff' : 'var(--hover-bg, #f9fafb)',
                    border: `1px solid ${s.actionType === k ? 'var(--accent)' : 'var(--border-color, #e5e7eb)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    color: s.actionType === k ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 11, textAlign: 'left',
                  }}
                >
                  <Icon size={12} />
                  {v}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(s.actionType === 'send_email') && <>
            <input placeholder="Para: {{contact.email}}" value={s.config.to || ''} onChange={e => onChange({ ...s, config: { ...s.config, to: e.target.value } })} style={inputStyle} />
            <input placeholder="Assunto" value={s.config.subject || ''} onChange={e => onChange({ ...s, config: { ...s.config, subject: e.target.value } })} style={inputStyle} />
            <textarea placeholder="Corpo do email..." value={s.config.body || ''} onChange={e => onChange({ ...s, config: { ...s.config, body: e.target.value } })} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
          </>}
          {(s.actionType === 'send_whatsapp' || s.actionType === 'send_sms') && <>
            <input placeholder="Para: {{contact.phone}}" value={s.config.to || ''} onChange={e => onChange({ ...s, config: { ...s.config, to: e.target.value } })} style={inputStyle} />
            <textarea placeholder="Mensagem..." value={s.config.message || ''} onChange={e => onChange({ ...s, config: { ...s.config, message: e.target.value } })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
          </>}
          {s.actionType === 'create_task' && <>
            <input placeholder="Título da tarefa" value={s.config.title || ''} onChange={e => onChange({ ...s, config: { ...s.config, title: e.target.value } })} style={inputStyle} />
            <input placeholder="Descrição (opcional)" value={s.config.description || ''} onChange={e => onChange({ ...s, config: { ...s.config, description: e.target.value } })} style={inputStyle} />
            <input type="number" placeholder="Prazo em dias" value={s.config.dueInDays || ''} onChange={e => onChange({ ...s, config: { ...s.config, dueInDays: parseInt(e.target.value) } })} style={inputStyle} />
          </>}
          {s.actionType === 'change_stage' && (
            <input placeholder="Nova etapa (ex: QUALIFIED)" value={s.config.newStage || ''} onChange={e => onChange({ ...s, config: { ...s.config, newStage: e.target.value } })} style={inputStyle} />
          )}
          {(s.actionType === 'add_tag' || s.actionType === 'remove_tag') && (
            <input placeholder="Tag" value={s.config.tag || ''} onChange={e => onChange({ ...s, config: { ...s.config, tag: e.target.value } })} style={inputStyle} />
          )}
          {s.actionType === 'update_field' && <>
            <input placeholder="Campo (ex: notes)" value={s.config.field || ''} onChange={e => onChange({ ...s, config: { ...s.config, field: e.target.value } })} style={inputStyle} />
            <input placeholder="Valor" value={s.config.value || ''} onChange={e => onChange({ ...s, config: { ...s.config, value: e.target.value } })} style={inputStyle} />
          </>}
          {s.actionType === 'send_webhook' && <>
            <input placeholder="URL" value={s.config.url || ''} onChange={e => onChange({ ...s, config: { ...s.config, url: e.target.value } })} style={inputStyle} />
            <CustomSelect
              value={s.config.method || 'POST'}
              onChange={v => onChange({ ...s, config: { ...s.config, method: v } })}
              options={['POST', 'GET', 'PUT', 'PATCH'].map(m => ({ value: m, label: m }))}
              size="sm"
            />
            <textarea placeholder="Body (JSON)..." value={s.config.webhookBody || ''} onChange={e => onChange({ ...s, config: { ...s.config, webhookBody: e.target.value } })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
          </>}
          {s.actionType === 'notify_user' && <>
            <input placeholder="ID do utilizador" value={s.config.userId || ''} onChange={e => onChange({ ...s, config: { ...s.config, userId: e.target.value } })} style={inputStyle} />
            <input placeholder="Mensagem de notificação" value={s.config.notifyMessage || ''} onChange={e => onChange({ ...s, config: { ...s.config, notifyMessage: e.target.value } })} style={inputStyle} />
          </>}
        </div>

        <div style={{ padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 11, color: '#0369a1' }}>
          Variáveis: <code>{'{{contact.name}}'}</code> <code>{'{{contact.email}}'}</code> <code>{'{{contact.phone}}'}</code>
        </div>
      </div>
    )
  }

  if (step.type === 'condition') {
    const s = step as ConditionStep
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <input placeholder="Rótulo (ex: Lead tem email?)" value={s.label || ''} onChange={e => onChange({ ...s, label: e.target.value })} style={inputStyle} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lógica:</span>
          {(['AND', 'OR'] as const).map(l => (
            <button key={l} onClick={() => onChange({ ...s, logic: l })}
              style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${s.logic === l ? '#d97706' : 'var(--border)'}`, background: s.logic === l ? '#fffbeb' : 'transparent', color: s.logic === l ? '#d97706' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
            >{l}</button>
          ))}
        </div>
        {s.conditions.map((c, i) => (
          <ConditionRow key={i} cond={c}
            onChange={updated => { const conds = [...s.conditions]; conds[i] = updated; onChange({ ...s, conditions: conds }) }}
            onRemove={() => onChange({ ...s, conditions: s.conditions.filter((_, j) => j !== i) })}
          />
        ))}
        <button
          onClick={() => onChange({ ...s, conditions: [...s.conditions, { field: '', operator: 'equals', value: '' }] })}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: 6, color: '#d97706', cursor: 'pointer', fontSize: 12, width: 'fit-content' }}
        >
          <Plus size={11} /> Adicionar condição
        </button>
      </div>
    )
  }

  if (step.type === 'delay') {
    const s = step as DelayStep
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aguardar</span>
        <input type="number" min={1} value={s.duration} onChange={e => onChange({ ...s, duration: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, width: 70 }} />
        <CustomSelect
          value={s.unit}
          onChange={v => onChange({ ...s, unit: v as DelayUnit })}
          options={(Object.entries(DELAY_UNIT_LABELS) as [DelayUnit, string][]).map(([k, v]) => ({ value: k, label: v }))}
          size="sm"
        />
      </div>
    )
  }

  if (step.type === 'wait_event') {
    const s = step as WaitEventStep
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>Aguardar:</span>
          <div style={{ flex: 1 }}>
            <CustomSelect
              value={s.event}
              onChange={v => onChange({ ...s, event: v as any })}
              options={(Object.entries(WAIT_EVENT_LABELS) as [string, string][]).map(([k, v]) => ({ value: k, label: v }))}
              size="sm"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>Timeout:</span>
          <input type="number" min={1} value={s.timeoutDays || ''} placeholder="dias" onChange={e => onChange({ ...s, timeoutDays: parseInt(e.target.value) || undefined })} style={{ ...inputStyle, width: 70 }} />
          <CustomSelect
            value={s.onTimeout}
            onChange={v => onChange({ ...s, onTimeout: v as any })}
            options={[{ value: 'continue', label: 'Continuar' }, { value: 'stop', label: 'Parar' }]}
            size="sm"
          />
        </div>
      </div>
    )
  }

  if (step.type === 'loop') {
    const s = step as LoopStep
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Máx. iterações:</span>
        <input type="number" min={1} max={100} value={s.maxIterations} onChange={e => onChange({ ...s, maxIterations: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, width: 70 }} />
      </div>
    )
  }

  return null
}

// ─── STEP CARD ───────────────────────────────────────────────────────────────

function StepCard({ step, index, isEditing, onEdit, onDelete, onChange, dragHandleProps }: {
  step: Step; index: number; isEditing: boolean
  onEdit: () => void; onDelete: () => void
  onChange: (s: Step) => void; dragHandleProps: any
}) {
  const meta = STEP_TYPES.find(t => t.type === step.type)!
  const Icon = meta.icon

  const getStepSummary = () => {
    if (step.type === 'action') return ACTION_LABELS[(step as ActionStep).actionType] || (step as ActionStep).actionType
    if (step.type === 'condition') { const s = step as ConditionStep; return s.label || `${s.conditions.length} condição(ões)` }
    if (step.type === 'delay') { const s = step as DelayStep; return `Aguardar ${s.duration} ${DELAY_UNIT_LABELS[s.unit]}` }
    if (step.type === 'wait_event') return (WAIT_EVENT_LABELS as any)[(step as WaitEventStep).event] || (step as WaitEventStep).event
    if (step.type === 'loop') return `Máx. ${(step as LoopStep).maxIterations} iterações`
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: 'var(--bg-card, #fff)',
        border: `1px solid var(--border-color, #e5e7eb)`,
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <div {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)', flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} style={{ color: meta.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{meta.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getStepSummary()}</div>
        </div>
        <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 6, background: isEditing ? meta.bg : 'transparent', border: `1px solid ${isEditing ? meta.color : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isEditing ? meta.color : 'var(--text-muted)', flexShrink: 0 }}>
          {isEditing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={onDelete}
          style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as any).style.color = '#dc2626'; (e.currentTarget as any).style.background = '#fef2f2'; (e.currentTarget as any).style.borderColor = '#fecaca' }}
          onMouseLeave={e => { (e.currentTarget as any).style.color = 'var(--text-muted)'; (e.currentTarget as any).style.background = 'transparent'; (e.currentTarget as any).style.borderColor = 'transparent' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderTop: `1px solid var(--border-color, #e5e7eb)` }}
          >
            <div style={{ padding: '12px 16px', background: 'var(--hover-bg, #f9fafb)' }}>
              <StepEditor step={step} onChange={onChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── ADD STEP BUTTON ─────────────────────────────────────────────────────────

function AddStepButton({ onAdd, show, onToggle }: {
  onAdd: (type: StepType) => void; show: boolean; onToggle: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: show ? 10 : 1 }}>
      <div style={{ width: 1, height: 14, background: 'var(--border-color, #e5e7eb)' }} />
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: show ? 'var(--accent)' : '#fff',
          border: `1px solid ${show ? 'var(--accent)' : '#d1d5db'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: show ? '#fff' : '#6b7280', transition: 'all 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Plus size={10} />
      </button>
      <div style={{ width: 1, height: 14, background: 'var(--border-color, #e5e7eb)' }} />

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            style={{
              position: 'absolute', top: 36, zIndex: 100,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10, padding: 6, width: 240,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {STEP_TYPES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.type}
                  onClick={() => { onAdd(t.type); onToggle() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderRadius: 7, width: '100%', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as any).style.background = t.bg }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} style={{ color: t.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{t.description}</div>
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AutomationBuilder({ open, onClose, initialData, onSaved }: Props) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [triggerType, setTriggerType] = useState<TriggerType>((initialData?.trigger?.type as TriggerType) || 'lead_created')
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(initialData?.trigger?.config || {})
  const [steps, setSteps] = useState<Step[]>(initialData?.steps || [])
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [addingAtIndex, setAddingAtIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description || '')
      setTriggerType((initialData.trigger?.type as TriggerType) || 'lead_created')
      setTriggerConfig(initialData.trigger?.config || {})
      setSteps(initialData.steps || [])
    } else {
      setName(''); setDescription(''); setTriggerType('lead_created'); setTriggerConfig({}); setSteps([])
    }
    setEditingStepId(null); setError('')
  }, [initialData, open])

  const addStep = (type: StepType, afterIndex: number) => {
    const step = newStep(type)
    const newSteps = [...steps]
    newSteps.splice(afterIndex + 1, 0, step)
    setSteps(newSteps)
    setEditingStepId(step.id)
    setAddingAtIndex(null)
  }

  const updateStep = (id: string, updated: Step) => setSteps(steps.map(s => s.id === id ? updated : s))
  const deleteStep = (id: string) => { setSteps(steps.filter(s => s.id !== id)); if (editingStepId === id) setEditingStepId(null) }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...steps]
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    setSteps(reordered)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, trigger: { type: triggerType, config: triggerConfig }, steps }
      const result = initialData?.id ? await updateAutomationV2(initialData.id, payload) : await createAutomationV2(payload)
      onSaved(result.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao guardar automação')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'stretch' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        style={{
          display: 'flex', flex: 1,
          background: '#f9fafb',
          margin: 20,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div style={{
          width: 300, flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                {initialData ? 'Editar Automação' : 'Nova Automação'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>Configura o fluxo automático</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          {/* Config */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>Nome *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Boas-vindas a novo lead" style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..." style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Trigger (Acionador)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(Object.entries(TRIGGER_LABELS) as [TriggerType, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setTriggerType(k)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                      background: triggerType === k ? '#eff6ff' : 'transparent',
                      border: `1px solid ${triggerType === k ? 'var(--accent)' : '#e5e7eb'}`,
                      borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: triggerType === k ? 'var(--accent)' : '#d1d5db', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: triggerType === k ? 'var(--accent)' : '#374151', fontWeight: triggerType === k ? 600 : 400 }}>{v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Steps configurados</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{steps.length}</div>
            </div>

            {error && (
              <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}
          </div>

          {/* Save */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '10px 0',
                background: 'var(--accent)', border: 'none', borderRadius: 8,
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Save size={14} />
              {saving ? 'A guardar...' : 'Guardar Automação'}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL — Canvas ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: '#f9fafb' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Canvas</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>
              Arrasta os steps para reordenar. Clica em "+" para adicionar.
            </p>
          </div>

          {/* Trigger chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: '#eff6ff', border: '1px solid var(--accent)', borderRadius: 100, marginBottom: 0 }}>
            <Zap size={11} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>TRIGGER</span>
            <span style={{ fontSize: 12, color: '#4338ca' }}>{TRIGGER_LABELS[triggerType]}</span>
          </div>

          {/* Steps */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="steps">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', maxWidth: 560 }}>
                  <AddStepButton
                    show={addingAtIndex === -1}
                    onToggle={() => setAddingAtIndex(addingAtIndex === -1 ? null : -1)}
                    onAdd={(type) => addStep(type, -1)}
                  />

                  {steps.length === 0 && (
                    <div style={{
                      padding: '36px 24px', textAlign: 'center',
                      border: '2px dashed #e5e7eb', borderRadius: 10,
                      color: '#9ca3af', fontSize: 13, background: '#fff',
                    }}>
                      <Plus size={24} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                      Clica em "+" para adicionar o primeiro step
                    </div>
                  )}

                  <AnimatePresence>
                    {steps.map((step, index) => (
                      <Draggable key={step.id} draggableId={step.id} index={index}>
                        {(drag) => (
                          <div ref={drag.innerRef} {...drag.draggableProps}>
                            <StepCard
                              step={step}
                              index={index}
                              isEditing={editingStepId === step.id}
                              onEdit={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                              onDelete={() => deleteStep(step.id)}
                              onChange={(updated) => updateStep(step.id, updated)}
                              dragHandleProps={drag.dragHandleProps}
                            />
                            <AddStepButton
                              show={addingAtIndex === index}
                              onToggle={() => setAddingAtIndex(addingAtIndex === index ? null : index)}
                              onAdd={(type) => addStep(type, index)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </motion.div>
    </div>
  )
}
