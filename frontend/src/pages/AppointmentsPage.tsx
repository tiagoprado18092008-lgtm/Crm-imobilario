import React, { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, MapPin, User, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments.api'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'

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

const EMPTY_FORM = {
  title: '', description: '', startAt: '', endAt: '', status: 'SCHEDULED',
  type: 'VISIT', location: '', notes: '', contactId: '', opportunityId: '',
}

export const AppointmentsPage: React.FC = () => {
  useAuthStore()
  const { showToast } = useUIStore()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const load = async () => {
    try {
      const res = await listAppointments()
      setAppointments(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (a: any) => {
    setEditing(a)
    setForm({
      title: a.title, description: a.description || '', notes: a.notes || '',
      location: a.location || '', status: a.status, type: a.type,
      startAt: a.startAt?.slice(0, 16), endAt: a.endAt?.slice(0, 16),
      contactId: a.contactId || '', opportunityId: a.opportunityId || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.startAt || !form.endAt) return
    setSaving(true)
    try {
      if (editing) {
        const res = await updateAppointment(editing.id, form)
        setAppointments(a => a.map(x => x.id === editing.id ? res.data : x))
      } else {
        const res = await createAppointment(form)
        setAppointments(a => [res.data, ...a])
      }
      setShowModal(false)
      showToast(editing ? 'Agendamento atualizado' : 'Agendamento criado', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao guardar agendamento', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar agendamento?')) return
    await deleteAppointment(id)
    setAppointments(a => a.filter(x => x.id !== id))
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateAppointment(id, { status })
    setAppointments(a => a.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = filter === 'ALL' ? appointments : appointments.filter(a => a.status === filter)

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }

  const getApptsForDay = (day: Date) =>
    appointments.filter(a => new Date(a.startAt).toDateString() === day.toDateString())

  const days = getDaysInMonth(currentMonth)
  const monthLabel = currentMonth.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Agendamentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Visitas, chamadas e reuniões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl p-1" style={{ background: 'var(--hover-bg)' }}>
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all`}
                style={view === v ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: 'var(--text-secondary)' }}>
                {v === 'list' ? 'Lista' : 'Calendário'}
              </button>
            ))}
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Plus size={16} /> Novo agendamento
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all`}
                style={filter === s ? { background: STATUS_COLORS[s] || '#6366f1', color: '#fff' } : { background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
                {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>A carregar...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sem agendamentos</p>
              <button onClick={openCreate}
                className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Criar primeiro agendamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => (
                <div key={a.id} className="rounded-2xl border p-4 flex items-start gap-4 hover:shadow-sm transition-shadow" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="w-1 self-stretch rounded-full" style={{ background: STATUS_COLORS[a.status] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="flex items-center gap-1"><Clock size={12} />
                            {new Date(a.startAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {a.location && <span className="flex items-center gap-1"><MapPin size={12} />{a.location}</span>}
                          {a.contact && <span className="flex items-center gap-1"><User size={12} />{a.contact.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: STATUS_COLORS[a.status] + '15', color: STATUS_COLORS[a.status] }}>
                          {STATUS_LABELS[a.status]}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>{TYPE_LABELS[a.type]}</span>
                      </div>
                    </div>
                    {a.description && <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {a.status === 'SCHEDULED' && (
                      <button onClick={() => handleStatusChange(a.id, 'CONFIRMED')}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Confirmar">
                        <Check size={15} />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg text-xs font-medium px-2"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-primary)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h3>
            <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-primary)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>{d}</div>
            ))}
            {days.map((day, i) => {
              const dayAppts = day ? getApptsForDay(day) : []
              const isToday = day?.toDateString() === new Date().toDateString()
              return (
                <div key={i} className="min-h-[80px] p-1.5 border-b border-r" style={{ borderColor: 'var(--border-subtle)', background: !day ? 'var(--hover-bg)' : 'transparent' }}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1`}
                        style={isToday ? { background: '#6366f1', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                        {day.getDate()}
                      </span>
                      {dayAppts.slice(0, 2).map(a => (
                        <div key={a.id} onClick={() => openEdit(a)}
                          className="text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer mb-0.5"
                          style={{ background: STATUS_COLORS[a.status] + '20', color: STATUS_COLORS[a.status] }}>
                          {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 2 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>+{dayAppts.length - 2}</div>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar agendamento' : 'Novo agendamento'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  placeholder="ex: Visita ao apartamento T3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Início *</label>
                  <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Fim *</label>
                  <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Localização</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  placeholder="Morada ou link de reunião" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.title || !form.startAt || !form.endAt}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  {saving ? 'A guardar...' : editing ? 'Guardar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
