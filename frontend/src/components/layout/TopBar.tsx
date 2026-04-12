import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, Menu, Settings, ChevronDown, CheckSquare, Clock, AlertCircle, X, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { getTasks } from '../../api/tasks.api'
import { useNotifications } from '../../hooks/useNotifications'
import type { Task } from '../../types'
import { format, isPast, parseISO, isToday, isTomorrow } from 'date-fns'

const pageTitles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/contacts':       'Contactos',
  '/pipeline':       'Oportunidades',
  '/properties':     'Propriedades',
  '/tasks':          'Tarefas',
  '/calendar':       'Calendário',
  '/reports':        'Relatórios',
  '/users':          'Utilizadores',
  '/conversations':  'Conversas',
  '/settings':       'Configurações',
  '/profile':        'O meu perfil',
  '/automations':    'Automações',
  '/snapshots':      'Snapshots',
  '/appointments':   'Agendamentos',
  '/campaigns':      'Campanhas Email',
  '/phone-numbers':  'Números de Telefone',
  '/forms':          'Formulários',
}

const pageSubtitles: Record<string, string> = {
  '/dashboard':      'Visão geral do negócio',
  '/contacts':       'Gestão de leads e clientes',
  '/pipeline':       'Oportunidades em curso',
  '/properties':     'Carteira de imóveis',
  '/tasks':          'Atividades pendentes',
  '/calendar':       'Agenda e visitas',
  '/reports':        'Análise e performance',
  '/conversations':  'Inbox unificado',
  '/automations':    'Workflows automáticos',
  '/snapshots':      'Templates de negócio',
  '/appointments':   'Visitas, chamadas e reuniões',
  '/campaigns':      'Envio de emails em massa',
  '/phone-numbers':  'Gestão de números Twilio',
  '/forms':          'Captura de leads',
}

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { toggleSidebar, darkMode, toggleDarkMode } = useUIStore()
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
  const { notifications, unreadCount: sseUnreadCount, markRead, markAllRead } = useNotifications()

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
  const notifCount = urgentTasks.length + todayTasks.length + sseUnreadCount

  const getTaskLabel = (t: Task) => {
    if (!t.dueDate) return null
    const d = parseISO(t.dueDate)
    if (isPast(d)) return { label: 'Vencida', color: '#ef4444', bg: '#fef2f2' }
    if (isToday(d)) return { label: 'Hoje', color: '#f59e0b', bg: '#fffbeb' }
    if (isTomorrow(d)) return { label: 'Amanhã', color: '#0f2553', bg: 'rgba(15,37,83,0.07)' }
    return { label: format(d, 'dd/MM'), color: '#64748b', bg: '#f1f5f9' }
  }

  return (
    <header
      className="flex items-center gap-4 px-6 flex-shrink-0"
      style={{
        height: 64,
        background: 'var(--bg-header)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 1px 0 var(--border-color)',
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
        <h1 className="text-base font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>{pageTitle}</h1>
        {pageSubtitle && (
          <p className="text-xs text-slate-400 mt-0.5 leading-tight">{pageSubtitle}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="icon-btn p-2"
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifications}
            className="icon-btn p-2 relative"
            title="Notificações"
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
                background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notificações</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{notifCount > 0 ? `${notifCount} tarefa(s) que precisam de atenção` : 'Tudo em dia'}</p>
                </div>
                <button onClick={() => setNotifOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={15} /></button>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifLoading ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    A carregar...
                  </div>
                ) : tasks.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <CheckSquare size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Sem tarefas pendentes</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Estás em dia com tudo!</p>
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
                          padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                          background: isOverdue ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)')}
                      >
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          {isOverdue
                            ? <AlertCircle size={16} style={{ color: '#ef4444' }} />
                            : <Clock size={16} style={{ color: '#f59e0b' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </p>
                          {task.contact && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{task.contact.name}</p>}
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

              {notifications.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', maxHeight: 160, overflowY: 'auto' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tempo real</p>
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} onClick={() => { markRead(n.id); if (n.link) navigate(n.link); setNotifOpen(false) }}
                      style={{ padding: '8px 16px', cursor: 'pointer', background: n.read ? 'var(--bg-card)' : 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? 'transparent' : '#b8963e', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</p>
                        {n.body && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{n.body}</p>}
                      </div>
                    </div>
                  ))}
                  {sseUnreadCount > 0 && (
                    <button onClick={markAllRead} style={{ width: '100%', padding: '6px', fontSize: 11, color: '#b8963e', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
              )}

              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => { navigate('/tasks'); setNotifOpen(false) }}
                  style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-page)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0f2553' }}
                >
                  Ver todas as tarefas →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'var(--border-color)', margin: '0 4px' }} />

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl"
            style={{ border: 'none', cursor: 'pointer', background: 'none' }}
          >
            {user?.avatarUrl?.startsWith('data:') || user?.avatarUrl?.startsWith('http') ? (
              <img src={user.avatarUrl} alt="avatar" className="rounded-full object-cover flex-shrink-0" style={{ width: 32, height: 32, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }} />
            ) : (
              <div className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                style={{ width: 32, height: 32, background: user?.avatarUrl || '#0f2553', fontSize: 11, boxShadow: '0 2px 8px rgba(15,37,83,0.25)' }}>
                {getInitials(user?.name || '')}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <ChevronDown size={14} className="hidden sm:block" style={{ transition: 'transform 150ms', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 230, zIndex: 50,
                background: 'var(--bg-card)', borderRadius: 16,
                boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)', overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0f2553', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {getInitials(user?.name || '')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{user?.email}</p>
                  </div>
                </div>
                <span style={{ display: 'inline-block', marginTop: 10, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(184,150,62,0.12)', color: '#b8963e' }}>
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </span>
              </div>
              <div style={{ padding: '6px 0' }}>
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <User size={14} style={{ color: 'var(--text-muted)' }} />
                  O meu perfil
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                    Configurações
                  </Link>
                )}
                <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 12px' }} />
                <button
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', fontSize: 13, color: '#f87171', border: 'none', background: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <LogOut size={14} />
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
