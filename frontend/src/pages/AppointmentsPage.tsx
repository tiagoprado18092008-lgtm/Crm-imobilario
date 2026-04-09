import React, { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, MapPin, User, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments.api'
import { getContacts } from '../api/contacts.api'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import type { Contact } from '../types'

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#6366f1', CONFIRMED: '#10b981', CANCELLED: '#ef4444',
  COMPLETED: '#64748b', NO_SHOW: '#f59e0b',
}
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído', NO_SHOW: 'Não compareceu',
}
const TYPE_LABELS: Record<string, string> = {
  VISIT: 'Visita', CALL: 'Chamada', MEETING: 'Reunião', OTHER: 'Outro',
}

const WEEK_DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const EMPTY_FORM = {
  title: '', description: '', startAt: '', endAt: '', status: 'SCHEDULED',
  type: 'VISIT', location: '', notes: '', contactId: '', opportunityId: '',
}

function toLocalDatetimeInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
  border: '1px solid var(--border-color)', borderRadius: 8,
  background: 'var(--bg-page)', color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)',
}

export const AppointmentsPage: React.FC = () => {
  useAuthStore()
  const { showToast } = useUIStore()
  const [appointments, setAppointments] = useState<any[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar' | 'week'>('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [responsibleFilter, setResponsibleFilter] = useState<string>('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Calendar navigation — month/year (ref: calendar ddwn)
  const today = new Date()
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())

  // Week view — anchor to start-of-week (Sunday) of today
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today))

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToThisWeek = () => setWeekStart(getWeekStart(today))

  // Returns array of 7 Date objects for the current week
  const getWeekDays = (start: Date): Date[] =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })

  const weekDays = getWeekDays(weekStart)

  const load = async () => {
    try {
      const [apRes, ctRes] = await Promise.all([
        listAppointments(),
        getContacts({ limit: 200 }),
      ])
      const d = apRes.data
      setAppointments(Array.isArray(d) ? d : d.data || [])
      const cd = ctRes.data
      setContacts(Array.isArray(cd) ? cd : cd.data || [])
    } catch {
      showToast('Erro ao carregar agendamentos', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (a: any) => {
    setEditing(a)
    setForm({
      title: a.title, description: a.description || '', notes: a.notes || '',
      location: a.location || '', status: a.status, type: a.type,
      startAt: toLocalDatetimeInput(a.startAt),
      endAt: toLocalDatetimeInput(a.endAt),
      contactId: a.contactId || '', opportunityId: a.opportunityId || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Título obrigatório', 'error'); return }
    if (!form.startAt) { showToast('Data de início obrigatória', 'error'); return }
    if (!form.endAt) { showToast('Data de fim obrigatória', 'error'); return }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      showToast('Data de fim deve ser posterior ao início', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        contactId: form.contactId || undefined,
        opportunityId: form.opportunityId || undefined,
        description: form.description || undefined,
        notes: form.notes || undefined,
        location: form.location || undefined,
      }
      if (editing) {
        const res = await updateAppointment(editing.id, payload)
        setAppointments(a => a.map(x => x.id === editing.id ? res.data : x))
      } else {
        const res = await createAppointment(payload)
        setAppointments(a => [res.data, ...a])
      }
      setShowModal(false)
      showToast(editing ? 'Agendamento atualizado' : 'Agendamento criado', 'success')
    } catch (err: any) {
      const details = err?.response?.data?.details
      const msg = details?.length
        ? details.map((d: any) => d.message).join(', ')
        : err?.response?.data?.error || 'Erro ao guardar agendamento'
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAppointment(deleteId)
      setAppointments(a => a.filter(x => x.id !== deleteId))
      setDeleteId(null)
      showToast('Agendamento eliminado', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao eliminar agendamento', 'error')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await updateAppointment(id, { status })
      setAppointments(a => a.map(x => x.id === id ? res.data : x))
      showToast('Estado atualizado', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao atualizar estado', 'error')
    }
  }

  const filtered = filter === 'ALL' ? appointments : appointments.filter(a => a.status === filter)

  // Unique responsible users across all appointments
  const responsibleUsers: { id: string; name: string }[] = []
  const seenIds = new Set<string>()
  for (const a of appointments) {
    if (a.assignedTo && !seenIds.has(a.assignedTo.id)) {
      seenIds.add(a.assignedTo.id)
      responsibleUsers.push({ id: a.assignedTo.id, name: a.assignedTo.name })
    }
  }

  // Apply responsible filter on top of status filter
  const visibleAppointments = responsibleFilter === 'ALL'
    ? filtered
    : filtered.filter(a => a.assignedTo?.id === responsibleFilter)

  // Calendar helpers — month grid (ref: calendar pattern)
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const getDaysInMonth = () => {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(calYear, calMonth, d))
    return days
  }

  const getApptsForDay = (day: Date) =>
    visibleAppointments.filter(a => new Date(a.startAt).toDateString() === day.toDateString())

  const days = getDaysInMonth()

  // Year range for dropdown (ref: calendar ddwn — 25 years back/forward)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {(['list', 'week', 'calendar'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', fontSize: 13, fontWeight: 500,
                background: view === v ? '#6366f1' : 'var(--bg-card)',
                color: view === v ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (view !== v) e.currentTarget.style.background = 'var(--hover-bg)' }}
              onMouseLeave={e => { if (view !== v) e.currentTarget.style.background = 'var(--bg-card)' }}
            >
              {v === 'list' ? 'Lista' : v === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        {view === 'list' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 150ms',
                  background: filter === s ? (STATUS_COLORS[s] || '#6366f1') : 'var(--hover-bg)',
                  color: filter === s ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        <Button size="sm" onClick={openCreate} style={{ marginLeft: 'auto' }}>
          <Plus style={{ width: 14, height: 14 }} /> Novo agendamento
        </Button>
      </div>

      {/* Responsible filter chips */}
      {responsibleUsers.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Responsável:
          </span>
          {[{ id: 'ALL', name: 'Todos' }, ...responsibleUsers].map(u => (
            <button
              key={u.id}
              onClick={() => setResponsibleFilter(u.id)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 150ms',
                background: responsibleFilter === u.id ? '#6366f1' : 'var(--hover-bg)',
                color: responsibleFilter === u.id ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
        ) : visibleAppointments.length === 0 ? (
          <div style={{ borderRadius: 12, border: '1px solid var(--border-color)', padding: '48px 24px', textAlign: 'center', background: 'var(--bg-card)' }}>
            <Calendar size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Sem agendamentos</p>
            <Button size="sm" onClick={openCreate}>Criar primeiro agendamento</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleAppointments.map(a => {
              const sc = STATUS_COLORS[a.status] || '#6366f1'
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px', borderRadius: 10,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
                >
                  {/* Status bar */}
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 4, background: sc, flexShrink: 0 }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{a.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {new Date(a.startAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {a.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={11} />{a.location}
                            </span>
                          )}
                          {a.contact && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={11} />{a.contact.name}
                            </span>
                          )}
                        </div>
                        {a.description && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                            {a.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sc + '18', color: sc }}>
                          {STATUS_LABELS[a.status]}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
                          {TYPE_LABELS[a.type]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {a.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleStatusChange(a.id, 'CONFIRMED')}
                        title="Confirmar"
                        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#16a34a' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(a)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(a.id)}
                      title="Eliminar"
                      style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── CALENDAR VIEW ── (ref: calendar + calendar ddwn patterns) */}
      {view === 'calendar' && (
        <div style={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Calendar header with month/year dropdowns (ref: calendar ddwn) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={prevMonth}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Month + Year dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={calMonth}
                onChange={e => setCalMonth(Number(e.target.value))}
                style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {MONTHS_PT.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={calYear}
                onChange={e => setCalYear(Number(e.target.value))}
                style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button
              onClick={nextMonth}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers (ref: calendar — DAYS_OF_WEEK pattern) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
            {WEEK_DAYS_PT.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid (ref: calendar — day cells as buttons) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, i) => {
              const dayAppts = day ? getApptsForDay(day) : []
              const isToday = day?.toDateString() === today.toDateString()
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 80, padding: '6px 4px',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    background: !day ? 'var(--hover-bg)' : isToday ? 'rgba(99,102,241,0.03)' : 'transparent',
                  }}
                >
                  {day && (
                    <>
                      {/* Day number — filled circle for today (ref: calendar selected style) */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: isToday ? 700 : 400,
                          background: isToday ? '#6366f1' : 'transparent',
                          color: isToday ? '#fff' : 'var(--text-secondary)',
                        }}>
                          {day.getDate()}
                        </span>
                      </div>
                      {/* Events */}
                      {dayAppts.slice(0, 2).map(a => (
                        <div
                          key={a.id}
                          onClick={() => openEdit(a)}
                          style={{
                            fontSize: 11, padding: '2px 6px', borderRadius: 6,
                            marginBottom: 2, cursor: 'pointer', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            background: STATUS_COLORS[a.status] + '18',
                            color: STATUS_COLORS[a.status],
                            fontWeight: 600,
                          }}
                          title={a.title}
                        >
                          {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 600 }}>
                          +{dayAppts.length - 2} mais
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar agendamento' : 'Novo agendamento'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={inputStyle}
              placeholder="ex: Visita ao apartamento T3"
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Início *</label>
              <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fim *</label>
              <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Localização</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="Morada ou link de reunião" />
          </div>
          <div>
            <label style={labelStyle}>Contacto</label>
            <select value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} style={inputStyle}>
              <option value="">Nenhum</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              style={{ flex: 1 }}
              loading={saving}
              onClick={handleSave}
              disabled={saving || !form.title || !form.startAt || !form.endAt}
            >
              {editing ? 'Guardar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Eliminação" size="sm">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Deseja eliminar este agendamento? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
