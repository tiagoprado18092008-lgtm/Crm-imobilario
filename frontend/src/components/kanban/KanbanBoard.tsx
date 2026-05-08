import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus, X, Edit, Trash2, Search, SlidersHorizontal,
  ArrowUpDown, Columns, LayoutList, LayoutGrid, ChevronDown,
  ArrowUp, ArrowDown, Download, Check, Upload,
} from 'lucide-react'
import { ImportModal } from '../import/ImportModal'
import { QuickActionModal } from './QuickActionModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, moveOpportunityStage } from '../../api/opportunities.api'
import { getContacts } from '../../api/contacts.api'
import { getProperties } from '../../api/properties.api'
import { getUsers } from '../../api/users.api'
import { getInteractions } from '../../api/interactions.api'
import { getTasks } from '../../api/tasks.api'
import type { Opportunity, Contact, Property, User } from '../../types'
import { KanbanColumn } from './KanbanColumn'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { CustomSelect } from '../ui/CustomSelect'
import { DatePickerInput } from '../ui/DatePickerInput'
import { Badge } from '../ui/Badge'
import { PageSpinner } from '../ui/Spinner'
import { useUIStore } from '../../store/ui.store'
import { STAGE_ORDER, STAGE_LABELS } from '../../utils/constants'
import type { PipelineStage, Pipeline } from '../../api/pipelines.api'
import { getPipelines, createPipeline, deletePipeline } from '../../api/pipelines.api'
import { formatCurrency, formatDate, getInitials } from '../../utils/formatters'

const oppSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  stage: z.string(),
  value: z.string().optional(),
  source: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  contactId: z.string().min(1, 'Contacto obrigatório'),
  propertyId: z.string().optional(),
  assignedToId: z.string().min(1, 'Responsável obrigatório'),
  lostReason: z.string().optional(),
  probability: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  // Dynamic fields
  budget_min: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().positive().optional()),
  budget_max: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().positive().optional()),
  interest_type: z.string().optional(),
  timeline: z.string().optional(),
  selling_also: z.boolean().optional(),
  needs_financing: z.boolean().optional(),
  property_address: z.string().optional(),
  asking_price: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().positive().optional()),
  sale_reason: z.string().optional(),
  buying_also: z.boolean().optional(),
})

type OppFormData = z.infer<typeof oppSchema>

interface OppFormProps {
  opportunity?: Opportunity
  initialStage?: string
  activePipeline?: Pipeline | null
  onSuccess: () => void
  onCancel: () => void
}

const SOURCE_OPTIONS_FORM = [
  'Website', 'E-mail', 'Presencial', 'Portal imobiliário', 'Indicação', 'Telefone/WhatsApp',
]

const SALE_REASON_OPTIONS = [
  'Mudança de residência', 'Separação / Divórcio', 'Herança',
  'Dificuldades financeiras', 'Upgrade / Downgrade', 'Investimento', 'Outro',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const,
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4,
}

const OppForm: React.FC<OppFormProps> = ({ opportunity, initialStage, activePipeline, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])

  const { register, handleSubmit, watch, setValue: setFormValue, formState: { errors } } = useForm<OppFormData>({
    resolver: zodResolver(oppSchema),
    defaultValues: {
      title: opportunity?.title || '',
      stage: opportunity?.stage || (opportunity as any)?.stageId || initialStage || 'LEAD_IN',
      value: opportunity?.value?.toString() || '',
      source: opportunity?.source || '',
      expectedCloseDate: opportunity?.expectedCloseDate ? opportunity.expectedCloseDate.slice(0, 10) : '',
      notes: opportunity?.notes || '',
      contactId: opportunity?.contactId || '',
      propertyId: opportunity?.propertyId || '',
      assignedToId: opportunity?.assignedToId || currentUser?.id || '',
      lostReason: opportunity?.lostReason || '',
      probability: (opportunity as any)?.probability ?? 50,
      budget_min: (opportunity as any)?.budget_min,
      budget_max: (opportunity as any)?.budget_max,
      interest_type: (opportunity as any)?.interest_type || '',
      timeline: (opportunity as any)?.timeline || '',
      selling_also: (opportunity as any)?.selling_also ?? false,
      needs_financing: (opportunity as any)?.needs_financing ?? false,
      property_address: (opportunity as any)?.property_address || '',
      asking_price: (opportunity as any)?.asking_price,
      sale_reason: (opportunity as any)?.sale_reason || '',
      buying_also: (opportunity as any)?.buying_also ?? false,
    }
  })

  useEffect(() => {
    if (!opportunity) {
      // If pipeline has dynamic stages, initialStage should be the first stage UUID
      const hasDynamicStages = activePipeline && activePipeline.stages && activePipeline.stages.length > 0
      const defaultStage = hasDynamicStages
        ? (initialStage && activePipeline!.stages.find(s => s.id === initialStage)
            ? initialStage
            : activePipeline!.stages[0].id)
        : (initialStage || 'LEAD_IN')
      setFormValue('stage', defaultStage)
    }
    Promise.all([getContacts({ limit: 200 }), getProperties({ limit: 200 }), getUsers()])
      .then(([cRes, pRes, uRes]) => {
        const cd = cRes.data; setContacts(Array.isArray(cd) ? cd : cd.data || [])
        const pd = pRes.data; setProperties(Array.isArray(pd) ? pd : pd.data || [])
        const ud = uRes.data; setUsers(Array.isArray(ud) ? ud : ud.data || [])
        // Always re-set assignedToId after options load to prevent DOM race condition
        // where select snaps to first item before options are available
        if (!opportunity && currentUser?.id) {
          setTimeout(() => setFormValue('assignedToId', currentUser.id), 0)
        }
      })
      .catch(() => {})
  }, [])

  const onSubmit = async (data: OppFormData) => {
    setSubmitting(true)
    try {
      // When using dynamic pipeline stages, stageId is a UUID; map to a base stage for DB
      const hasDynamicStages = activePipeline && activePipeline.stages && activePipeline.stages.length > 0
      const resolvedStageId = hasDynamicStages ? data.stage : undefined
      // For dynamic pipelines, stage enum defaults to LEAD_IN (stageId carries the real stage)
      const resolvedStage = hasDynamicStages ? 'LEAD_IN' : data.stage
      const basePayload = {
        title: data.title,
        stage: resolvedStage,
        stageId: resolvedStageId || undefined,
        pipelineId: activePipeline?.id || undefined,
        value: data.value ? Number(data.value) : undefined,
        source: data.source || undefined,
        expectedCloseDate: data.expectedCloseDate || undefined,
        notes: data.notes || undefined,
        contactId: data.contactId,
        propertyId: data.propertyId || undefined,
        assignedToId: data.assignedToId,
        lostReason: data.lostReason || undefined,
        probability: data.probability ?? 50,
      }
      const dynamicPayload = contactType === 'BUYER' ? {
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        interest_type: data.interest_type || undefined,
        timeline: data.timeline || undefined,
        selling_also: data.selling_also ?? false,
        needs_financing: data.needs_financing ?? false,
      } : contactType === 'OWNER' ? {
        property_address: data.property_address || undefined,
        asking_price: data.asking_price,
        sale_reason: data.sale_reason || undefined,
        buying_also: data.buying_also ?? false,
      } : {}
      const payload = { ...basePayload, ...dynamicPayload }
      if (opportunity) {
        await updateOpportunity(opportunity.id, payload)
        showToast('Oportunidade atualizada', 'success')
      } else {
        await createOpportunity(payload)
        showToast('Oportunidade criada', 'success')
      }
      onSuccess()
    } catch (err: any) {
      const details = err?.response?.data?.details
      const msg = details?.length
        ? details.map((d: any) => d.message).join(', ')
        : err?.response?.data?.error || 'Erro ao guardar oportunidade'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const watchedStage = watch('stage')
  const watchedContactId = watch('contactId')
  const watchedAskingPrice = watch('asking_price')
  const sellingAlso = watch('selling_also') ?? false
  const needsFinancing = watch('needs_financing') ?? false
  const buyingAlso = watch('buying_also') ?? false
  const selectedContact = contacts.find(c => c.id === watchedContactId)
  const contactType = selectedContact?.type
  const oppCommission = watchedAskingPrice ? Number(watchedAskingPrice) * 0.05 : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Título" required error={errors.title?.message} {...register('title')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Select label="Fase" options={
          activePipeline && activePipeline.stages && activePipeline.stages.length > 0
            ? activePipeline.stages.map(s => ({ value: s.id, label: s.name }))
            : STAGE_ORDER.map(s => ({ value: s, label: STAGE_LABELS[s] }))
        } {...register('stage')} />
        <Input label="Valor (€)" type="number" {...register('value')} />
        <div>
          <label style={labelStyle}>Probabilidade (%)</label>
          <input {...register('probability', { valueAsNumber: true })} type="number" min={0} max={100} placeholder="50" style={inputStyle} />
        </div>
        <Select label="Contacto" required error={errors.contactId?.message} placeholder="Selecionar contacto" options={contacts.map(c => ({ value: c.id, label: c.name }))} {...register('contactId')} />
        <Select label="Responsável" required error={errors.assignedToId?.message} placeholder="Selecionar responsável" options={users.map(u => ({ value: u.id, label: u.name }))} {...register('assignedToId')} />
        <Select label="Fonte" placeholder="Selecionar fonte" options={SOURCE_OPTIONS_FORM.map(s => ({ value: s, label: s }))} {...register('source')} />
        <Select label="Propriedade" placeholder="Nenhuma" options={properties.map(p => ({ value: p.id, label: p.title }))} {...register('propertyId')} />
        <DatePickerInput
          label="Data de Fecho Prevista"
          value={watch('expectedCloseDate')}
          onChange={v => setFormValue('expectedCloseDate', v, { shouldValidate: true })}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Notas</label>
        <textarea
          {...register('notes')}
          rows={3}
          style={{
            width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--surface-2)', color: 'var(--text-primary)',
            outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(46,107,230,0.12)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      {watchedStage === 'CLOSED_LOST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Motivo da Perda</label>
          <textarea
            {...register('lostReason')}
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
              border: '1px solid #fca5a5', borderRadius: 8,
              background: '#fff5f5', color: 'var(--text-primary)',
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Dynamic fields — BUYER */}
      {contactType === 'BUYER' && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Perfil de Compra</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Budget Mínimo (€)</label>
              <input {...register('budget_min', { valueAsNumber: true })} type="number" placeholder="ex: 150 000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Budget Máximo (€)</label>
              <input {...register('budget_max', { valueAsNumber: true })} type="number" placeholder="ex: 500 000" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <CustomSelect
                label="Tipo de Imóvel"
                value={watch('interest_type') || ''}
                onChange={v => setFormValue('interest_type', v)}
                placeholder="Selecionar..."
                options={[
                  { value: 'APARTMENT', label: 'Apartamento' },
                  { value: 'HOUSE', label: 'Moradia' },
                  { value: 'COMMERCIAL', label: 'Comercial' },
                  { value: 'LAND', label: 'Terreno' },
                  { value: 'GARAGE', label: 'Garagem' },
                  { value: 'WAREHOUSE', label: 'Armazém' },
                  { value: 'FARM', label: 'Quinta' },
                ]}
              />
            </div>
            <div>
              <CustomSelect
                label="Urgência"
                value={watch('timeline') || ''}
                onChange={v => setFormValue('timeline', v)}
                placeholder="Selecionar..."
                options={[
                  { value: 'IMMEDIATE', label: 'Imediato' },
                  { value: '1_3_MONTHS', label: '1 a 3 meses' },
                  { value: '3_6_MONTHS', label: '3 a 6 meses' },
                  { value: '6_PLUS_MONTHS', label: 'Mais de 6 meses' },
                ]}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" {...register('selling_also')} checked={sellingAlso} onChange={e => setFormValue('selling_also', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
              Pretende também vender
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" {...register('needs_financing')} checked={needsFinancing} onChange={e => setFormValue('needs_financing', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
              Necessita de financiamento
            </label>
          </div>
        </div>
      )}

      {/* Dynamic fields — OWNER */}
      {contactType === 'OWNER' && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Dados do Imóvel</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Morada do Imóvel</label>
              <input {...register('property_address')} type="text" placeholder="ex: Rua das Flores 12, Lisboa" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Asking Price (€)</label>
                <input {...register('asking_price', { valueAsNumber: true })} type="number" placeholder="ex: 320 000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Comissão estimada (5%)</label>
                <input type="text" readOnly value={oppCommission !== null ? `${oppCommission.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €` : '—'} style={{ ...inputStyle, background: 'var(--surface-3)', color: 'var(--text-muted)', cursor: 'default' }} />
              </div>
            </div>
            <div>
              <CustomSelect
                label="Razão da Venda"
                value={watch('sale_reason') || ''}
                onChange={v => setFormValue('sale_reason', v)}
                placeholder="Selecionar..."
                options={SALE_REASON_OPTIONS.map(r => ({ value: r, label: r }))}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" {...register('buying_also')} checked={buyingAlso} onChange={e => setFormValue('buying_also', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
              Necessita de comprar além de vender
            </label>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>{opportunity ? 'Atualizar' : 'Criar'} Oportunidade</Button>
      </div>
    </form>
  )
}

type ColumnsMap = Record<string, Opportunity[]>
type SortField = 'value' | 'createdAt' | 'expectedCloseDate' | 'title'
type SortDir = 'asc' | 'desc'

interface KanbanBoardProps {
  pipelineId?: string;
  stages?: PipelineStage[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ pipelineId: externalPipelineId, stages: externalStages }) => {
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null)
  const pipelineId = externalPipelineId ?? activePipeline?.id
  const stages = externalStages ?? activePipeline?.stages
  const { showToast } = useUIStore()
  const [columns, setColumns] = useState<ColumnsMap>({})
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [newStage, setNewStage] = useState<string>('LEAD_IN')
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [editOpp, setEditOpp] = useState<Opportunity | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [quickAction, setQuickAction] = useState<{ opp: Opportunity; action: string } | null>(null)
  const [oppInteractions, setOppInteractions] = useState<any[]>([])
  const [oppTasks, setOppTasks] = useState<any[]>([])
  const [oppHistory, setOppHistory] = useState<any[]>([])

  // View & filter state
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [filterSource, setFilterSource] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showColumns, setShowColumns] = useState({ value: true, source: true, assignee: true, date: true })
  const [showColumnPanel, setShowColumnPanel] = useState(false)
  const [pageTab, setPageTab] = useState<'opportunities' | 'pipelines' | 'bulk'>('opportunities')
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([])
  const [newPipelineName, setNewPipelineName] = useState('')
  const [creatingPipeline, setCreatingPipeline] = useState(false)
  const [pipelinesLoading, setPipelinesLoading] = useState(false)

  const loadAllPipelines = useCallback(async (selectFirst = false) => {
    setPipelinesLoading(true)
    try {
      const res = await getPipelines()
      const list: Pipeline[] = Array.isArray(res.data) ? res.data : []
      setAllPipelines(list)
      if (selectFirst && list.length > 0 && !externalPipelineId) {
        setActivePipeline(list[0])
      }
    } catch {
      showToast('Erro ao carregar pipelines', 'error')
    } finally {
      setPipelinesLoading(false)
    }
  }, [externalPipelineId])

  useEffect(() => { loadAllPipelines(true) }, [])

  useEffect(() => {
    if (pageTab === 'pipelines') loadAllPipelines()
  }, [pageTab])

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPipelineName.trim()) return
    try {
      const res = await createPipeline(newPipelineName.trim())
      showToast('Pipeline criada com sucesso', 'success')
      setNewPipelineName('')
      setCreatingPipeline(false)
      setShowPipelineDropdown(false)
      await loadAllPipelines()
      if (res.data) setActivePipeline(res.data)
    } catch {
      showToast('Erro ao criar pipeline', 'error')
    }
  }

  const handleDeletePipeline = async (id: string, name: string) => {
    if (!confirm(`Eliminar a pipeline "${name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deletePipeline(id)
      showToast('Pipeline eliminada', 'success')
      loadAllPipelines()
    } catch {
      showToast('Erro ao eliminar pipeline', 'error')
    }
  }

  const fetchOpportunities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const oppParams: any = { limit: 500 }
      if (pipelineId) oppParams.pipelineId = pipelineId
      const [res, uRes] = await Promise.all([
        getOpportunities(oppParams),
        getUsers(),
      ])
      const data: Opportunity[] = Array.isArray(res.data) ? res.data : res.data.data || []
      const cols: ColumnsMap = {}
      const usingDynamicStages = stages && stages.length > 0
      const stageKeys = usingDynamicStages ? stages!.map(s => s.id) : STAGE_ORDER
      for (const stageKey of stageKeys) {
        cols[stageKey] = data
          .filter(o => usingDynamicStages ? (o as any).stageId === stageKey : o.stage === stageKey)
          .sort((a, b) => a.position - b.position)
      }
      setColumns(cols)
      const ud = uRes.data
      setAllUsers(Array.isArray(ud) ? ud : ud.data || [])
    } catch {
      showToast('Erro ao carregar oportunidades', 'error')
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [pipelineId, stages])

  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

  const fetchOppDetails = useCallback(async (oppId: string) => {
    try {
      const [iRes, tRes, hRes] = await Promise.all([
        getInteractions({ opportunityId: oppId, limit: 20 }),
        getTasks({ opportunityId: oppId, limit: 20 }),
        api.get(`/activity?entityType=Opportunity&entityId=${oppId}&limit=20`),
      ])
      const iData = iRes.data; setOppInteractions(Array.isArray(iData) ? iData : iData.data || [])
      const tData = tRes.data; setOppTasks(Array.isArray(tData) ? tData : tData.data || [])
      const hData = hRes.data; setOppHistory(Array.isArray(hData) ? hData : hData.data || [])
    } catch { /* silently ignore */ }
  }, [])

  useEffect(() => {
    if (selectedOpp) {
      setOppInteractions([])
      setOppTasks([])
      setOppHistory([])
      fetchOppDetails(selectedOpp.id)
    }
  }, [selectedOpp?.id])

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    const srcStage = source.droppableId
    const dstStage = destination.droppableId
    const srcItems = Array.from(columns[srcStage] || [])
    const dstItems = srcStage === dstStage ? srcItems : Array.from(columns[dstStage] || [])
    const [moved] = srcItems.splice(source.index, 1)
    const updatedMoved = { ...moved, stage: dstStage as any, position: destination.index }
    if (srcStage === dstStage) {
      srcItems.splice(destination.index, 0, updatedMoved)
      setColumns(prev => ({ ...prev, [srcStage]: srcItems }))
    } else {
      dstItems.splice(destination.index, 0, updatedMoved)
      setColumns(prev => ({ ...prev, [srcStage]: srcItems, [dstStage]: dstItems }))
    }
    if (selectedOpp?.id === draggableId) setSelectedOpp(updatedMoved)
    try {
      const res = await moveOpportunityStage(draggableId, dstStage, destination.index, stages ? dstStage : undefined)
      const saved = res.data as Opportunity
      // Merge server response (stage/position) with existing item (preserves loaded relations)
      setColumns(prev => {
        const next = { ...prev }
        if (srcStage === dstStage) {
          next[dstStage] = prev[dstStage].map(o => o.id === saved.id ? { ...o, ...saved } : o)
        } else {
          next[srcStage] = prev[srcStage].filter(o => o.id !== saved.id)
          next[dstStage] = prev[dstStage].map(o => o.id === saved.id ? { ...o, ...saved } : o)
        }
        return next
      })
      if (selectedOpp?.id === draggableId) setSelectedOpp(prev => prev ? { ...prev, ...saved } : saved)
    } catch {
      showToast('Erro ao mover oportunidade. A reverter...', 'error')
      fetchOpportunities(true)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteOpportunity(deleteId)
      showToast('Oportunidade eliminada', 'success')
      setDeleteId(null)
      setSelectedOpp(null)
      fetchOpportunities(true)
    } catch {
      showToast('Erro ao eliminar', 'error')
    }
  }

  // Filtering + sorting
  const allOpps = Object.values(columns).flat()

  const applyFilters = (opps: Opportunity[]) => {
    return opps
      .filter(o => !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.contact?.name.toLowerCase().includes(search.toLowerCase()))
      .filter(o => !filterSource || o.source === filterSource)
      .filter(o => !filterAssignee || o.assignedToId === filterAssignee)
  }

  const applySort = (opps: Opportunity[]) => {
    return [...opps].sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'value') { va = a.value || 0; vb = b.value || 0 }
      else if (sortField === 'title') { va = a.title; vb = b.title }
      else if (sortField === 'expectedCloseDate') { va = a.expectedCloseDate || '9999'; vb = b.expectedCloseDate || '9999' }
      else { va = a.createdAt; vb = b.createdAt }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  const filteredColumns: ColumnsMap = {}
  const activeStageKeys = stages && stages.length > 0 ? stages.map(s => s.id) : STAGE_ORDER
  for (const stage of activeStageKeys) {
    filteredColumns[stage] = applyFilters(columns[stage] || [])
  }

  const listOpps = applySort(applyFilters(allOpps))

  const totalOpps = allOpps.length
  const activeFilters = [filterSource, filterAssignee].filter(Boolean).length

  if (initialLoad) return <PageSpinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, position: 'relative' }}>

      {/* ── GHL-style Page Header ── */}
      <div style={{ marginBottom: 0 }}>

        {/* Title + Tabs row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          {[
            { key: 'opportunities', label: 'Oportunidades Potenciais' },
            { key: 'pipelines',     label: 'Pipelines' },
            { key: 'bulk',          label: 'Ações em massa' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setPageTab(t.key as any)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: pageTab === t.key ? 600 : 400,
                color: pageTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: pageTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sub-toolbar: pipeline selector + count + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0', flexWrap: 'wrap',
        }}>
          {/* Pipeline selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPipelineDropdown(d => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                background: 'var(--surface)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', cursor: 'pointer',
                minWidth: 200,
              }}
            >
              <span style={{ flex: 1, textAlign: 'left' }}>
                {activePipeline ? `${allPipelines.indexOf(activePipeline) + 1} - ${activePipeline.name}` : 'Selecionar pipeline'}
              </span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
            {showPipelineDropdown && (
              <div style={{
                position: 'absolute', top: 36, left: 0, zIndex: 50, minWidth: 220,
                background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
              }}>
                <div style={{ padding: '4px 0' }}>
                  {allPipelines.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePipeline(p); setShowPipelineDropdown(false) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 14px',
                        fontSize: 13, background: activePipeline?.id === p.id ? 'var(--surface-3)' : 'none',
                        color: 'var(--text-primary)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      {i + 1} - {p.name}
                      {activePipeline?.id === p.id && <Check size={13} style={{ color: 'var(--accent)' }} />}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
                  {creatingPipeline ? (
                    <form onSubmit={handleCreatePipeline} style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={newPipelineName}
                        onChange={e => setNewPipelineName(e.target.value)}
                        placeholder="Nome do pipeline"
                        style={{
                          flex: 1, padding: '5px 8px', borderRadius: 6, fontSize: 12,
                          border: '1.5px solid var(--accent)', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button type="submit" style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                      <button type="button" onClick={() => setCreatingPipeline(false)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setCreatingPipeline(true)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '8px 14px',
                        fontSize: 13, color: 'var(--accent)', background: 'none',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Plus size={13} /> Novo pipeline
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Count */}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {totalOpps} oportunidades potenciais
          </span>

          <div style={{ flex: 1 }} />

          {/* View toggle (grid / list icons) */}
          <div style={{ display: 'flex', gap: 2, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('kanban')}
              title="Vista Kanban"
              style={{
                padding: '5px 8px', border: 'none', cursor: 'pointer',
                background: viewMode === 'kanban' ? 'var(--accent)' : 'var(--surface)',
                color: viewMode === 'kanban' ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vista Lista"
              style={{
                padding: '5px 8px', border: 'none', cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--accent)' : 'var(--surface)',
                color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <LayoutList size={15} />
            </button>
          </div>

          {/* Importação */}
          <button
            onClick={() => setShowImport(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: 'var(--surface)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Importar
          </button>

          {/* Add opportunity */}
          <button
            onClick={() => {
              const firstStage = (stages && stages.length > 0) ? stages[0].id : 'LEAD_IN'
              setNewStage(firstStage)
              setShowModal(true)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Adicionar oportunidade
          </button>
        </div>

        {/* Kanban search + Gerir campos row */}
        {pageTab === 'opportunities' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
            {/* Filters */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowFilterPanel(!showFilterPanel); setShowSortPanel(false); setShowColumnPanel(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: activeFilters > 0 ? 'var(--accent-soft)' : 'var(--surface)',
                  color: activeFilters > 0 ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${activeFilters > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={12} />
                Filtros
                {activeFilters > 0 && (
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '0 5px', fontWeight: 700 }}>
                    {activeFilters}
                  </span>
                )}
              </button>
              {showFilterPanel && (
                <div style={{
                  position: 'absolute', top: 34, left: 0, zIndex: 50,
                  background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 16, minWidth: 240,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Filtros</p>
                  <div style={{ marginBottom: 10 }}>
                    <CustomSelect
                      label="Fonte"
                      value={filterSource}
                      onChange={v => setFilterSource(v)}
                      placeholder="Todas as fontes"
                      options={SOURCE_OPTIONS_FORM.map(s => ({ value: s, label: s }))}
                      size="sm"
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <CustomSelect
                      label="Responsável"
                      value={filterAssignee}
                      onChange={v => setFilterAssignee(v)}
                      placeholder="Todos"
                      options={allUsers.map(u => ({ value: u.id, label: u.name }))}
                      size="sm"
                      searchable
                    />
                  </div>
                  {activeFilters > 0 && (
                    <button onClick={() => { setFilterSource(''); setFilterAssignee('') }}
                      style={{ fontSize: 12, color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); setShowColumnPanel(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: 'var(--surface)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <ArrowUpDown size={12} /> Ordenar
              </button>
              {showSortPanel && (
                <div style={{
                  position: 'absolute', top: 34, left: 0, zIndex: 50,
                  background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 12, minWidth: 200,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Ordenar por</p>
                  {([
                    { field: 'createdAt', label: 'Data de criação' },
                    { field: 'value', label: 'Valor' },
                    { field: 'expectedCloseDate', label: 'Data de fecho' },
                    { field: 'title', label: 'Título' },
                  ] as { field: SortField; label: string }[]).map(opt => (
                    <button
                      key={opt.field}
                      onClick={() => { if (sortField === opt.field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') } else { setSortField(opt.field); setSortDir('desc') } }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                        background: sortField === opt.field ? 'var(--accent-soft)' : 'transparent',
                        color: sortField === opt.field ? 'var(--accent)' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', fontWeight: sortField === opt.field ? 600 : 400,
                      }}
                    >
                      {opt.label}
                      {sortField === opt.field && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Pesquisar Oportunidades..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                  borderRadius: 6, border: '1px solid var(--border)', fontSize: 12,
                  background: 'var(--surface)', color: 'var(--text-primary)', width: 220, outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            </div>

            {/* Gerir campos */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowColumnPanel(!showColumnPanel); setShowFilterPanel(false); setShowSortPanel(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: 'var(--surface)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <Columns size={12} /> Gerir campos
              </button>
              {showColumnPanel && (
                <div style={{
                  position: 'absolute', top: 34, right: 0, zIndex: 50,
                  background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 12, minWidth: 180,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mostrar colunas</p>
                  {([
                    { key: 'value', label: 'Valor' },
                    { key: 'source', label: 'Fonte' },
                    { key: 'assignee', label: 'Responsável' },
                    { key: 'date', label: 'Data de fecho' },
                  ] as { key: keyof typeof showColumns; label: string }[]).map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={showColumns[col.key]}
                        onChange={() => setShowColumns(c => ({ ...c, [col.key]: !c[col.key] }))}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(showFilterPanel || showSortPanel || showColumnPanel || showPipelineDropdown) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => { setShowFilterPanel(false); setShowSortPanel(false); setShowColumnPanel(false); setShowPipelineDropdown(false) }}
        />
      )}

      {/* ── Pipelines Management Tab ── */}
      {pageTab === 'pipelines' && (
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Gestão de Pipelines</h3>
              <button
                onClick={() => setCreatingPipeline(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
              >
                <Plus size={14} /> Nova Pipeline
              </button>
            </div>

            {creatingPipeline && (
              <form onSubmit={handleCreatePipeline} style={{ background: 'var(--surface)', border: '1.5px solid var(--accent)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Nova Pipeline</div>
                <input
                  autoFocus
                  value={newPipelineName}
                  onChange={e => setNewPipelineName(e.target.value)}
                  placeholder="Nome da pipeline (ex: Compradores, Angariação...)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' as const, outline: 'none', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setCreatingPipeline(false); setNewPipelineName('') }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' }}>Cancelar</button>
                  <button type="submit" style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
                </div>
              </form>
            )}

            {pipelinesLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
            ) : allPipelines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhuma pipeline criada ainda. Clica em "Nova Pipeline" para começar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allPipelines.map(p => (
                  <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.stages?.length || 0} fases · {p._count?.opportunities || 0} oportunidades</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setPageTab('opportunities') }}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleDeletePipeline(p.id, p.name)}
                        style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fef2f2', fontSize: 12, cursor: 'pointer', color: '#ef4444', fontFamily: 'inherit' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Actions Tab ── */}
      {pageTab === 'bulk' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} style={{ color: '#f59e0b' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Ações em Massa</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Seleciona múltiplas oportunidades para mover de fase, atribuir a um responsável ou eliminar em lote.
            </p>
            <button
              onClick={() => setPageTab('opportunities')}
              style={{ padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Voltar às Oportunidades
            </button>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {pageTab === 'opportunities' && viewMode === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, flex: 1 }}>
            {(stages && stages.length > 0
              ? stages.map(s => ({ key: s.id, label: s.name, color: s.color }))
              : STAGE_ORDER.map(s => ({ key: s, label: STAGE_LABELS[s], color: undefined }))
            ).map(({ key, label, color }) => (
              <KanbanColumn
                key={key}
                stage={key}
                label={label}
                color={color}
                opportunities={filteredColumns[key] || []}
                onCardClick={(opp) => setSelectedOpp(opp)}
                onAddClick={(s) => { setNewStage(s); setShowModal(true) }}
                onAction={(opp, action) => { setSelectedOpp(opp); setQuickAction({ opp, action }) }}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* ── LIST VIEW ── */}
      {pageTab === 'opportunities' && viewMode === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Título</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fase</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contacto</th>
                  {showColumns.value && <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor</th>}
                  {showColumns.source && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fonte</th>}
                  {showColumns.assignee && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</th>}
                  {showColumns.date && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecho</th>}
                  <th style={{ padding: '10px 12px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {listOpps.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma oportunidade encontrada</td></tr>
                ) : (
                  listOpps.map(opp => {
                    const stageColors: Record<string, string> = {
                      LEAD_IN: '#2E6BE6', QUALIFYING: '#7C3AED', VISIT_SCHEDULED: '#f59e0b',
                      PROPOSAL_SENT: '#f97316', NEGOTIATION: '#ec4899', CLOSED_WON: '#10b981', CLOSED_LOST: '#ef4444',
                    }
                    const sc = stageColors[opp.stage] || '#94a3b8'
                    return (
                      <tr
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 100ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{opp.title}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: `${sc}15`, color: sc }}>
                            {STAGE_LABELS[opp.stage]}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{opp.contact?.name || '—'}</td>
                        {showColumns.value && <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{opp.value ? formatCurrency(opp.value) : '—'}</td>}
                        {showColumns.source && <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{opp.source || '—'}</td>}
                        {showColumns.assignee && (
                          <td style={{ padding: '12px 12px' }}>
                            {opp.assignedTo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                                  {getInitials(opp.assignedTo.name)}
                                </div>
                                <span style={{ fontSize: 12, color: '#374151' }}>{opp.assignedTo.name}</span>
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {showColumns.date && <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{opp.expectedCloseDate ? formatDate(opp.expectedCloseDate) : '—'}</td>}
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditOpp(opp)}
                              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                              title="Editar"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteId(opp.id)}
                              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          type="opportunities"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchOpportunities(true) }}
        />
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Oportunidade" size="xl">
        <OppForm initialStage={newStage} activePipeline={activePipeline} onSuccess={() => { setShowModal(false); fetchOpportunities(true) }} onCancel={() => setShowModal(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editOpp} onClose={() => setEditOpp(undefined)} title="Editar Oportunidade" size="xl">
        {editOpp && <OppForm opportunity={editOpp} activePipeline={activePipeline} onSuccess={() => { setEditOpp(undefined); setSelectedOpp(null); fetchOpportunities(true) }} onCancel={() => setEditOpp(undefined)} />}
      </Modal>

      {/* Detail Panel */}
      {selectedOpp && (
        <div style={{
          position: 'fixed', right: 0, top: 0, height: '100%', width: 380,
          background: 'var(--surface)', borderLeft: '1px solid #eaecf3',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.08)', zIndex: 40,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Oportunidade</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setEditOpp(selectedOpp)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Editar"><Edit size={15} /></button>
              <button onClick={() => setDeleteId(selectedOpp.id)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Eliminar"><Trash2 size={15} /></button>
              <button onClick={() => setSelectedOpp(null)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={15} /></button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{selectedOpp.title}</h4>
              <Badge variant="info">{STAGE_LABELS[selectedOpp.stage]}</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedOpp.value && <InfoRow label="Valor" value={formatCurrency(selectedOpp.value)} valueStyle={{ color: '#16a34a', fontWeight: 700 }} />}
              {(selectedOpp as any).probability != null && <InfoRow label="Probabilidade" value={`${(selectedOpp as any).probability}%`} />}
              {selectedOpp.source && <InfoRow label="Fonte" value={selectedOpp.source} />}
              {selectedOpp.contact && <InfoRow label="Contacto" value={selectedOpp.contact.name} />}
              {selectedOpp.property && <InfoRow label="Propriedade" value={selectedOpp.property.title} />}
              {selectedOpp.assignedTo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Responsável</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {getInitials(selectedOpp.assignedTo.name)}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedOpp.assignedTo.name}</span>
                  </div>
                </div>
              )}
              {selectedOpp.expectedCloseDate && <InfoRow label="Fecho Previsto" value={formatDate(selectedOpp.expectedCloseDate)} />}
              <InfoRow label="Criado em" value={formatDate(selectedOpp.createdAt)} />
            </div>
            {selectedOpp.notes && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Notas</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{selectedOpp.notes}</p>
              </div>
            )}
            {selectedOpp.lostReason && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', marginBottom: 6 }}>Motivo da Perda</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{selectedOpp.lostReason}</p>
              </div>
            )}

            {/* Interactions */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Interações {oppInteractions.length > 0 && `(${oppInteractions.length})`}
              </p>
              {oppInteractions.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem interações</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {oppInteractions.map((i: any) => (
                    <div key={i.id} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>{i.type}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(i.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{i.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Tarefas {oppTasks.length > 0 && `(${oppTasks.length})`}
              </p>
              {oppTasks.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem tarefas</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {oppTasks.map((t: any) => (
                    <div key={t.id} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                        background: t.status === 'COMPLETED' ? '#22c55e' : t.priority === 'HIGH' ? '#ef4444' : t.priority === 'MEDIUM' ? '#f59e0b' : '#94a3b8',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none' }}>{t.title}</p>
                        {t.dueDate && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{formatDate(t.dueDate)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          {/* Change History */}
          {oppHistory.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Histórico de alterações
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {oppHistory.map((h: any) => {
                  const changes = h.metadata?.changes || {};
                  const FIELD_LABELS: Record<string, string> = { stage: 'Etapa', value: 'Valor', assignedToId: 'Responsável', title: 'Título' };
                  return (
                    <div key={h.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleString('pt-PT')}</div>
                        {Object.entries(changes).map(([field, change]: [string, any]) => (
                          <div key={field} style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>
                            <strong>{FIELD_LABELS[field] || field}</strong>: {String(change.from ?? '—')} → {String(change.to ?? '—')}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {quickAction && (
        <QuickActionModal
          opportunity={quickAction.opp}
          action={quickAction.action}
          onClose={() => {
            const oppId = quickAction.opp.id
            const act = quickAction.action
            setQuickAction(null)
            if (act === 'note' || act === 'task' || act === 'sms') {
              fetchOppDetails(oppId)
            }
          }}
        />
      )}

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Deseja eliminar esta oportunidade?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}

const InfoRow: React.FC<{ label: string; value: string; valueStyle?: React.CSSProperties }> = ({ label, value, valueStyle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, ...valueStyle }}>{value}</span>
  </div>
)
