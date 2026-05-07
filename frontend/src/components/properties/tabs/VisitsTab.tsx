import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { VisitModal } from '../modals/VisitModal'
import type { PropertyVisit } from '../../../types'
import { updateVisit } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import { CustomSelect } from '../../ui/CustomSelect'

const statusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
  agendada: 'warning', realizada: 'success', cancelada: 'danger'
}
const statusLabel: Record<string, string> = {
  agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada'
}

interface Props {
  propertyId: string
  visits: PropertyVisit[]
  onChange: (visits: PropertyVisit[]) => void
}

export const VisitsTab: React.FC<Props> = ({ propertyId, visits, onChange }) => {
  const { showToast } = useUIStore()
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const handleStatusChange = async (visitId: string, status: string) => {
    try {
      await updateVisit(propertyId, visitId, { status })
      onChange(visits.map(v => v.id === visitId ? { ...v, status: status as any } : v))
    } catch {
      showToast('Erro ao actualizar visita', 'error')
    }
  }

  const handleInteresseChange = async (visitId: string, interesse: string, notas: string) => {
    try {
      await updateVisit(propertyId, visitId, { interesse, notas })
      onChange(visits.map(v => v.id === visitId ? { ...v, interesse: interesse as any, notas } : v))
    } catch {
      showToast('Erro ao guardar', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={14} /> Agendar Visita
        </Button>
      </div>

      {visits.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Sem visitas registadas</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visits.map(visit => {
            const dt = new Date(visit.scheduledAt)
            const isExpanded = expanded === visit.id
            return (
              <div key={visit.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 14px', cursor: visit.status === 'realizada' ? 'pointer' : 'default' }}
                  onClick={() => visit.status === 'realizada' && setExpanded(isExpanded ? null : visit.id)}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {dt.toLocaleDateString('pt-PT')} {dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant={statusVariant[visit.status]} small>{statusLabel[visit.status]}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{visit.notas || '—'}</span>
                  <div onClick={e => e.stopPropagation()}>
                    <CustomSelect
                      value={visit.status}
                      onChange={v => handleStatusChange(visit.id, v)}
                      options={[
                        { value: 'agendada', label: 'Agendada' },
                        { value: 'realizada', label: 'Realizada' },
                        { value: 'cancelada', label: 'Cancelada' },
                      ]}
                      size="sm"
                    />
                  </div>
                </div>

                {isExpanded && visit.status === 'realizada' && (
                  <VisitFeedback visit={visit} onSave={(interesse, notas) => handleInteresseChange(visit.id, interesse, notas)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <VisitModal
        propertyId={propertyId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={v => onChange([v, ...visits])}
      />
    </div>
  )
}

const VisitFeedback: React.FC<{ visit: PropertyVisit; onSave: (interesse: string, notas: string) => void }> = ({ visit, onSave }) => {
  const [interesse, setInteresse] = useState(visit.interesse ?? '')
  const [notas, setNotas] = useState(visit.notas ?? '')

  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Cliente demonstrou interesse?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['sim', 'nao', 'talvez'].map(v => (
            <button
              key={v}
              onClick={() => setInteresse(v)}
              style={{ padding: '4px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: interesse === v ? 700 : 400, background: interesse === v ? 'var(--color-primary)' : 'var(--surface)', color: interesse === v ? '#fff' : 'var(--text-secondary)', borderColor: interesse === v ? 'var(--color-primary)' : 'var(--border)' }}
            >
              {v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Talvez'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nota pós-visita</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          style={{ width: '100%', fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => onSave(interesse, notas)}>Guardar</Button>
      </div>
    </div>
  )
}
