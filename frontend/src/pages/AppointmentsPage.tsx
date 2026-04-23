import React, { useEffect, useState } from 'react'
import { Calendar, Plus, Clock, MapPin, User, X, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments.api'
import { getCalendars, createCalendar, deleteCalendar, type AppointmentCalendar } from '../api/appointment-calendars.api'
import { syncCalendar, getCalendarStatus } from '../api/calendar.api'
import { getContacts } from '../api/contacts.api'
import { getUsers } from '../api/users.api'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import { usePermissions } from '../hooks/usePermissions'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { CustomSelect } from '../components/ui/CustomSelect'
import type { Contact } from '../types'

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'var(--accent)', CONFIRMED: '#10b981', CANCELLED: '#ef4444',
  COMPLETED: '#64748b', NO_SHOW: '#f59e0b',
}
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído', NO_SHOW: 'Não compareceu',
}
const TYPE_LABELS: Record<string, string> = {
  VISIT:              'Visita',
  ANGARIACAO_MEETING: 'Reunião de angariação',
  CPCV:               'CPCV',
  ESCRITURA:          'Escritura',
  GENERAL_MEETING:    'Reunião geral',
}

const WEEK_DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6 to 23
const HOUR_HEIGHT = 60 // px per hour
const GRID_START_HOUR = 6

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
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)',
}

export const AppointmentsPage: React.FC = () => {
  useAuthStore()
  const { showToast } = useUIStore()
  const { isAgencyAdmin } = usePermissions()
  const [appointments, setAppointments] = useState<any[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'calendar' | 'list'>('calendar')
  const [view, setView] = useState<'list' | 'calendar' | 'week'>('week')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set(['ALL']))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const weekGridRef = React.useRef<HTMLDivElement>(null)
  const dayColRefs = React.useRef<(HTMLDivElement | null)[]>([])

  // Drag-to-create state
  const [dragCreate, setDragCreate] = useState<{
    dayIndex: number
    startMin: number // minutes from GRID_START_HOUR
    endMin: number
  } | null>(null)
  const dragCreateRef = React.useRef(dragCreate)
  dragCreateRef.current = dragCreate

  // Drag-to-move state
  const [dragMove, setDragMove] = useState<{
    apptId: string
    origDayIndex: number
    origStartMin: number
    origEndMin: number
    curDayIndex: number
    curStartMin: number
    curEndMin: number
    offsetMin: number // click offset within the block
  } | null>(null)
  const dragMoveRef = React.useRef(dragMove)
  dragMoveRef.current = dragMove
  const didDragMoveRef = React.useRef(false)

  const snapToGrid = (rawMin: number) => Math.round(rawMin / 15) * 15

  const yToMinutes = (y: number): number => {
    const clamped = Math.max(0, Math.min(y, HOURS.length * HOUR_HEIGHT))
    return snapToGrid((clamped / HOUR_HEIGHT) * 60)
  }

  const getColYSimple = (dayIndex: number, clientY: number): number => {
    const col = dayColRefs.current[dayIndex]
    if (!col) return 0
    const rect = col.getBoundingClientRect()
    return clientY - rect.top
  }

  // Auto-scroll the week grid to current hour (or 8am) when week view is shown
  useEffect(() => {
    if (view === 'week' && weekGridRef.current) {
      const now = new Date()
      const hour = Math.max(now.getHours(), 8)
      const scrollTarget = Math.max(0, (hour - GRID_START_HOUR - 1) * HOUR_HEIGHT)
      weekGridRef.current.scrollTop = scrollTarget
    }
  }, [view])

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

  // Drag-to-create: uses native DOM listeners so stopPropagation on cards works correctly.
  // React 17+ uses event delegation at the root, so React stopPropagation doesn't block
  // native window listeners — we must use native addEventListener throughout.
  const dragDayIndexRef = React.useRef<number | null>(null)

  // Register native mousedown on each day column via refs
  useEffect(() => {
    const cleanups: (() => void)[] = []

    dayColRefs.current.forEach((col, di) => {
      if (!col) return
      const onDown = (e: MouseEvent) => {
        if (e.button !== 0) return
        // Don't start drag if click originated on an appointment card
        const target = e.target as HTMLElement
        if (target.closest('[data-appt-card]')) return
        e.preventDefault()
        dragDayIndexRef.current = di
        const startMin = yToMinutes(Math.max(0, e.clientY - col.getBoundingClientRect().top))
        setDragCreate({ dayIndex: di, startMin, endMin: startMin })
      }
      col.addEventListener('mousedown', onDown)
      cleanups.push(() => col.removeEventListener('mousedown', onDown))
    })

    const onMouseMove = (e: MouseEvent) => {
      // Handle drag-move
      const mv = dragMoveRef.current
      if (mv) {
        // Find which day column the cursor is over
        let targetDayIndex = mv.curDayIndex
        for (let i = 0; i < dayColRefs.current.length; i++) {
          const col = dayColRefs.current[i]
          if (!col) continue
          const rect = col.getBoundingClientRect()
          if (e.clientX >= rect.left && e.clientX <= rect.right) {
            targetDayIndex = i
            break
          }
        }
        const col = dayColRefs.current[targetDayIndex]
        if (col) {
          const rawY = Math.max(0, e.clientY - col.getBoundingClientRect().top)
          const cursorMin = yToMinutes(rawY)
          const duration = mv.origEndMin - mv.origStartMin
          const newStart = Math.max(0, cursorMin - mv.offsetMin)
          const snapped = Math.round(newStart / 15) * 15
          setDragMove(d => d ? { ...d, curDayIndex: targetDayIndex, curStartMin: snapped, curEndMin: snapped + duration } : null)
        }
        return
      }

      const di = dragDayIndexRef.current
      if (di === null) return
      const drag = dragCreateRef.current
      if (!drag) return
      const col = dayColRefs.current[di]
      if (!col) return
      const rawY = Math.max(0, e.clientY - col.getBoundingClientRect().top)
      const endMin = Math.max(yToMinutes(rawY), drag.startMin + 15)
      setDragCreate(d => d ? { ...d, endMin } : null)
    }

    const onMouseUp = async () => {
      // Handle drag-move completion
      const mv = dragMoveRef.current
      if (mv) {
        const moved = mv.curDayIndex !== mv.origDayIndex || mv.curStartMin !== mv.origStartMin
        if (moved) { didDragMoveRef.current = true
          const day = weekDays[mv.curDayIndex]
          const pad = (n: number) => String(n).padStart(2, '0')
          const toISO = (min: number) => {
            const h = Math.floor(min / 60) + GRID_START_HOUR
            const m = min % 60
            return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(h)}:${pad(m)}`
          }
          const newStart = toISO(mv.curStartMin)
          const newEnd = toISO(mv.curEndMin)
          setDragMove(null)
          try {
            const res = await updateAppointment(mv.apptId, {
              startAt: new Date(newStart).toISOString(),
              endAt: new Date(newEnd).toISOString(),
            })
            setAppointments(a => a.map(x => x.id === mv.apptId ? res.data : x))
          } catch {
            // revert on error — just reload
          }
        } else {
          setDragMove(null)
        }
        return
      }

      if (dragDayIndexRef.current === null) return
      const di = dragDayIndexRef.current
      dragDayIndexRef.current = null
      const drag = dragCreateRef.current
      if (!drag || drag.endMin <= drag.startMin) { setDragCreate(null); return }
      const day = weekDays[di]
      const pad = (n: number) => String(n).padStart(2, '0')
      const toISO = (min: number) => {
        const h = Math.floor(min / 60) + GRID_START_HOUR
        const m = min % 60
        return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(h)}:${pad(m)}`
      }
      setDragCreate(null)
      setEditing(null)
      setForm({ ...EMPTY_FORM, startAt: toISO(drag.startMin), endAt: toISO(drag.endMin) })
      setShowModal(true)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    cleanups.push(
      () => window.removeEventListener('mousemove', onMouseMove),
      () => window.removeEventListener('mouseup', onMouseUp),
    )
    return () => cleanups.forEach(fn => fn())
  }, [weekDays])

  const load = async () => {
    try {
      const [apRes, ctRes, usRes, calStatus] = await Promise.all([
        listAppointments(),
        getContacts({ limit: 200 }),
        getUsers(),
        getCalendarStatus().catch(() => ({ data: [] })),
      ])
      const d = apRes.data
      setAppointments(Array.isArray(d) ? d : d.data || [])
      const cd = ctRes.data
      setContacts(Array.isArray(cd) ? cd : cd.data || [])
      const ud = usRes.data
      const uList = Array.isArray(ud) ? ud : ud.data || []
      setAllUsers(uList.map((u: any) => ({ id: u.id, name: u.name })))
      const integrations: any[] = Array.isArray(calStatus.data) ? calStatus.data : []
      setGoogleConnected(integrations.some((i: any) => i.provider === 'google' && i.isActive))
    } catch {
      showToast('Erro ao carregar agendamentos', 'error')
    } finally { setLoading(false) }
  }

  const handleGoogleSync = async () => {
    setSyncing(true)
    try {
      await syncCalendar()
      await load()
      showToast('Sincronizado com Google Calendar', 'success')
    } catch {
      showToast('Erro ao sincronizar com Google Calendar', 'error')
    } finally { setSyncing(false) }
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
        // Scroll week view to the new appointment's hour
        if (view === 'week' && weekGridRef.current && res.data?.startAt) {
          const apptHour = new Date(res.data.startAt).getHours()
          const scrollTarget = Math.max(0, (apptHour - GRID_START_HOUR - 1) * HOUR_HEIGHT)
          setTimeout(() => { if (weekGridRef.current) weekGridRef.current.scrollTop = scrollTarget }, 50)
        }
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

  // Team filter: admins use allUsers list; others derive from appointments
  const teamFilterUsers: { id: string; name: string }[] = isAgencyAdmin
    ? allUsers
    : (() => {
        const seen = new Set<string>()
        const res: { id: string; name: string }[] = []
        for (const a of appointments) {
          if (a.assignedTo && !seen.has(a.assignedTo.id)) {
            seen.add(a.assignedTo.id)
            res.push({ id: a.assignedTo.id, name: a.assignedTo.name })
          }
        }
        return res
      })()

  const toggleUserFilter = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (id === 'ALL') return new Set(['ALL'])
      next.delete('ALL')
      if (next.has(id)) { next.delete(id); if (next.size === 0) next.add('ALL') }
      else next.add(id)
      return next
    })
  }

  // Apply responsible filter on top of status filter
  const visibleAppointments = selectedUserIds.has('ALL')
    ? filtered
    : filtered.filter(a => a.assignedTo?.id && selectedUserIds.has(a.assignedTo.id))

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

  const getApptStyle = (appt: any): { top: number; height: number } => {
    const start = new Date(appt.startAt)
    const end = new Date(appt.endAt)
    const GRID_END_HOUR = GRID_START_HOUR + HOURS.length
    const gridStartMinutes = GRID_START_HOUR * 60
    const gridEndMinutes = GRID_END_HOUR * 60
    const startTotalMinutes = start.getHours() * 60 + start.getMinutes()
    const endTotalMinutes = end.getHours() * 60 + end.getMinutes()
    // Clamp both start and end within grid bounds
    const clampedStart = Math.max(gridStartMinutes, Math.min(gridEndMinutes, startTotalMinutes))
    const clampedEnd = Math.max(gridStartMinutes, Math.min(gridEndMinutes, endTotalMinutes))
    const startMinutes = clampedStart - gridStartMinutes
    const endMinutes = clampedEnd - gridStartMinutes
    const durationMinutes = Math.max(15, endMinutes - startMinutes)
    const top = (startMinutes / 60) * HOUR_HEIGHT
    const height = Math.max(22, (durationMinutes / 60) * HOUR_HEIGHT - 2)
    return { top, height }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const days = getDaysInMonth()

  // Year range for dropdown (ref: calendar ddwn — 25 years back/forward)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i)

  // Mini calendar state (sidebar)
  const [miniMonth, setMiniMonth] = React.useState(today.getMonth())
  const [miniYear, setMiniYear] = React.useState(today.getFullYear())
  const miniFirstDay = new Date(miniYear, miniMonth, 1).getDay()
  const miniDaysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const selectedKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,'0')}-${String(weekStart.getDate()).padStart(2,'0')}`

  // Appointment calendars state
  const [calendars, setCalendars] = useState<AppointmentCalendar[]>([])
  const [activeCalendarIds, setActiveCalendarIds] = useState<Set<string>>(new Set(['ALL']))
  const [showCalendarForm, setShowCalendarForm] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [newCalendarColor, setNewCalendarColor] = useState('var(--accent)')

  const loadCalendars = async () => {
    try {
      const res = await getCalendars()
      setCalendars(Array.isArray(res.data) ? res.data : [])
    } catch { /* silently fail */ }
  }

  useEffect(() => { loadCalendars() }, [])

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCalendarName.trim()) return
    try {
      await createCalendar({ name: newCalendarName.trim(), color: newCalendarColor })
      showToast('Calendário criado', 'success')
      setNewCalendarName('')
      setNewCalendarColor('var(--accent)')
      setShowCalendarForm(false)
      loadCalendars()
    } catch {
      showToast('Erro ao criar calendário', 'error')
    }
  }

  const handleDeleteCalendar = async (id: string, name: string) => {
    if (!confirm(`Eliminar o calendário "${name}"?`)) return
    try {
      await deleteCalendar(id)
      showToast('Calendário eliminado', 'success')
      setActiveCalendarIds(prev => { const n = new Set(prev); n.delete(id); if (n.size === 0) n.add('ALL'); return n })
      loadCalendars()
    } catch {
      showToast('Erro ao eliminar calendário', 'error')
    }
  }

  const toggleCalendar = (id: string) => {
    setActiveCalendarIds(prev => {
      const next = new Set(prev)
      if (id === 'ALL') return new Set(['ALL'])
      next.delete('ALL')
      if (next.has(id)) { next.delete(id); if (next.size === 0) next.add('ALL') }
      else next.add(id)
      return next
    })
  }

  // Compromissos tab state
  const [listTab, setListTab] = useState<'upcoming' | 'cancelled' | 'all'>('upcoming')
  const [listSearch, setListSearch] = useState('')
  const [listSort, setListSort] = useState<'date_asc' | 'date_desc'>('date_asc')

  const listFiltered = appointments.filter(a => {
    const matchTab = listTab === 'upcoming'
      ? (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && new Date(a.startAt) >= new Date(new Date().setHours(0,0,0,0))
      : listTab === 'cancelled'
      ? a.status === 'CANCELLED'
      : true
    const matchSearch = !listSearch || a.title?.toLowerCase().includes(listSearch.toLowerCase()) ||
      a.contact?.name?.toLowerCase().includes(listSearch.toLowerCase())
    return matchTab && matchSearch
  }).sort((a, b) => {
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    return listSort === 'date_asc' ? diff : -diff
  })

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? '#1a73e8' : '#5f6368',
    borderBottom: active ? '2px solid #1a73e8' : '2px solid transparent',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Main tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0', background: '#fff', paddingLeft: 4 }}>
        <button style={TAB_STYLE(mainTab === 'calendar')} onClick={() => setMainTab('calendar')}>
          Ver de calendário
        </button>
        <button style={TAB_STYLE(mainTab === 'list')} onClick={() => setMainTab('list')}>
          Vista de lista de Compromisso
        </button>
        <div style={{ flex: 1 }} />
        {googleConnected && (
          <button onClick={handleGoogleSync} disabled={syncing} style={{
            margin: '6px 4px 6px 12px', display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6, border: '1px solid #dadce0',
            background: '#fff', color: '#5f6368', cursor: syncing ? 'default' : 'pointer', fontSize: 13, fontWeight: 500,
            opacity: syncing ? 0.7 : 1,
          }}>
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'A sincronizar...' : 'Sincronizar Google'}
          </button>
        )}
        <button onClick={openCreate} style={{
          margin: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 6, border: 'none',
          background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={15} /> Novo agendamento
        </button>
      </div>

      {/* ── List tab (Compromissos) ── */}
      {mainTab === 'list' && (
        <div style={{ background: '#fff', minHeight: 500 }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid #e0e0e0', paddingLeft: 16 }}>
            {(['upcoming', 'cancelled', 'all'] as const).map(t => (
              <button key={t} onClick={() => setListTab(t)} style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: listTab === t ? 600 : 400,
                color: listTab === t ? '#1a73e8' : '#5f6368',
                borderBottom: listTab === t ? '2px solid #1a73e8' : '2px solid transparent',
              }}>
                {t === 'upcoming' ? 'Em breve' : t === 'cancelled' ? 'Cancelado(a)' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid #f1f3f4' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <input
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                placeholder="Pesquisa por Nome"
                style={{
                  width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8,
                  border: '1px solid #dadce0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  background: '#f8f9fa',
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6', pointerEvents: 'none' }}>🔍</span>
            </div>
            <button onClick={() => setListSort(s => s === 'date_asc' ? 'date_desc' : 'date_asc')} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
              borderRadius: 8, border: '1px solid #dadce0', background: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#3c4043',
            }}>
              ↕ Ordenar por data {listSort === 'date_asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                  {['#', 'Título', 'Contacto', 'Estado', 'Hora do compromisso', 'Tipo', 'Responsável'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#5f6368', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                  <th style={{ padding: '10px 16px', width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: '#9aa0a6' }}>A carregar...</td></tr>
                ) : listFiltered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '64px 0', textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>
                    Nenhum compromisso encontrado
                  </td></tr>
                ) : listFiltered.map((a, idx) => {
                  const sc = STATUS_COLORS[a.status] || 'var(--accent)'
                  const start = new Date(a.startAt)
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f3f4', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: '#9aa0a6', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#202124' }}>{a.title}</td>
                      <td style={{ padding: '12px 16px', color: '#5f6368' }}>{a.contact?.name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: sc + '18', color: sc,
                        }}>{STATUS_LABELS[a.status]}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5f6368', whiteSpace: 'nowrap' }}>
                        {start.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' '}
                        <span style={{ color: '#9aa0a6' }}>{start.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5f6368' }}>{TYPE_LABELS[a.type] || a.type}</td>
                      <td style={{ padding: '12px 16px', color: '#5f6368' }}>{a.assignedTo?.name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(a)} style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid #dadce0',
                            background: '#fff', cursor: 'pointer', fontSize: 12, color: '#3c4043',
                          }}>Editar</button>
                          <button onClick={() => setDeleteId(a.id)} style={{
                            padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca',
                            background: '#fff', cursor: 'pointer', fontSize: 12, color: '#ef4444',
                          }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Calendar tab ── */}
      {mainTab === 'calendar' && (
    <div style={{ display: 'flex', minHeight: 700, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 236, borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', flexShrink: 0, background: '#fff' }}>
        {/* Create button */}
        <div style={{ padding: '16px 12px 8px' }}>
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 24,
            border: 'none', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#3c4043',
          }}>
            <Plus size={20} color="#1a73e8" /> Criar
          </button>
        </div>

        {/* Mini calendar */}
        <div style={{ padding: '8px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3c4043' }}>{MONTHS_PT[miniMonth]} {miniYear}</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={() => { if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y-1) } else setMiniMonth(m => m-1) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', color: '#3c4043', display: 'flex' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => { if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y+1) } else setMiniMonth(m => m+1) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, borderRadius: '50%', color: '#3c4043', display: 'flex' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#70757a', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {Array.from({ length: miniFirstDay }).map((_, i) => <div key={`p${i}`} />)}
            {Array.from({ length: miniDaysInMonth }).map((_, i) => {
              const day = i + 1
              const date = new Date(miniYear, miniMonth, day)
              const key = `${miniYear}-${String(miniMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isToday2 = key === todayKey
              const isSel = key === selectedKey
              return (
                <button key={day} onClick={() => { setWeekStart(getWeekStart(date)); if (view !== 'list') setView('week') }}
                  style={{ border: 'none', background: isSel ? '#1a73e8' : 'none', borderRadius: '50%', cursor: 'pointer',
                    color: isSel ? '#fff' : isToday2 ? '#1a73e8' : '#3c4043',
                    fontSize: 11, fontWeight: isSel || isToday2 ? 700 : 400,
                    width: 26, height: 26, margin: '1px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status legend */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#70757a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</div>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[k], flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#3c4043' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Team filter (admin: always show; others: only if >1 person) */}
        {(isAgencyAdmin ? teamFilterUsers.length > 0 : teamFilterUsers.length > 1) && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#70757a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipa</div>
              <button onClick={() => setSelectedUserIds(new Set(['ALL']))} style={{ fontSize: 11, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Todos
              </button>
            </div>
            {teamFilterUsers.map(u => {
              const enabled = !selectedUserIds.has('ALL') && selectedUserIds.has(u.id)
              const initials = u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px', borderRadius: 6, cursor: 'pointer', userSelect: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f4')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => toggleUserFilter(u.id)}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: enabled ? '#1a73e8' : 'transparent',
                    border: '2px solid #1a73e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    {enabled && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e8f0fe', color: '#1a73e8', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initials}
                  </span>
                  <span style={{ fontSize: 12, color: '#3c4043', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                </label>
              )
            })}
          </div>
        )}
        {/* Calendars section */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#70757a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calendários</div>
            <button
              onClick={() => setShowCalendarForm(v => !v)}
              title="Novo calendário"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#1a73e8', display: 'flex', borderRadius: 4 }}
            >
              <Plus size={14} />
            </button>
          </div>

          {showCalendarForm && (
            <form onSubmit={handleCreateCalendar} style={{ marginBottom: 10 }}>
              <input
                autoFocus
                value={newCalendarName}
                onChange={e => setNewCalendarName(e.target.value)}
                placeholder="Nome do calendário"
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1.5px solid #1a73e8', fontSize: 12, fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box', outline: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: '#70757a' }}>Cor:</label>
                {['var(--accent)','#10b981','#f59e0b','#ef4444','var(--accent)','#8b5cf6','#ec4899','#14b8a6'].map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setNewCalendarColor(c)}
                    style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newCalendarColor === c ? '2px solid #000' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => { setShowCalendarForm(false); setNewCalendarName('') }} style={{ flex: 1, padding: '5px', borderRadius: 6, border: '1px solid #dadce0', background: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
              </div>
            </form>
          )}

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleCalendar('ALL')}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, background: activeCalendarIds.has('ALL') ? '#1a73e8' : 'transparent', border: '2px solid #1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {activeCalendarIds.has('ALL') && <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span style={{ fontSize: 12, color: '#3c4043' }}>Todos</span>
          </label>

          {calendars.map(cal => {
            const active = !activeCalendarIds.has('ALL') && activeCalendarIds.has(cal.id)
            return (
              <div key={cal.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f3f4')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleCalendar(cal.id)}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: active ? cal.color : 'transparent', border: `2px solid ${cal.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3L3 5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span style={{ fontSize: 12, color: '#3c4043', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cal.name}</span>
                </label>
                <button
                  onClick={() => handleDeleteCalendar(cal.id, cal.name)}
                  style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: '#9aa0a6', display: 'flex', opacity: 0, transition: 'opacity 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0, background: '#fff' }}>
          <button onClick={() => { goToThisWeek(); setCalMonth(today.getMonth()); setCalYear(today.getFullYear()) }}
            style={{ padding: '7px 18px', borderRadius: 20, border: '1px solid #dadce0', background: '#fff', color: '#3c4043', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Hoje
          </button>
          <button onClick={prevWeek} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: '50%', color: '#3c4043', display: 'flex' }}><ChevronLeft size={20} /></button>
          <button onClick={nextWeek} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, borderRadius: '50%', color: '#3c4043', display: 'flex' }}><ChevronRight size={20} /></button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400, color: '#3c4043', flex: 1 }}>
            {view === 'calendar'
              ? `${MONTHS_PT[calMonth]} ${calYear}`
              : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_PT[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`}
          </h2>
          {/* Status filter (list only) */}
          {view === 'list' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: filter === s ? (STATUS_COLORS[s] || 'var(--accent)') : '#f1f3f4',
                  color: filter === s ? '#fff' : '#3c4043',
                }}>{s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}</button>
              ))}
            </div>
          )}
          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid #dadce0', borderRadius: 4, overflow: 'hidden' }}>
            {(['list', 'week', 'calendar'] as const).map((v, idx) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: view === v ? '#e8f0fe' : '#fff',
                color: view === v ? '#1a73e8' : '#3c4043',
                borderRight: idx < 2 ? '1px solid #dadce0' : 'none',
              }}>{v === 'list' ? 'Lista' : v === 'week' ? 'Semana' : 'Mês'}</button>
            ))}
          </div>
        </div>

        {/* Day column headers (week view) */}
        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0 }}>
            <div style={{ borderRight: '1px solid #e0e0e0' }} />
            {weekDays.map((day, i) => {
              const isToday2 = day.toDateString() === today.toDateString()
              return (
                <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: i > 0 ? '1px solid #e0e0e0' : undefined }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: isToday2 ? '#1a73e8' : '#70757a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {WEEK_DAYS_PT[day.getDay()]}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', marginTop: 4,
                    background: isToday2 ? '#1a73e8' : 'transparent', color: isToday2 ? '#fff' : '#3c4043', fontSize: 18, fontWeight: isToday2 ? 700 : 400 }}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
        ) : visibleAppointments.length === 0 ? (
          <div style={{ borderRadius: 12, border: '1px solid var(--border)', padding: '48px 24px', textAlign: 'center', background: 'var(--surface)' }}>
            <Calendar size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Sem agendamentos</p>
            <Button size="sm" onClick={openCreate}>Criar primeiro agendamento</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleAppointments.map(a => {
              const sc = STATUS_COLORS[a.status] || 'var(--accent)'
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px', borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
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
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
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
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-primary)' }}
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

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Scrollable time grid */}
          <div ref={weekGridRef} style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative' }}>

              {/* Hour labels column */}
              <div>
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, di) => {
                const isToday = day.toDateString() === today.toDateString()
                const dayAppts = visibleAppointments.filter(a => new Date(a.startAt).toDateString() === day.toDateString())
                const isDraggingHere = dragCreate?.dayIndex === di
                return (
                  <div
                    key={di}
                    ref={el => { dayColRefs.current[di] = el }}
                    style={{
                      borderLeft: '1px solid var(--border)',
                      position: 'relative',
                      background: isToday ? 'rgba(46,107,230,0.02)' : 'transparent',
                      height: HOURS.length * HOUR_HEIGHT,
                      cursor: dragMove ? 'grabbing' : 'crosshair',
                      userSelect: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Hour grid lines */}
                    {HOURS.map((h, hi) => (
                      <div key={h} style={{
                        position: 'absolute', top: hi * HOUR_HEIGHT, left: 0, right: 0,
                        borderTop: '1px solid var(--border)',
                        height: HOUR_HEIGHT,
                      }} />
                    ))}

                    {/* Drag-to-create preview */}
                    {isDraggingHere && dragCreate && (() => {
                      const minStart = Math.min(dragCreate.startMin, dragCreate.endMin)
                      const minEnd = Math.max(dragCreate.startMin, dragCreate.endMin)
                      const previewTop = (minStart / 60) * HOUR_HEIGHT
                      const previewH = Math.max(15, minEnd - minStart) / 60 * HOUR_HEIGHT
                      const pad = (n: number) => String(n).padStart(2, '0')
                      const toLabel = (min: number) => {
                        const h = Math.floor(min / 60) + GRID_START_HOUR
                        return `${pad(h)}:${pad(min % 60)}`
                      }
                      return (
                        <div style={{
                          position: 'absolute', top: previewTop + 1, left: 2, right: 2,
                          height: previewH - 2, borderRadius: 6,
                          background: 'rgba(46,107,230,0.85)',
                          border: '2px solid var(--accent)',
                          padding: '3px 6px', zIndex: 10, pointerEvents: 'none',
                          boxShadow: '0 2px 8px rgba(46,107,230,0.35)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                            Novo agendamento
                          </div>
                          {previewH > 28 && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                              {toLabel(minStart)} – {toLabel(minEnd)}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Drag-move ghost preview */}
                    {dragMove && dragMove.curDayIndex === di && (() => {
                      const ghostTop = (dragMove.curStartMin / 60) * HOUR_HEIGHT
                      const ghostH = Math.max(15, dragMove.curEndMin - dragMove.curStartMin) / 60 * HOUR_HEIGHT
                      const pad = (n: number) => String(n).padStart(2, '0')
                      const toLabel = (min: number) => `${pad(Math.floor(min / 60) + GRID_START_HOUR)}:${pad(min % 60)}`
                      return (
                        <div style={{
                          position: 'absolute', top: ghostTop + 1, left: 2, right: 2,
                          height: ghostH - 2, borderRadius: 6,
                          background: 'rgba(46,107,230,0.55)',
                          border: '2px dashed var(--accent)',
                          padding: '3px 6px', zIndex: 20, pointerEvents: 'none',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                            {toLabel(dragMove.curStartMin)} – {toLabel(dragMove.curEndMin)}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Appointment blocks */}
                    {dayAppts.map(a => {
                      const { top, height } = getApptStyle(a)
                      const sc = STATUS_COLORS[a.status] || 'var(--accent)'
                      const isDragging = dragMove?.apptId === a.id
                      return (
                        <div
                          key={a.id}
                          data-appt-card
                          onClick={() => { if (didDragMoveRef.current) { didDragMoveRef.current = false; return } openEdit(a) }}
                          onDoubleClick={() => openEdit(a)}
                          title={`${a.title} — ${formatTime(a.startAt)} até ${formatTime(a.endAt)}`}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            e.stopPropagation()
                            const col = dayColRefs.current[di]
                            if (!col) return
                            const colRect = col.getBoundingClientRect()
                            const startMin = (new Date(a.startAt).getHours() - GRID_START_HOUR) * 60 + new Date(a.startAt).getMinutes()
                            const endMin = (new Date(a.endAt).getHours() - GRID_START_HOUR) * 60 + new Date(a.endAt).getMinutes()
                            const clickY = e.clientY - colRect.top - top
                            const offsetMin = Math.max(0, Math.floor((clickY / HOUR_HEIGHT) * 60))
                            setDragMove({ apptId: a.id, origDayIndex: di, origStartMin: startMin, origEndMin: endMin, curDayIndex: di, curStartMin: startMin, curEndMin: endMin, offsetMin })
                          }}
                          style={{
                            position: 'absolute',
                            top: top + 1,
                            left: 2,
                            right: 2,
                            height: height,
                            borderRadius: 6,
                            background: sc,
                            padding: '3px 6px',
                            cursor: isDragging ? 'grabbing' : 'pointer',
                            overflow: 'hidden',
                            zIndex: isDragging ? 0 : 1,
                            opacity: isDragging ? 0.35 : 1,
                            transition: isDragging ? 'none' : 'filter 120ms, opacity 120ms',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                          }}
                          onMouseEnter={e => { if (!isDragging) e.currentTarget.style.filter = 'brightness(0.88)' }}
                          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
                            {a.description?.includes('gcal:') && (
                              <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" width={10} height={10} style={{ flexShrink: 0, borderRadius: 2 }} title="Google Calendar" />
                            )}
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.title}
                            </div>
                          </div>
                          {height > 28 && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                              {formatTime(a.startAt)} – {formatTime(a.endAt)}
                              {a.location ? `, ${a.location}` : ''}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ── (ref: calendar + calendar ddwn patterns) */}
      {view === 'calendar' && (
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Calendar header with month/year dropdowns (ref: calendar ddwn) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={prevMonth}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Month + Year dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CustomSelect
                value={String(calMonth)}
                onChange={v => setCalMonth(Number(v))}
                options={MONTHS_PT.map((m, i) => ({ value: String(i), label: m }))}
                size="sm"
              />
              <CustomSelect
                value={String(calYear)}
                onChange={v => setCalYear(Number(v))}
                options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
                size="sm"
              />
            </div>

            <button
              onClick={nextMonth}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers (ref: calendar — DAYS_OF_WEEK pattern) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
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
                    borderBottom: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    background: !day ? 'var(--surface-3)' : isToday ? 'rgba(46,107,230,0.03)' : 'transparent',
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
                          background: isToday ? 'var(--accent)' : 'transparent',
                          color: isToday ? '#fff' : 'var(--text-secondary)',
                        }}>
                          {day.getDate()}
                        </span>
                      </div>
                      {/* Events */}
                      {dayAppts.slice(0, 3).map(a => (
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
                          {formatTime(a.startAt)} {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 600 }}>
                          +{dayAppts.length - 3} mais
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

      </div>{/* end Content area */}
      </div>{/* end Main area */}
    </div>
    )}{/* end mainTab === 'calendar' */}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar agendamento' : 'Novo agendamento'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editing?.description?.includes('gcal:') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f1f3f4', borderRadius: 8, fontSize: 12, color: '#5f6368' }}>
              <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" width={14} height={14} />
              <span>Evento importado do Google Calendar</span>
            </div>
          )}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={inputStyle}
              placeholder="ex: Visita ao apartamento T3"
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(46,107,230,0.12)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            <CustomSelect
              label="Tipo"
              value={form.type}
              onChange={v => setForm(f => ({ ...f, type: v }))}
              options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <CustomSelect
              label="Estado"
              value={form.status}
              onChange={v => setForm(f => ({ ...f, status: v }))}
              options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <div>
              <label style={labelStyle}>Início *</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={e => {
                  const newStart = e.target.value
                  setForm(f => {
                    // Keep end time but force same date as new start
                    let newEnd = f.endAt
                    if (newStart && f.endAt) {
                      const endTime = f.endAt.slice(11) // HH:MM
                      newEnd = newStart.slice(0, 10) + 'T' + endTime
                      // If end would be before or equal to start, add 1 hour
                      if (newEnd <= newStart) {
                        const d = new Date(newStart)
                        d.setHours(d.getHours() + 1)
                        const pad = (n: number) => String(n).padStart(2, '0')
                        newEnd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                      }
                    }
                    return { ...f, startAt: newStart, endAt: newEnd }
                  })
                }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fim *</label>
              <input
                type="time"
                value={form.endAt ? form.endAt.slice(11) : ''}
                onChange={e => {
                  const time = e.target.value
                  if (!form.startAt || !time) return
                  const sameDay = form.startAt.slice(0, 10) + 'T' + time
                  setForm(f => ({ ...f, endAt: sameDay }))
                }}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Localização</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="Morada ou link de reunião" />
            {form.location && /^https?:\/\//i.test(form.location) && (
              <a href={form.location} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                {/meet\.google\.com/i.test(form.location) ? 'Entrar no Google Meet' : /teams\.microsoft/i.test(form.location) ? 'Entrar no Teams' : /zoom\.us/i.test(form.location) ? 'Entrar no Zoom' : 'Abrir link'}
              </a>
            )}
          </div>
          <CustomSelect
            label="Contacto"
            value={form.contactId}
            onChange={v => setForm(f => ({ ...f, contactId: v }))}
            placeholder="Nenhum"
            searchable
            options={contacts.map(c => ({ value: c.id, label: c.name }))}
          />
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
