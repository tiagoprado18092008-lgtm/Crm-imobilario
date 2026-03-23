import React, { useEffect, useState, useCallback } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus, X, Edit, Trash2, Search, SlidersHorizontal, ArrowUpDown, Columns } from 'lucide-react'
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
      assignedToId: opportunity?.assignedToId || '',
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
        <Select
          label="Fase"
          options={STAGE_ORDER.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
          {...register('stage')}
        />
        <Input label="Valor (€)" type="number" {...register('value')} />
        <Select
          label="Contacto"
          required
          error={errors.contactId?.message}
          placeholder="Selecionar contacto"
          options={contacts.map(c => ({ value: c.id, label: c.name }))}
          {...register('contactId')}
        />
        <Select
          label="Responsável"
          required
          error={errors.assignedToId?.message}
          placeholder="Selecionar responsável"
          options={users.map(u => ({ value: u.id, label: u.name }))}
          {...register('assignedToId')}
        />
        <Select
          label="Fonte"
          placeholder="Selecionar fonte"
          options={SOURCE_OPTIONS_FORM.map(s => ({ value: s, label: s }))}
          {...register('source')}
        />
        <Select
          label="Propriedade"
          placeholder="Nenhuma"
          options={properties.map(p => ({ value: p.id, label: p.title }))}
          {...register('propertyId')}
        />
        <Input label="Data de Fecho Prevista" type="date" {...register('expectedCloseDate')} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notas</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>
          {opportunity ? 'Atualizar' : 'Criar'} Oportunidade
        </Button>
      </div>
    </form>
  )
}

type ColumnsMap = Record<string, Opportunity[]>

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

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOpportunities({ limit: 500 })
      const data: Opportunity[] = Array.isArray(res.data) ? res.data : res.data.data || []
      const cols: ColumnsMap = {}
      for (const stage of STAGE_ORDER) {
        cols[stage] = data
          .filter(o => o.stage === stage)
          .sort((a, b) => a.position - b.position)
      }
      setColumns(cols)
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

  const filteredColumns: ColumnsMap = {}
  for (const stage of STAGE_ORDER) {
    filteredColumns[stage] = (columns[stage] || []).filter(o =>
      !search || o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.contact?.name.toLowerCase().includes(search.toLowerCase())
    )
  }

  const totalOpps = Object.values(columns).flat().length

  if (loading) return <PageSpinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* GHL-style Top Bar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginRight: 8 }}>
          <button
            style={{
              padding: '5px 16px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Todos
          </button>
          <button
            style={{
              padding: '5px 14px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={12} /> Lista
          </button>
        </div>

        {/* Left action buttons */}
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: '#f8fafc', color: '#475569',
            border: '1px solid #e2e8f0', cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={13} /> Filtros avançados
        </button>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: '#f8fafc', color: '#475569',
            border: '1px solid #e2e8f0', cursor: 'pointer',
          }}
        >
          <ArrowUpDown size={13} /> Ordenar
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Pesquisar oportunidades..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              paddingLeft: 28, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
              borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12,
              background: '#f8fafc', color: '#1e293b', width: 220, outline: 'none',
            }}
          />
        </div>

        {/* Gerir campos */}
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: '#f8fafc', color: '#475569',
            border: '1px solid #e2e8f0', cursor: 'pointer',
          }}
        >
          <Columns size={13} /> Gerir campos
        </button>

        {/* Summary */}
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
          {totalOpps} oportunidades
        </span>

        {/* Add button */}
        <Button
          onClick={() => { setNewStage('LEAD_IN'); setShowModal(true) }}
          size="sm"
        >
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>

      {/* Kanban Board */}
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

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Oportunidade" size="xl">
        <OppForm
          initialStage={newStage}
          onSuccess={() => { setShowModal(false); fetchOpportunities() }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editOpp} onClose={() => setEditOpp(undefined)} title="Editar Oportunidade" size="xl">
        {editOpp && (
          <OppForm
            opportunity={editOpp}
            onSuccess={() => { setEditOpp(undefined); setSelectedOpp(null); fetchOpportunities() }}
            onCancel={() => setEditOpp(undefined)}
          />
        )}
      </Modal>

      {/* Detail Panel */}
      {selectedOpp && (
        <div
          style={{
            position: 'fixed', right: 0, top: 0, height: '100%', width: 380,
            background: '#fff', borderLeft: '1px solid #e2e8f0',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 40,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Oportunidade</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setEditOpp(selectedOpp)}
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                title="Editar"
              >
                <Edit size={15} />
              </button>
              <button
                onClick={() => setDeleteId(selectedOpp.id)}
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={() => setSelectedOpp(null)}
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                {selectedOpp.title}
              </h4>
              <Badge variant="info">{STAGE_LABELS[selectedOpp.stage]}</Badge>
            </div>

            {/* Key info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedOpp.value && (
                <InfoRow label="Valor" value={formatCurrency(selectedOpp.value)} valueStyle={{ color: '#16a34a', fontWeight: 700 }} />
              )}
              {selectedOpp.source && (
                <InfoRow label="Fonte" value={selectedOpp.source} />
              )}
              {selectedOpp.contact && (
                <InfoRow label="Contacto" value={selectedOpp.contact.name} />
              )}
              {selectedOpp.property && (
                <InfoRow label="Propriedade" value={selectedOpp.property.title} />
              )}
              {selectedOpp.assignedTo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Responsável</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                      }}
                    >
                      {getInitials(selectedOpp.assignedTo.name)}
                    </div>
                    <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{selectedOpp.assignedTo.name}</span>
                  </div>
                </div>
              )}
              {selectedOpp.expectedCloseDate && (
                <InfoRow label="Fecho Previsto" value={formatDate(selectedOpp.expectedCloseDate)} />
              )}
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

      {/* Quick action modal */}
      {quickAction && (
        <QuickActionModal
          opportunity={quickAction.opp}
          action={quickAction.action}
          onClose={() => setQuickAction(null)}
        />
      )}

      {/* Delete confirm */}
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
