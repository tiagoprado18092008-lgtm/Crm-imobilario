import React, { useEffect, useState } from 'react'
import { X, Calendar, MapPin, AlignLeft, Users, Clock } from 'lucide-react'
import { createCalendarEvent, updateCalendarEvent } from '../../api/calendar.api'
import { useUIStore } from '../../store/ui.store'
import api from '../../api/client'
import { DatePickerInput } from '../ui/DatePickerInput'
import { DateTimePickerInput } from '../ui/DateTimePickerInput'
import { CustomSelect } from '../ui/CustomSelect'

interface EventModalProps {
  event?: any
  defaultStart?: Date
  defaultEnd?: Date
  onClose: () => void
  onSaved: () => void
}

const EVENT_TYPES = [
  { value: 'visit', label: 'Visita' },
  { value: 'meeting', label: 'Reunião de angariação' },
  { value: 'cpcv', label: 'CPCV' },
  { value: 'escritura', label: 'Escritura' },
  { value: 'call', label: 'Chamada' },
  { value: 'other', label: 'Outro' },
]

const COLORS = ['var(--accent)','#10b981','#f59e0b','#ef4444','var(--accent)','#8b5cf6','#ec4899','#14b8a6']

const RECURRENCE = [
  { value: '', label: 'Não repete' },
  { value: 'FREQ=DAILY', label: 'Diário' },
  { value: 'FREQ=WEEKLY', label: 'Semanal' },
  { value: 'FREQ=MONTHLY', label: 'Mensal' },
]

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const EventModal: React.FC<EventModalProps> = ({
  event, defaultStart, defaultEnd, onClose, onSaved,
}) => {
  const { showToast } = useUIStore()
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [contactSearch, setContactSearch] = useState('')

  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  const [form, setForm] = useState({
    title: event?.title || '',
    eventType: event?.eventType || 'other',
    startAt: toLocalInput(event?.startAt ? new Date(event.startAt) : (defaultStart || now)),
    endAt: toLocalInput(event?.endAt ? new Date(event.endAt) : (defaultEnd || oneHourLater)),
    isAllDay: event?.isAllDay || false,
    recurringRule: event?.recurringRule || '',
    location: event?.location || '',
    description: event?.description || '',
    color: event?.color || 'var(--accent)',
    contactId: event?.contactId || '',
    attendees: (event?.attendees || []) as string[],
  })

  const [newAttendee, setNewAttendee] = useState('')

  useEffect(() => {
    api.get('/contacts', { params: { limit: 50, search: contactSearch } })
      .then(r => setContacts(r.data.data || []))
      .catch(() => {})
  }, [contactSearch])

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { showToast('Título obrigatório', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        recurringRule: form.recurringRule || undefined,
        contactId: form.contactId || undefined,
        isRecurring: !!form.recurringRule,
        attendees: form.attendees.length > 0 ? form.attendees : undefined,
      }
      if (event?.id) {
        await updateCalendarEvent(event.id, payload)
        showToast('Evento actualizado', 'success')
      } else {
        await createCalendarEvent(payload)
        showToast('Evento criado', 'success')
      }
      onSaved()
    } catch {
      showToast('Erro ao guardar evento', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addAttendee = () => {
    const email = newAttendee.trim()
    if (email && !form.attendees.includes(email)) {
      set('attendees', [...form.attendees, email])
      setNewAttendee('')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    marginBottom: 4, textTransform: 'uppercase' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh',
        overflow: 'auto', padding: '24px 28px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {event?.id ? 'Editar evento' : 'Novo evento'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Origin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {event?.externalProvider === 'google' && (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="#4285F4"/>
                </svg>
                <span style={{ fontSize: 12, color: '#6b7a99' }}>Google Calendar</span>
              </>
            )}
            {event?.externalProvider === 'outlook' && (
              <>
                <span style={{ fontSize: 12, fontWeight: 700 as const, color: '#0078d4' }}>O</span>
                <span style={{ fontSize: 12, color: '#6b7a99' }}>Outlook</span>
              </>
            )}
            {!event?.externalProvider && (
              <span style={{ fontSize: 12, color: '#6b7a99' }}>Criado no CRM</span>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Nome do evento" />
          </div>

          {/* Type + Color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <CustomSelect
                value={form.eventType}
                onChange={v => set('eventType', v)}
                options={EVENT_TYPES}
              />
            </div>
            <div>
              <label style={labelStyle}>Cor</label>
              <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => set('color', c)} style={{
                    width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* All Day Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <input type="checkbox" id="allDay" checked={form.isAllDay} onChange={e => set('isAllDay', e.target.checked)} />
            <label htmlFor="allDay" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Dia inteiro
            </label>
          </div>

          {/* Start + End */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              {form.isAllDay ? (
                <DatePickerInput
                  label="Início"
                  value={form.startAt.split('T')[0]}
                  onChange={v => set('startAt', v ? v + 'T00:00' : '')}
                />
              ) : (
                <DateTimePickerInput
                  label="Início"
                  value={form.startAt}
                  onChange={v => set('startAt', v)}
                />
              )}
            </div>
            <div>
              {form.isAllDay ? (
                <DatePickerInput
                  label="Fim"
                  value={form.endAt.split('T')[0]}
                  onChange={v => set('endAt', v ? v + 'T00:00' : '')}
                />
              ) : (
                <DateTimePickerInput
                  label="Fim"
                  value={form.endAt}
                  onChange={v => set('endAt', v)}
                />
              )}
            </div>
          </div>

          {/* Recurrence */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Recorrência</label>
            <CustomSelect
              value={form.recurringRule}
              onChange={v => set('recurringRule', v)}
              options={RECURRENCE}
            />
          </div>

          {/* Location */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}><MapPin size={9} style={{ marginRight: 3 }} />Local</label>
            <input style={inputStyle} value={form.location}
              onChange={e => set('location', e.target.value)} placeholder="Endereço ou link" />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}><AlignLeft size={9} style={{ marginRight: 3 }} />Descrição</label>
            <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Notas adicionais" />
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Contacto associado</label>
            <input style={inputStyle} placeholder="Pesquisar contacto..."
              value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
            {contacts.length > 0 && contactSearch && (
              <div style={{
                border: '1px solid var(--border)', borderRadius: 8, marginTop: 4,
                maxHeight: 150, overflow: 'auto', background: 'var(--surface)',
              }}>
                {contacts.map(c => (
                  <div key={c.id} onClick={() => { set('contactId', c.id); setContactSearch(c.name) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
                      background: form.contactId === c.id ? 'var(--surface-3)' : 'transparent' }}>
                    {c.name}
                    {c.email && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>{c.email}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}><Users size={9} style={{ marginRight: 3 }} />Convidados</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={newAttendee} type="email"
                onChange={e => setNewAttendee(e.target.value)} placeholder="email@exemplo.com"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }} />
              <button type="button" onClick={addAttendee} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              }}>Adicionar</button>
            </div>
            {form.attendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {form.attendees.map(a => (
                  <span key={a} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 20, fontSize: 11,
                    background: 'var(--surface-3)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                    {a}
                    <X size={10} style={{ cursor: 'pointer' }}
                      onClick={() => set('attendees', form.attendees.filter((x: string) => x !== a))} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 24px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}>{saving ? 'A guardar...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
