import React, { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { getContacts } from '../../../api/contacts.api'
import { createVisit } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import type { PropertyVisit, Contact } from '../../../types'
import { DateTimePickerInput } from '../../ui/DateTimePickerInput'
import { CustomSelect } from '../../ui/CustomSelect'

interface Props {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (visit: PropertyVisit) => void
}

export const VisitModal: React.FC<Props> = ({ propertyId, isOpen, onClose, onCreated }) => {
  const { showToast } = useUIStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    getContacts({ limit: 200 }).then(r => {
      const d = r.data
      setContacts(Array.isArray(d) ? d : d.data || [])
    }).catch(() => {})
  }, [isOpen])

  const handleSubmit = async () => {
    if (!scheduledAt) { showToast('Data e hora obrigatórias', 'error'); return }
    setSaving(true)
    try {
      const res = await createVisit(propertyId, { contactId: contactId || undefined, scheduledAt, notas })
      onCreated(res.data)
      showToast('Visita agendada', 'success')
      onClose()
      setContactId(''); setScheduledAt(''); setNotas('')
    } catch {
      showToast('Erro ao agendar visita', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Visita" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <CustomSelect
            label="Cliente"
            value={contactId}
            onChange={v => setContactId(v)}
            placeholder="— Seleccionar cliente —"
            options={contacts.map(c => ({ value: c.id, label: c.name + (c.phone ? ` · ${c.phone}` : '') }))}
            searchable
          />
        </div>
        <div>
          <DateTimePickerInput
            label="Data e hora *"
            value={scheduledAt}
            onChange={setScheduledAt}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notas</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            style={{ width: '100%', fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>Agendar</Button>
        </div>
      </div>
    </Modal>
  )
}
