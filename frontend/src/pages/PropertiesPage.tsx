import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getProperties, createProperty, updateProperty, deleteProperty } from '../api/properties.api'
import type { Property } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { useUIStore } from '../store/ui.store'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS
} from '../utils/constants'

const statusVariant: Record<string, any> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  SOLD: 'info',
  RENTED: 'purple'
}

const propSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND', 'OTHER']),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED']),
  price: z.string(),
  address: z.string().min(3, 'Endereço obrigatório'),
  area: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  parking: z.string().optional(),
  reference: z.string().optional()
})

type PropFormData = z.infer<typeof propSchema>

const PropertyForm: React.FC<{
  property?: Property
  onSuccess: () => void
  onCancel: () => void
}> = ({ property, onSuccess, onCancel }) => {
  const { showToast } = useUIStore()
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<PropFormData>({
    resolver: zodResolver(propSchema),
    defaultValues: {
      title: property?.title || '',
      description: property?.description || '',
      type: property?.type || 'APARTMENT',
      status: property?.status || 'AVAILABLE',
      price: property?.price?.toString() || '',
      address: property?.address || '',
      area: property?.area?.toString() || '',
      bedrooms: property?.bedrooms?.toString() || '',
      bathrooms: property?.bathrooms?.toString() || '',
      parking: property?.parking?.toString() || '',
      reference: property?.reference || ''
    }
  })

  const onSubmit = async (data: PropFormData) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        price: Number(data.price),
        area: data.area ? Number(data.area) : undefined,
        bedrooms: data.bedrooms ? Number(data.bedrooms) : undefined,
        bathrooms: data.bathrooms ? Number(data.bathrooms) : undefined,
        parking: data.parking ? Number(data.parking) : undefined,
      }
      if (property) {
        await updateProperty(property.id, payload)
        showToast('Propriedade atualizada', 'success')
      } else {
        await createProperty({ ...payload, imageUrls: '[]' })
        showToast('Propriedade criada', 'success')
      }
      onSuccess()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao guardar propriedade', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Título" required error={errors.title?.message} {...register('title')} />
        </div>
        <Select
          label="Tipo"
          required
          options={Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('type')}
        />
        <Select
          label="Estado"
          required
          options={Object.entries(PROPERTY_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          {...register('status')}
        />
        <Input
          label="Preço (€)"
          type="number"
          required
          error={errors.price?.message}
          {...register('price')}
        />
        <Input
          label="Referência"
          error={errors.reference?.message}
          {...register('reference')}
        />
        <div className="sm:col-span-2">
          <Input
            label="Endereço"
            required
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
        <Input label="Área (m²)" type="number" {...register('area')} />
        <Input label="Quartos" type="number" {...register('bedrooms')} />
        <Input label="Casas de Banho" type="number" {...register('bathrooms')} />
        <Input label="Estacionamento" type="number" {...register('parking')} />
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={submitting}>
          {property ? 'Atualizar' : 'Criar'} Propriedade
        </Button>
      </div>
    </form>
  )
}

export const PropertiesPage: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProp, setEditProp] = useState<Property | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const limit = 20

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProperties({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit
      })
      const d = res.data
      if (Array.isArray(d)) {
        setProperties(d)
        setTotal(d.length)
      } else {
        setProperties(d.data || [])
        setTotal(d.total || 0)
      }
    } catch {
      showToast('Erro ao carregar propriedades', 'error')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, page])

  useEffect(() => { fetchProperties() }, [fetchProperties])
  useEffect(() => { setPage(1) }, [typeFilter, statusFilter])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProperty(deleteId)
      showToast('Propriedade eliminada', 'success')
      setDeleteId(null)
      fetchProperties()
    } catch {
      showToast('Erro ao eliminar propriedade', 'error')
    }
  }

  const totalPages = Math.ceil(total / limit)
  const filtered = search
    ? properties.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase())
      )
    : properties

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar propriedades..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Select
          options={[
            { value: '', label: 'Todos os tipos' },
            ...Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={[
            { value: '', label: 'Todos os estados' },
            ...Object.entries(PROPERTY_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
        <Button onClick={() => { setEditProp(undefined); setShowModal(true) }} className="ml-auto">
          <Plus className="w-4 h-4" /> Nova Propriedade
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-12 h-12" />}
          title="Nenhuma propriedade encontrada"
          description="Adicione a sua primeira propriedade ao sistema."
          actionLabel="Nova Propriedade"
          onAction={() => { setEditProp(undefined); setShowModal(true) }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Preço</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Endereço</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Quartos</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Área</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Criado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/properties/${prop.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{prop.title}</td>
                    <td className="px-4 py-3 text-gray-600">{PROPERTY_TYPE_LABELS[prop.type]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[prop.status]} small>
                        {PROPERTY_STATUS_LABELS[prop.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(prop.price)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{prop.address}</td>
                    <td className="px-4 py-3 text-gray-600">{prop.bedrooms ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{prop.area ? `${prop.area} m²` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(prop.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setEditProp(prop); setShowModal(true) }}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(prop.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} propriedades
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm text-gray-700">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditProp(undefined) }}
        title={editProp ? 'Editar Propriedade' : 'Nova Propriedade'}
        size="xl"
      >
        <PropertyForm
          property={editProp}
          onSuccess={() => { setShowModal(false); setEditProp(undefined); fetchProperties() }}
          onCancel={() => { setShowModal(false); setEditProp(undefined) }}
        />
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p className="text-sm text-gray-600 mb-6">Deseja eliminar esta propriedade?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
