import React, { useState } from 'react'
import { MessageSquare, MessageCircle, FileText, CheckSquare, X, Loader2, CalendarDays } from 'lucide-react'
import { DatePickerInput } from '../ui/DatePickerInput'
import { DateTimePickerInput } from '../ui/DateTimePickerInput'
import type { Opportunity } from '../../types'
import { createInteraction } from '../../api/interactions.api'
import { createTask } from '../../api/tasks.api'
import { createConversation } from '../../api/conversations.api'
import { createAppointment } from '../../api/appointments.api'
import { useUIStore } from '../../store/ui.store'
import { useCallStore } from '../../store/call.store'
import { useAuthStore } from '../../store/auth.store'
import { useNavigate } from 'react-router-dom'

interface QuickActionModalProps {
  opportunity: Opportunity
  action: string
  onClose: () => void
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({ opportunity, action, onClose }) => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [msgText, setMsgText] = useState('')

  const contact = opportunity.contact

  // ── Phone ────────────────────────────────────────────────────────────────
  if (action === 'call') {
    const phone = contact?.phone || contact?.whatsapp || ''
    if (phone) {
      useCallStore.getState().openDialer(phone, contact?.id)
      showToast(`A ligar para ${contact?.name}…`, 'success')
    } else {
      showToast('Contacto sem número de telefone', 'error')
    }
    onClose()
    return null
  }

  // ── Calendar / Agendamento ────────────────────────────────────────────────
  if (action === 'calendar') {
    const [title, setTitle] = useState('')
    const [type, setType] = useState('VISIT')
    const [startAt, setStartAt] = useState(() => {
      const d = new Date(); d.setMinutes(0, 0, 0)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours()+1)}:00`
    })
    const [endAt, setEndAt] = useState(() => {
      const d = new Date(); d.setMinutes(0, 0, 0)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours()+2)}:00`
    })
    const [location, setLocation] = useState('')

    const saveAppt = async () => {
      if (!title.trim()) return
      setLoading(true)
      try {
        await createAppointment({
          title: title.trim(),
          type,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          location: location || undefined,
          contactId: opportunity.contactId,
          opportunityId: opportunity.id,
          assignedToId: user?.id,
          status: 'SCHEDULED',
        })
        showToast('Agendamento criado e sincronizado com Google Calendar', 'success')
        onClose()
      } catch {
        showToast('Erro ao criar agendamento', 'error')
      } finally {
        setLoading(false)
      }
    }

    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '9px 12px', borderRadius: 8,
      border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
      fontFamily: 'inherit', color: 'var(--text-primary)',
      background: 'var(--surface)', boxSizing: 'border-box',
    }

    return (
      <Overlay onClose={onClose} title="Novo Agendamento" icon={<CalendarDays size={16} />} color="var(--accent)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input autoFocus style={inputStyle} value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveAppt()}
            placeholder="Título do agendamento..." />

          <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
            <option value="VISIT">Visita</option>
            <option value="ANGARIACAO_MEETING">Reunião de angariação</option>
            <option value="CPCV">CPCV</option>
            <option value="ESCRITURA">Escritura</option>
            <option value="GENERAL_MEETING">Reunião geral</option>
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <DateTimePickerInput
              label="Início"
              value={startAt}
              onChange={v => setStartAt(v)}
              clearable={false}
            />
            <DateTimePickerInput
              label="Fim"
              value={endAt}
              onChange={v => setEndAt(v)}
              clearable={false}
            />
          </div>

          <input style={inputStyle} value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Local (opcional)" />
        </div>
        <ContextRow opportunity={opportunity} />
        <ActionButtons onCancel={onClose} onConfirm={saveAppt} loading={loading} confirmLabel="Criar Agendamento" confirmColor="var(--accent)" />
      </Overlay>
    )
  }

  // ── Note modal ───────────────────────────────────────────────────────────
  if (action === 'note') {
    const saveNote = async () => {
      if (!noteText.trim()) return
      setLoading(true)
      try {
        await createInteraction({
          type: 'NOTE',
          body: noteText.trim(),
          contactId: opportunity.contactId,
          opportunityId: opportunity.id,
        })
        showToast('Nota guardada com sucesso', 'success')
        onClose()
      } catch {
        showToast('Erro ao guardar nota', 'error')
      } finally {
        setLoading(false)
      }
    }

    return (
      <Overlay onClose={onClose} title="Adicionar Nota" icon={<FileText size={16} />} color="var(--accent)">
        <textarea
          autoFocus
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Escreva a sua nota sobre esta oportunidade..."
          rows={5}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
          }}
        />
        <ContextRow opportunity={opportunity} />
        <ActionButtons onCancel={onClose} onConfirm={saveNote} loading={loading} confirmLabel="Guardar Nota" />
      </Overlay>
    )
  }

  // ── Task modal ────────────────────────────────────────────────────────────
  if (action === 'task') {
    const saveTask = async () => {
      if (!taskTitle.trim()) return
      setLoading(true)
      try {
        await createTask({
          title: taskTitle.trim(),
          priority: taskPriority,
          dueDate: taskDue || undefined,
          contactId: opportunity.contactId,
          opportunityId: opportunity.id,
          assignedToId: user?.id,
          status: 'PENDING',
        })
        showToast('Tarefa criada com sucesso', 'success')
        onClose()
      } catch {
        showToast('Erro ao criar tarefa', 'error')
      } finally {
        setLoading(false)
      }
    }

    return (
      <Overlay onClose={onClose} title="Nova Tarefa" icon={<CheckSquare size={16} />} color="#f59e0b">
        <input
          autoFocus
          type="text"
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveTask()}
          placeholder="Título da tarefa..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 13,
            outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <DatePickerInput
              label="Prazo"
              value={taskDue}
              onChange={setTaskDue}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Prioridade</label>
            <select
              value={taskPriority}
              onChange={e => setTaskPriority(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: 12,
                outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--surface)',
              }}
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
        </div>
        <ContextRow opportunity={opportunity} />
        <ActionButtons onCancel={onClose} onConfirm={saveTask} loading={loading} confirmLabel="Criar Tarefa" />
      </Overlay>
    )
  }

  // ── WhatsApp modal ─────────────────────────────────────────────────────────
  if (action === 'whatsapp') {
    const phone = contact?.whatsapp || contact?.phone || ''
    const sendWhatsApp = async () => {
      if (!msgText.trim()) return
      setLoading(true)
      try {
        const convRes = await createConversation({
          channel: 'WHATSAPP',
          contactId: opportunity.contactId,
          externalId: phone,
        })
        const convId = convRes.data?.id || convRes.data?.conversation?.id
        if (convId) {
          navigate(`/conversations?id=${convId}`)
          showToast('Conversa WhatsApp aberta', 'success')
        } else {
          navigate('/conversations')
        }
        onClose()
      } catch {
        navigate('/conversations')
        showToast('A abrir WhatsApp…', 'success')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    return (
      <Overlay onClose={onClose} title="Mensagem WhatsApp" icon={<MessageCircle size={16} />} color="#25d366">
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          Para: <strong style={{ color: 'var(--text-primary)' }}>{contact?.name}</strong>
          {phone && <span style={{ marginLeft: 6, color: '#94a3b8' }}>{phone}</span>}
          {!phone && <span style={{ marginLeft: 6, color: '#ef4444' }}>Sem número registado</span>}
        </div>
        <textarea
          autoFocus
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder="Escreva a sua mensagem..."
          rows={4}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
          }}
        />
        <ContextRow opportunity={opportunity} />
        <ActionButtons onCancel={onClose} onConfirm={sendWhatsApp} loading={loading} confirmLabel="Enviar" confirmColor="#25d366" />
      </Overlay>
    )
  }

  // ── SMS modal ──────────────────────────────────────────────────────────────
  if (action === 'sms') {
    const sendSMS = async () => {
      if (!msgText.trim()) return
      setLoading(true)
      try {
        await createInteraction({
          type: 'NOTE',
          subject: 'SMS',
          body: `[SMS] ${msgText.trim()}`,
          contactId: opportunity.contactId,
          opportunityId: opportunity.id,
        })
        showToast('SMS registado com sucesso', 'success')
        onClose()
      } catch {
        showToast('Erro ao registar SMS', 'error')
      } finally {
        setLoading(false)
      }
    }

    return (
      <Overlay onClose={onClose} title="Enviar SMS" icon={<MessageSquare size={16} />} color="var(--accent)">
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          Para: <strong style={{ color: 'var(--text-primary)' }}>{contact?.name}</strong>
          {contact?.phone && <span style={{ marginLeft: 6, color: '#94a3b8' }}>{contact.phone}</span>}
        </div>
        <textarea
          autoFocus
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder="Escreva a mensagem SMS..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 13, resize: 'none',
            outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)',
          }}
        />
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          O SMS será registado no histórico de interações do contacto.
        </p>
        <ContextRow opportunity={opportunity} />
        <ActionButtons onCancel={onClose} onConfirm={sendSMS} loading={loading} confirmLabel="Registar SMS" />
      </Overlay>
    )
  }

  return null
}

// ── Shared sub-components ──────────────────────────────────────────────────

const Overlay: React.FC<{
  onClose: () => void
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}> = ({ onClose, title, icon, color, children }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
  >
    <div
      style={{
        background: 'var(--surface)', borderRadius: 14, width: 420, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'visible',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: color + '18',
              color: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</span>
        </div>
        <button
          onClick={onClose}
          style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
        >
          <X size={16} />
        </button>
      </div>
      {/* Body */}
      <div style={{ padding: '16px 18px 18px' }}>
        {children}
      </div>
    </div>
  </div>
)

const ContextRow: React.FC<{ opportunity: Opportunity }> = ({ opportunity }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
      padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)',
      border: '1px solid #f1f5f9',
    }}
  >
    <span style={{ fontSize: 11, color: '#94a3b8' }}>Oportunidade:</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {opportunity.title}
    </span>
  </div>
)

const ActionButtons: React.FC<{
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
  confirmLabel: string
  confirmColor?: string
}> = ({ onCancel, onConfirm, loading, confirmLabel, confirmColor = '#2563eb' }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
    <button
      onClick={onCancel}
      style={{
        padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
        background: 'var(--surface-2)', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Cancelar
    </button>
    <button
      onClick={onConfirm}
      disabled={loading}
      style={{
        padding: '8px 18px', borderRadius: 8, border: 'none',
        background: confirmColor, color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
      }}
    >
      {loading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
      {confirmLabel}
    </button>
  </div>
)
