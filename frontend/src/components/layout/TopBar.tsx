import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Menu, Settings, ChevronDown, CheckSquare, Clock, AlertCircle, X } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { getTasks } from '../../api/tasks.api'
import type { Task } from '../../types'
import { format, isPast, parseISO, isToday, isTomorrow } from 'date-fns'

const pageTitles: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/contacts':      'Contactos',
  '/pipeline':      'Oportunidades',
  '/properties':    'Propriedades',
  '/tasks':         'Tarefas',
  '/calendar':      'Calendário',
  '/reports':       'Relatórios',
  '/users':         'Utilizadores',
  '/conversations': 'Conversas',
  '/settings':      'Configurações',
  '/profile':       'O meu perfil',
  '/automations':   'Automações',
  '/snapshots':     'Snapshots',
}

const pageSubtitles: Record<string, string> = {
  '/dashboard':     'Visão geral do negócio',
  '/contacts':      'Gestão de leads e clientes',
  '/pipeline':      'Oportunidades em curso',
  '/properties':    'Carteira de imóveis',
  '/tasks':         'Atividades pendentes',
  '/calendar':      'Agenda e visitas',
  '/reports':       'Análise e performance',
  '/conversations': 'Inbox unificado',
  '/automations':   'Workflows automáticos',
  '/snapshots':     'Templates de negócio',
}

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  const segments = location.pathname.split('/').filter(Boolean)
  const baseRoute = '/' + (segments[0] || '')
  const pageTitle = pageTitles[baseRoute] || 'Dashboard'
  const pageSubtitle = pageSubtitles[baseRoute] || ''

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [notifLoading, setNotifLoading] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const openNotifications = async () => {
    setNotifOpen(!notifOpen)
    if (!notifOpen && tasks.length === 0) {
      setNotifLoading(true)
      try {
        const res = await getTasks({ status: 'PENDING', limit: 10, sortBy: 'dueDate', sortOrder: 'asc' })
        const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? []
        setTasks(raw)
      } catch {}
      setNotifLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const urgentTasks = tasks.filter(t => t.dueDate && isPast(parseISO(t.dueDate)))
  const todayTasks = tasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))
  const notifCount = urgentTasks.length + todayTasks.length

  const getTaskLabel = (t: Task) => {
    if (!t.dueDate) return null
    const d = parseISO(t.dueDate)
    if (isPast(d)) return { label: 'Vencida', color: '#ef4444', bg: '#fef2f2' }
    if (isToday(d)) return { label: 'Hoje', color: '#f59e0b', bg: '#fffbeb' }
    if (isTomorrow(d)) return { label: 'Amanhã', color: '#6366f1', bg: '#eef2ff' }
    return { label: format(d, 'dd/MM'), color: '#64748b', bg: '#f1f5f9' }
  }

  return (
    <header
      className="flex items-center gap-4 px-6 flex-shrink-0"
      style={{
        height: 64,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #eaecf3',
        boxShadow: '0 1px 0 #eaecf3',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100"
        style={{ border: 'none', cursor: 'pointer', background: 'none' }}
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-slate-900 leading-tight tracking-tight">{pageTitle}</h1>
        {pageSubtitle && (
          <p className="text-xs text-slate-400 mt-0.5 leading-tight">{pageSubtitle}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifications}
            className="relative p-2 rounded-xl hover:bg-slate-100"
            title="Notificações"
            style={{ border: 'none', cursor: 'pointer', background: 'none', color: '#64748b' }}
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 16, height: 16, fontSize: 9, background: '#ef4444', boxShadow: '0 0 0 2px #fff' }}
              >
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: 'absolute', right: 0, top: 42, width: 340, zIndex: 50,
                background: '#fff', borderRadius: 16, border: '1px solid #eaecf3',
                boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f1f3f9' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Notificações</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{notifCount > 0 ? `${notifCount} tarefa(s) que precisam de atenção` : 'Tudo em dia'}</p>
                </div>
                <button onClick={() => setNotifOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={15} /></button>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifLoading ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    A carregar...
                  </div>
                ) : tasks.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <CheckSquare size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Sem tarefas pendentes</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Estás em dia com tudo!</p>
                  </div>
                ) : (
                  tasks.map(task => {
                    const badge = getTaskLabel(task)
                    const isOverdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false
                    return (
                      <div
                        key={task.id}
                        onClick={() => { navigate('/tasks'); setNotifOpen(false) }}
                        style={{
                          padding: '12px 16px', borderBottom: '1px solid #f8f9fc',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                          background: isOverdue ? '#fff9f9' : '#fff',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfd')}
                        onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? '#fff9f9' : '#fff')}
                      >
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          {isOverdue
                            ? <AlertCircle size={16} style={{ color: '#ef4444' }} />
                            : <Clock size={16} style={{ color: '#f59e0b' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </p>
                          {task.contact && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{task.contact.name}</p>}
                        </div>
                        {badge && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f3f9' }}>
                <button
                  onClick={() => { navigate('/tasks'); setNotifOpen(false) }}
                  style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1px solid #eaecf3', background: '#fafbfd', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6366f1' }}
                >
                  Ver todas as tarefas →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#eaecf3', margin: '0 4px' }} />

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100"
            style={{ border: 'none', cursor: 'pointer', background: 'none' }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 11, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
            >
              {getInitials(user?.name || '')}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" style={{ transition: 'transform 150ms', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 rounded-2xl bg-white overflow-hidden"
              style={{ width: 230, boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)', border: '1px solid #eaecf3', zIndex: 50 }}
            >
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #f1f3f9' }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0" style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 12 }}>
                    {getInitials(user?.name || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>
                <span className="inline-block mt-2.5 px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </span>
              </div>
              <div className="py-1.5">
                <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" style={{ textDecoration: 'none' }}>
                  <User size={15} className="text-slate-400" />
                  O meu perfil
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" style={{ textDecoration: 'none' }}>
                    <Settings size={15} className="text-slate-400" />
                    Configurações
                  </Link>
                )}
                <div style={{ height: 1, background: '#f1f3f9', margin: '4px 12px' }} />
                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                  <LogOut size={15} />
                  Terminar sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
