import React, { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import {
  Plus, X, Edit, Trash2, Search, SlidersHorizontal,
  ArrowUpDown, Columns, LayoutList, Kanban, ChevronDown,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import { QuickActionModal } from './QuickActionModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, moveOpportunityStage } from '../../api/opportunities.api'
import { getContacts } from '../../api/contacts.api'
import { getProperties } from '../../api/properties.api'
import { getUsers } from '../../api/users.api'
import type { Opportunity, Contact, Property, User } from '../../types'
import { KanbanColumn } from './KanbanColumn'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { PageSpinner } from '../ui/Spinner'
import { useUIStore } from '../../store/ui.store'
import { STAGE_ORDER, STAGE_LABELS } from '../../utils/constants'
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
  lostReason: z.string().optional()
})

type OppFormData = z.infer<typeof oppSchema>

interface OppFormProps {
  opportunity?: Opportunity
  initialStage?: string
  onSuccess: () => void
  onCancel: () => void
}

const SOURCE_OPTIONS_FORM = [
  'Idealista', 'Imovirtual', 'Casa Sapo', 'OLX', 'BPI Expresso Imobiliário',
  'Indicação', 'Redes Sociais', 'Instagram', 'Facebook Ads', 'Google Ads',
  'Walk-in', 'Email', 'Chamada Direta', 'Outro'
]

const OppForm: React.FC<OppFormProps> = ({ opportunity, initialStage, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const { user: currentUser } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    Promise.all([getContacts({ limit: 200 }), getProperties({ limit: 200 }), getUsers()])
      .then(([cRes, pRes, uRes]) => {
        const cd = cRes.data; setContacts(Array.isArray(cd) ? cd : cd.data || [])
        const pd = pRes.data; setProperties(Array.isArray(pd) ? pd : pd.data || [])
        const ud = uRes.data; setUsers(Array.isArray(ud) ? ud : ud.data || [])
      })
      .catch(() => {})
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<OppFormData>({
    resolver: zodResolver(oppSchema),
    defaultValues: {
      title: opportunity?.title || '',
      stage: opportunity?.stage || initialStage || 'LEAD_IN',
      value: opportunity?.value?.toString() || '',
      source: opportunity?.source || '',
      expectedCloseDate: opportunity?.expectedCloseDate ? opportunity.expectedCloseDate.slice(0, 10) : '',
      notes: opportunity?.notes || '',
      contactId: opportunity?.contactId || '',
      propertyId: opportunity?.propertyId || '',
      assignedToId: opportunity?.assignedToId || currentUser?.id || '',
      lostReason: opportunity?.lostReason || ''
    }
  })

  const onSubmit = async (data: OppFormData) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        value: data.value ? Number(data.value) : undefined,
        propertyId: data.propertyId || undefined,
        expectedCloseDate: data.expectedCloseDate || undefined,
        lostReason: data.lostReason || undefined,
        notes: data.notes || undefined,
        source: data.source || undefined,
        position: opportunity?.position ?? 0
      }
      if (opportunity) {
        await updateOpportunity(opportunity.id, payload)
        showToast('Oportunidade atualizada', 'success')
      } else {
        await createOpportunity(payload)
        showToast('Oportunidade criada', 'success')
      }
      onSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao guardar oportunidade', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Título" required error={errors.title?.message} {...register('title')} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Fase" options={STAGE_ORDER.map(s => ({ value: s, label: STAGE_LABELS[s] }))} {...register('stage')} />
        <Input label="Valor (€)" type="number" {...register('value')} />
        <Select label="Contacto" required error={errors.contactId?.message} placeholder="Selecionar contacto" options={contacts.map(c => ({ value: c.id, label: c.name }))} {...register('contactId')} />
        <Select label="Responsável" required error={errors.assignedToId?.message} placeholder="Selecionar responsável" options={users.map(u => ({ value: u.id, label: u.name }))} {...register('assignedToId')} />
        <Select label="Fonte" placeholder="Selecionar fonte" options={SOURCE_OPTIONS_FORM.map(s => ({ value: s, label: s }))} {...register('source')} />
        <Select label="Propriedade" placeholder="Nenhuma" options={properties.map(p => ({ value: p.id, label: p.title }))} {...register('propertyId')} />
        <Input label="Data de Fecho Prevista" type="date" {...register('expectedCloseDate')} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notas</label>
        <textarea {...register('notes')} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>{opportunity ? 'Atualizar' : 'Criar'} Oportunidade</Button>
      </div>
    </form>
  )
}

type ColumnsMap = Record<string, Opportunity[]>
type SortField = 'value' | 'createdAt' | 'expectedCloseDate' | 'title'
type SortDir = 'asc' | 'desc'

export const KanbanBoard: React.FC = () => {
  const { showToast } = useUIStore()
  const [columns, setColumns] = useState<ColumnsMap>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newStage, setNewStage] = useState<string>('LEAD_IN')
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [editOpp, setEditOpp] = useState<Opportunity | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [quickAction, setQuickAction] = useState<{ opp: Opportunity; action: string } | null>(null)

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

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const [res, uRes] = await Promise.all([
        getOpportunities({ limit: 500 }),
        getUsers(),
      ])
      const data: Opportunity[] = Array.isArray(res.data) ? res.data : res.data.data || []
      const cols: ColumnsMap = {}
      for (const stage of STAGE_ORDER) {
        cols[stage] = data.filter(o => o.stage === stage).sort((a, b) => a.position - b.position)
      }
      setColumns(cols)
      const ud = uRes.data
      setAllUsers(Array.isArray(ud) ? ud : ud.data || [])
    } catch {
      showToast('Erro ao carregar oportunidades', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOpportunities() }, [fetchOpportunities])

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
      await moveOpportunityStage(draggableId, dstStage, destination.index)
    } catch {
      showToast('Erro ao mover oportunidade. A reverter...', 'error')
      fetchOpportunities()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteOpportunity(deleteId)
      showToast('Oportunidade eliminada', 'success')
      setDeleteId(null)
      setSelectedOpp(null)
      fetchOpportunities()
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
  for (const stage of STAGE_ORDER) {
    filteredColumns[stage] = applyFilters(columns[stage] || [])
  }

  const listOpps = applySort(applyFilters(allOpps))

  const totalOpps = allOpps.length
  const activeFilters = [filterSource, filterAssignee].filter(Boolean).length

  if (loading) return <PageSpinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, position: 'relative' }}>
      {/* Top Bar */}
      <div style={{
        background: '#fff', border: '1px solid #eaecf3', borderRadius: 12,
        padding: '10px 14px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: '#f0f2f8', borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setViewMode('kanban')}
            title="Vista Kanban"
            style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: viewMode === 'kanban' ? '#fff' : 'transparent',
              color: viewMode === 'kanban' ? '#6366f1' : '#94a3b8',
              border: 'none', cursor: 'pointer',
              boxShadow: viewMode === 'kanban' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Kanban size={13} /> Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Vista Lista"
            style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: viewMode === 'list' ? '#fff' : 'transparent',
              color: viewMode === 'list' ? '#6366f1' : '#94a3b8',
              border: 'none', cursor: 'pointer',
              boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <LayoutList size={13} /> Lista
          </button>
        </div>

        {/* Filters button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowFilterPanel(!showFilterPanel); setShowSortPanel(false); setShowColumnPanel(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: activeFilters > 0 ? '#eef2ff' : '#f8fafc',
              color: activeFilters > 0 ? '#6366f1' : '#475569',
              border: `1px solid ${activeFilters > 0 ? '#c7d2fe' : '#e2e8f0'}`,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={13} />
            Filtros
            {activeFilters > 0 && (
              <span style={{ background: '#6366f1', color: '#fff', borderRadius: 10, fontSize: 10, padding: '0 5px', fontWeight: 700 }}>
                {activeFilters}
              </span>
            )}
            <ChevronDown size={11} />
          </button>
          {showFilterPanel && (
            <div style={{
              position: 'absolute', top: 36, left: 0, zIndex: 50,
              background: '#fff', borderRadius: 12, border: '1px solid #eaecf3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 16, minWidth: 240,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Filtros avançados</p>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Fonte</label>
                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fafbfd' }}
                >
                  <option value="">Todas as fontes</option>
                  {SOURCE_OPTIONS_FORM.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Responsável</label>
                <select
                  value={filterAssignee}
                  onChange={e => setFilterAssignee(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fafbfd' }}
                >
                  <option value="">Todos</option>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterSource(''); setFilterAssignee('') }}
                  style={{ fontSize: 12, color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sort button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); setShowColumnPanel(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: '#f8fafc', color: '#475569',
              border: '1px solid #e2e8f0', cursor: 'pointer',
            }}
          >
            <ArrowUpDown size={13} /> Ordenar <ChevronDown size={11} />
          </button>
          {showSortPanel && (
            <div style={{
              position: 'absolute', top: 36, left: 0, zIndex: 50,
              background: '#fff', borderRadius: 12, border: '1px solid #eaecf3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 12, minWidth: 200,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Ordenar por</p>
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
                    background: sortField === opt.field ? '#eef2ff' : 'transparent',
                    color: sortField === opt.field ? '#6366f1' : '#374151',
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 28, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
              borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12,
              background: '#f8fafc', color: '#1e293b', width: 200, outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.12)' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Gerir campos (only in list view) */}
        {viewMode === 'list' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowColumnPanel(!showColumnPanel); setShowFilterPanel(false); setShowSortPanel(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: '#f8fafc', color: '#475569',
                border: '1px solid #e2e8f0', cursor: 'pointer',
              }}
            >
              <Columns size={13} /> Colunas <ChevronDown size={11} />
            </button>
            {showColumnPanel && (
              <div style={{
                position: 'absolute', top: 36, right: 0, zIndex: 50,
                background: '#fff', borderRadius: 12, border: '1px solid #eaecf3',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 12, minWidth: 180,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mostrar colunas</p>
                {([
                  { key: 'value', label: 'Valor' },
                  { key: 'source', label: 'Fonte' },
                  { key: 'assignee', label: 'Responsável' },
                  { key: 'date', label: 'Data de fecho' },
                ] as { key: keyof typeof showColumns; label: string }[]).map(col => (
                  <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={showColumns[col.key]}
                      onChange={() => setShowColumns(c => ({ ...c, [col.key]: !c[col.key] }))}
                      style={{ accentColor: '#6366f1' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Count */}
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>
          {totalOpps} oportunidades
        </span>

        {/* Add button */}
        <Button onClick={() => { setNewStage('LEAD_IN'); setShowModal(true) }} size="sm">
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>

      {/* Click outside to close dropdowns */}
      {(showFilterPanel || showSortPanel || showColumnPanel) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => { setShowFilterPanel(false); setShowSortPanel(false); setShowColumnPanel(false) }}
        />
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, flex: 1 }}>
            {STAGE_ORDER.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                label={STAGE_LABELS[stage]}
                opportunities={filteredColumns[stage] || []}
                onCardClick={(opp) => setSelectedOpp(opp)}
                onAddClick={(s) => { setNewStage(s); setShowModal(true) }}
                onAction={(opp, action) => setQuickAction({ opp, action })}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eaecf3', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f3f9', background: '#fafbfd' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Título</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fase</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contacto</th>
                  {showColumns.value && <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor</th>}
                  {showColumns.source && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fonte</th>}
                  {showColumns.assignee && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</th>}
                  {showColumns.date && <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecho</th>}
                  <th style={{ padding: '10px 12px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {listOpps.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: 13 }}>Nenhuma oportunidade encontrada</td></tr>
                ) : (
                  listOpps.map(opp => {
                    const stageColors: Record<string, string> = {
                      LEAD_IN: '#6366f1', QUALIFYING: '#8b5cf6', VISIT_SCHEDULED: '#f59e0b',
                      PROPOSAL_SENT: '#f97316', NEGOTIATION: '#ec4899', CLOSED_WON: '#10b981', CLOSED_LOST: '#ef4444',
                    }
                    const sc = stageColors[opp.stage] || '#94a3b8'
                    return (
                      <tr
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        style={{ borderBottom: '1px solid #f8f9fc', cursor: 'pointer', transition: 'background 100ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfd')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{opp.title}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: `${sc}15`, color: sc }}>
                            {STAGE_LABELS[opp.stage]}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', color: '#64748b' }}>{opp.contact?.name || '—'}</td>
                        {showColumns.value && <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{opp.value ? formatCurrency(opp.value) : '—'}</td>}
                        {showColumns.source && <td style={{ padding: '12px 12px', color: '#64748b' }}>{opp.source || '—'}</td>}
                        {showColumns.assignee && (
                          <td style={{ padding: '12px 12px' }}>
                            {opp.assignedTo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                                  {getInitials(opp.assignedTo.name)}
                                </div>
                                <span style={{ fontSize: 12, color: '#374151' }}>{opp.assignedTo.name}</span>
                              </div>
                            ) : '—'}
                          </td>
                        )}
                        {showColumns.date && <td style={{ padding: '12px 12px', color: '#64748b', fontSize: 12 }}>{opp.expectedCloseDate ? formatDate(opp.expectedCloseDate) : '—'}</td>}
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditOpp(opp)}
                              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                              title="Editar"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteId(opp.id)}
                              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
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

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Oportunidade" size="xl">
        <OppForm initialStage={newStage} onSuccess={() => { setShowModal(false); fetchOpportunities() }} onCancel={() => setShowModal(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editOpp} onClose={() => setEditOpp(undefined)} title="Editar Oportunidade" size="xl">
        {editOpp && <OppForm opportunity={editOpp} onSuccess={() => { setEditOpp(undefined); setSelectedOpp(null); fetchOpportunities() }} onCancel={() => setEditOpp(undefined)} />}
      </Modal>

      {/* Detail Panel */}
      {selectedOpp && (
        <div style={{
          position: 'fixed', right: 0, top: 0, height: '100%', width: 380,
          background: '#fff', borderLeft: '1px solid #eaecf3',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.08)', zIndex: 40,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f3f9' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Oportunidade</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setEditOpp(selectedOpp)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Editar"><Edit size={15} /></button>
              <button onClick={() => setDeleteId(selectedOpp.id)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Eliminar"><Trash2 size={15} /></button>
              <button onClick={() => setSelectedOpp(null)} style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={15} /></button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{selectedOpp.title}</h4>
              <Badge variant="info">{STAGE_LABELS[selectedOpp.stage]}</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedOpp.value && <InfoRow label="Valor" value={formatCurrency(selectedOpp.value)} valueStyle={{ color: '#16a34a', fontWeight: 700 }} />}
              {selectedOpp.source && <InfoRow label="Fonte" value={selectedOpp.source} />}
              {selectedOpp.contact && <InfoRow label="Contacto" value={selectedOpp.contact.name} />}
              {selectedOpp.property && <InfoRow label="Propriedade" value={selectedOpp.property.title} />}
              {selectedOpp.assignedTo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Responsável</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                      {getInitials(selectedOpp.assignedTo.name)}
                    </div>
                    <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{selectedOpp.assignedTo.name}</span>
                  </div>
                </div>
              )}
              {selectedOpp.expectedCloseDate && <InfoRow label="Fecho Previsto" value={formatDate(selectedOpp.expectedCloseDate)} />}
              <InfoRow label="Criado em" value={formatDate(selectedOpp.createdAt)} />
            </div>
            {selectedOpp.notes && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Notas</p>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{selectedOpp.notes}</p>
              </div>
            )}
            {selectedOpp.lostReason && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #fef2f2' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', marginBottom: 6 }}>Motivo da Perda</p>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{selectedOpp.lostReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {quickAction && (
        <QuickActionModal opportunity={quickAction.opp} action={quickAction.action} onClose={() => setQuickAction(null)} />
      )}

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Deseja eliminar esta oportunidade?</p>
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
    <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
    <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, ...valueStyle }}>{value}</span>
  </div>
)
