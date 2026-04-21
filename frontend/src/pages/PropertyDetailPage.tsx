import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty } from '../api/properties.api'
import type { Property, PropertyPhoto, PropertyDocument, PropertyVisit } from '../types'
import { PageSpinner } from '../components/ui/Spinner'
import { useUIStore } from '../store/ui.store'
import { PropertyHeader } from '../components/properties/PropertyHeader'
import { PropertySidebar } from '../components/properties/PropertySidebar'
import { DetailsTab } from '../components/properties/tabs/DetailsTab'
import { PhotosTab } from '../components/properties/tabs/PhotosTab'
import { DocumentsTab } from '../components/properties/tabs/DocumentsTab'
import { VisitsTab } from '../components/properties/tabs/VisitsTab'
import { VisitModal } from '../components/properties/modals/VisitModal'
import { ShareModal } from '../components/properties/modals/ShareModal'
import { generatePropertyPDF } from '../components/properties/generatePDF'

type Tab = 'details' | 'photos' | 'documents' | 'visits'

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getProperty(id)
      .then(res => setProperty(res.data))
      .catch(() => {
        showToast('Erro ao carregar propriedade', 'error')
        navigate('/properties')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageSpinner />
  if (!property) return null

  const handlePropertyChange = (updated: Partial<Property>) => {
    setProperty(prev => prev ? { ...prev, ...updated } : prev)
  }

  const handlePhotosChange = (photos: PropertyPhoto[]) => {
    setProperty(prev => prev ? { ...prev, photos } : prev)
  }

  const handleDocumentsChange = (documents: PropertyDocument[]) => {
    setProperty(prev => prev ? { ...prev, documents } : prev)
  }

  const handleVisitsChange = (visits: PropertyVisit[]) => {
    setProperty(prev => prev ? { ...prev, visits } : prev)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Detalhes' },
    { key: 'photos', label: `Fotos${property.photos?.length ? ` (${property.photos.length})` : ''}` },
    { key: 'documents', label: `Documentos${property.documents?.length ? ` (${property.documents.length})` : ''}` },
    { key: 'visits', label: `Visitas${property.visits?.length ? ` (${property.visits.length})` : ''}` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PropertyHeader
        property={property}
        onEdit={() => navigate(`/properties?edit=${property.id}`)}
      />

      {/* Galeria + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Galeria de capa */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 220 }}>
          {property.photos && property.photos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <img
                src={property.photos[0].url.startsWith('http') ? property.photos[0].url : `${apiBase}${property.photos[0].url}`}
                alt={property.title}
                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
              />
              {property.photos.length > 1 && (
                <div style={{ display: 'flex', gap: 4, padding: 8, overflowX: 'auto' }}>
                  {property.photos.slice(1, 6).map(p => (
                    <img
                      key={p.id}
                      src={p.url.startsWith('http') ? p.url : `${apiBase}${p.url}`}
                      alt=""
                      style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, cursor: 'pointer', opacity: 0.85 }}
                      onClick={() => setActiveTab('photos')}
                    />
                  ))}
                  {property.photos.length > 6 && (
                    <button
                      onClick={() => setActiveTab('photos')}
                      style={{ width: 72, height: 52, borderRadius: 6, flexShrink: 0, background: 'var(--surface-2)', border: '1px dashed var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
                    >
                      +{property.photos.length - 6}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}
              onClick={() => setActiveTab('photos')}
            >
              <span style={{ fontSize: 32, opacity: 0.3 }}>🏠</span>
              Adicionar fotos
            </div>
          )}
        </div>

        <PropertySidebar
          property={property}
          onScheduleVisit={() => setShowVisitModal(true)}
          onShare={() => setShowShareModal(true)}
          onGeneratePDF={() => generatePropertyPDF(property, apiBase)}
        />
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === 'details' && (
            <DetailsTab property={property} onChange={handlePropertyChange} />
          )}
          {activeTab === 'photos' && (
            <PhotosTab
              propertyId={property.id}
              photos={property.photos ?? []}
              onChange={handlePhotosChange}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              propertyId={property.id}
              documents={property.documents ?? []}
              onChange={handleDocumentsChange}
            />
          )}
          {activeTab === 'visits' && (
            <VisitsTab
              propertyId={property.id}
              visits={property.visits ?? []}
              onChange={handleVisitsChange}
            />
          )}
        </div>
      </div>

      <VisitModal
        propertyId={property.id}
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        onCreated={v => handleVisitsChange([v, ...(property.visits ?? [])])}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
      />
    </div>
  )
}
