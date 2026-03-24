import React, { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, MapPin, User, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments.api'
import { useAuthStore } from '../store/auth.store'

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
  const { user } = useAuthStore()
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
    } catch { } finally { setSaving(false) }
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
          <h1 className="text-2xl font-bold text-slate-900">Agendamentos</h1>
          <p className="text-slate-500 text-sm mt-1">Visitas, chamadas e reuniões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === s ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                style={filter === s ? { background: STATUS_COLORS[s] || '#6366f1' } : {}}>
                {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">A carregar...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">Sem agendamentos</p>
              <button onClick={openCreate}
                className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Criar primeiro agendamento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                  <div className="w-1 self-stretch rounded-full" style={{ background: STATUS_COLORS[a.status] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{a.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
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
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{TYPE_LABELS[a.type]}</span>
                      </div>
                    </div>
                    {a.description && <p className="text-sm text-slate-400 mt-1 truncate">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {a.status === 'SCHEDULED' && (
                      <button onClick={() => handleStatusChange(a.id, 'CONFIRMED')}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Confirmar">
                        <Check size={15} />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 text-xs font-medium px-2">
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
            <h3 className="font-semibold text-slate-800 capitalize">{monthLabel}</h3>
            <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-slate-400 border-b border-slate-100">{d}</div>
            ))}
            {days.map((day, i) => {
              const dayAppts = day ? getApptsForDay(day) : []
              const isToday = day?.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`min-h-[80px] p-1.5 border-b border-r border-slate-50 ${!day ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-500 text-white' : 'text-slate-600'}`}>
                        {day.getDate()}
                      </span>
                      {dayAppts.slice(0, 2).map(a => (
                        <div key={a.id} onClick={() => openEdit(a)}
                          className="text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer mb-0.5"
                          style={{ background: STATUS_COLORS[a.status] + '20', color: STATUS_COLORS[a.status] }}>
                          {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 2 && <div className="text-xs text-slate-400">+{dayAppts.length - 2}</div>}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Editar agendamento' : 'Novo agendamento'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="ex: Visita ao apartamento T3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Início *</label>
                  <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Fim *</label>
                  <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Localização</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Morada ou link de reunião" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
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
