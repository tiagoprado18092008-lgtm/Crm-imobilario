import React from 'react'
import { Calendar, Share2, FileText } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Property } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  property: Property
  onScheduleVisit: () => void
  onShare: () => void
  onGeneratePDF: () => void
}

export const PropertySidebar: React.FC<Props> = ({ property, onScheduleVisit, onShare, onGeneratePDF }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {property.purpose === 'RENT' ? 'Arrendamento' : 'Venda'}
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', margin: '4px 0 0' }}>
              {formatCurrency(property.price)}
              {property.purpose === 'RENT' && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mês</span>}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--text-secondary)', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
            {property.area != null && <span><b>{property.area}</b> m²</span>}
            {property.bedrooms != null && <span><b>{property.bedrooms}</b> quartos</span>}
            {property.bathrooms != null && <span><b>{property.bathrooms}</b> WC</span>}
            {property.parking != null && <span><b>{property.parking}</b> estac.</span>}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button onClick={onScheduleVisit} style={{ width: '100%', justifyContent: 'center' }}>
          <Calendar size={15} /> Agendar Visita
        </Button>
        <Button variant="secondary" onClick={onShare} style={{ width: '100%', justifyContent: 'center' }}>
          <Share2 size={15} /> Partilhar Imóvel
        </Button>
        <Button variant="secondary" onClick={onGeneratePDF} style={{ width: '100%', justifyContent: 'center' }}>
          <FileText size={15} /> Gerar PDF
        </Button>
      </div>
    </div>
  )
}
