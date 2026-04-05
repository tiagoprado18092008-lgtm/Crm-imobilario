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
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={15} /> Voltar às Propriedades
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{property.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Badge variant="default">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
                  <Badge variant={statusVariant[property.status]}>
                    {PROPERTY_STATUS_LABELS[property.status]}
                  </Badge>
                  {property.reference && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ref: {property.reference}</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>
                {formatCurrency(property.price)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              {property.address}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              {property.bedrooms !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <BedDouble size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{property.bedrooms} quartos</span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Bath size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{property.bathrooms} WC</span>
                </div>
              )}
              {property.parking !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Car size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{property.parking} lugares</span>
                </div>
              )}
              {property.area !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Maximize size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{property.area} m²</span>
                </div>
              )}
            </div>

            {property.description && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Descrição</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{property.description}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Informação">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Criado em</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDate(property.createdAt)}</span>
              </div>
            </div>
          </Card>

          <Card title={`Oportunidades (${opportunities.length})`}>
            {opportunities.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Sem oportunidades ligadas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opportunities.map((opp) => (
                  <div key={opp.id} style={{ padding: 12, background: 'var(--bg-page)', borderRadius: 10 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{opp.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {STAGE_LABELS[opp.stage]}
                      {opp.contact && ` • ${opp.contact.name}`}
                    </p>
                    {opp.value && (
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', marginTop: 4 }}>
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
