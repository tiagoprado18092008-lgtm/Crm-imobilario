import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, BedDouble, Bath, Car, Maximize } from 'lucide-react'
import { getProperty } from '../api/properties.api'
import { getOpportunities } from '../api/opportunities.api'
import type { Property, Opportunity } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { useUIStore } from '../store/ui.store'
import { formatCurrency, formatDate } from '../utils/formatters'
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  STAGE_LABELS
} from '../utils/constants'

const statusVariant: Record<string, any> = {
  AVAILABLE: 'success', RESERVED: 'warning', SOLD: 'info', RENTED: 'purple'
}

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [property, setProperty] = useState<Property | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [propRes, oppRes] = await Promise.all([
          getProperty(id),
          getOpportunities({ propertyId: id })
        ])
        setProperty(propRes.data)
        const d = oppRes.data
        setOpportunities(Array.isArray(d) ? d : d.data || [])
      } catch {
        showToast('Erro ao carregar propriedade', 'error')
        navigate('/properties')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <PageSpinner />
  if (!property) return null

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/properties')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar às Propriedades
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{property.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
                  <Badge variant={statusVariant[property.status]}>
                    {PROPERTY_STATUS_LABELS[property.status]}
                  </Badge>
                  {property.reference && (
                    <span className="text-xs text-gray-500">Ref: {property.reference}</span>
                  )}
                </div>
              </div>
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(property.price)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <MapPin className="w-4 h-4 text-gray-400" />
              {property.address}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-100">
              {property.bedrooms !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <BedDouble className="w-4 h-4 text-gray-400" />
                  <span>{property.bedrooms} quartos</span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Bath className="w-4 h-4 text-gray-400" />
                  <span>{property.bathrooms} WC</span>
                </div>
              )}
              {property.parking !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span>{property.parking} lugares</span>
                </div>
              )}
              {property.area !== undefined && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Maximize className="w-4 h-4 text-gray-400" />
                  <span>{property.area} m²</span>
                </div>
              )}
            </div>

            {property.description && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Descrição</p>
                <p className="text-sm text-gray-700 leading-relaxed">{property.description}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Informação">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Criado em</span>
                <span className="text-gray-800">{formatDate(property.createdAt)}</span>
              </div>
            </div>
          </Card>

          <Card title={`Oportunidades (${opportunities.length})`}>
            {opportunities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sem oportunidades ligadas</p>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 text-sm">{opp.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {STAGE_LABELS[opp.stage]}
                      {opp.contact && ` • ${opp.contact.name}`}
                    </p>
                    {opp.value && (
                      <p className="text-sm font-semibold text-green-700 mt-1">
                        {formatCurrency(opp.value)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
