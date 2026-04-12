import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { Property } from '../../types'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../utils/constants'

const statusVariant: Record<string, any> = {
  AVAILABLE: 'success', RESERVED: 'warning', SOLD: 'info', RENTED: 'purple', IN_PROCESS: 'default'
}

interface Props {
  property: Property
  onEdit: () => void
}

export const PropertyHeader: React.FC<Props> = ({ property, onEdit }) => {
  const navigate = useNavigate()
  return (
    <div>
      <button
        onClick={() => navigate('/properties')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}
      >
        <ArrowLeft size={15} /> Voltar a Propriedades
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {property.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Badge variant="default">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
            <Badge variant={statusVariant[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Badge>
            {property.reference && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref: {property.reference}</span>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={onEdit}>
          <Edit size={14} /> Editar
        </Button>
      </div>
    </div>
  )
}
