import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Bell, LogOut, User, Menu, Settings, ChevronDown,
  CheckSquare, Clock, AlertCircle, X, Moon, Sun,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { getTasks } from '../../api/tasks.api'
import { useNotifications } from '../../hooks/useNotifications'
import type { Task } from '../../types'
import { format, isPast, parseISO, isToday, isTomorrow } from 'date-fns'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':     { title: 'Dashboard',               subtitle: 'Visão geral do negócio' },
  '/contacts':      { title: 'Contactos',               subtitle: 'Gestão de leads e clientes' },
  '/pipeline':      { title: 'Oportunidades',           subtitle: 'Oportunidades em curso' },
  '/properties':    { title: 'Propriedades',            subtitle: 'Carteira de imóveis' },
  '/tasks':         { title: 'Tarefas',                 subtitle: 'Atividades pendentes' },
  '/calendar':      { title: 'Calendário',              subtitle: 'Agenda e visitas' },
  '/reports':       { title: 'Relatórios',              subtitle: 'Análise e performance' },
  '/users':         { title: 'Utilizadores',            subtitle: 'Gestão de membros' },
  '/conversations': { title: 'Conversas',               subtitle: 'Inbox unificado' },
  '/settings':      { title: 'Configurações',           subtitle: 'Integrações e preferências' },
  '/profile':       { title: 'O meu perfil',            subtitle: 'Dados e preferências' },
  '/automations':   { title: 'Automações',              subtitle: 'Workflows automáticos' },
  '/appointments':  { title: 'Agendamentos',            subtitle: 'Visitas, chamadas e reuniões' },
  '/campaigns':     { title: 'Campanhas Email',         subtitle: 'Envio de emails em massa' },
  '/phone-numbers': { title: 'Números de Telefone',     subtitle: 'Gestão de números Twilio' },
  '/forms':         { title: 'Formulários',             subtitle: 'Captura de leads' },
  '/agency':        { title: 'Agência',                 subtitle: 'Gestão da agência' },
  '/calls':         { title: 'Chamadas',                subtitle: 'Registo de chamadas' },
}

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { toggleSidebar, darkMode, toggleDarkMode } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  const segments = location.pathname.split('/').filter(Boolean)
  const baseRoute = '/' + (segments[0] || '')
  const page = pageTitles[baseRoute] ?? { title: 'Dashboard', subtitle: '' }

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
    setNotifOpen(o => !o)
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

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const urgentTasks = tasks.filter(t => t.dueDate && isPast(parseISO(t.dueDate)))
  const todayTasks  = tasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)))
  const notifCount  = urgentTasks.length + todayTasks.length + sseUnreadCount

  const getTaskLabel = (t: Task) => {
    if (!t.dueDate) return null
    const d = parseISO(t.dueDate)
    if (isPast(d))     return { label: 'Vencida', color: 'var(--danger)',  bg: 'rgba(220,38,38,0.08)' }
    if (isToday(d))    return { label: 'Hoje',    color: 'var(--warning)', bg: 'rgba(217,119,6,0.08)' }
    if (isTomorrow(d)) return { label: 'Amanhã',  color: 'var(--accent)',  bg: 'var(--accent-soft)' }
    return { label: format(d, 'dd/MM'), color: 'var(--text-muted)', bg: 'var(--surface-3)' }
  }

  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        zIndex: 20,
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden"
        style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: 'none', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}>
          {page.title}
        </h1>
        {page.subtitle && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.2, marginTop: 1 }}>
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

        {/* Dark mode toggle */}
        <TopBarIconBtn
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
          onClick={toggleDarkMode}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </TopBarIconBtn>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <TopBarIconBtn title="Notificações" onClick={openNotifications}>
            <Bell size={16} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--danger)',
                border: '1.5px solid var(--surface)',
              }} />
            )}
          </TopBarIconBtn>

          {notifOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 44, width: 340, zIndex: 50,
              background: 'var(--surface)',
              borderRadius: 14, border: '1px solid var(--border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Notificações</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                    {notifCount > 0 ? `${notifCount} tarefa(s) a necessitar atenção` : 'Tudo em dia'}
                  </p>
                </div>
                <button onClick={() => setNotifOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifLoading ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
                ) : tasks.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <CheckSquare size={32} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>Sem tarefas pendentes</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>Estás em dia com tudo!</p>
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
                          padding: '12px 16px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                          background: isOverdue ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? 'rgba(220,38,38,0.04)' : 'var(--surface)')}
                      >
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          {isOverdue
                            ? <AlertCircle size={15} style={{ color: 'var(--danger)' }} />
                            : <Clock size={15} style={{ color: 'var(--warning)' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </p>
                          {task.contact && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{task.contact.name}</p>}
                        </div>
                        {badge && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Tempo real</p>
                  {notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      onClick={() => { markRead(n.id); if (n.link) navigate(n.link); setNotifOpen(false) }}
                      style={{ padding: '8px 16px', cursor: 'pointer', background: n.read ? 'var(--surface)' : 'var(--accent-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'var(--surface)' : 'var(--accent-soft)')}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? 'transparent' : 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{n.title}</p>
                        {n.body && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{n.body}</p>}
                      </div>
                    </div>
                  ))}
                  {sseUnreadCount > 0 && (
                    <button onClick={markAllRead} style={{ width: '100%', padding: '8px', fontSize: 11, color: 'var(--accent)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
              )}

              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => { navigate('/tasks'); setNotifOpen(false) }}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    color: 'var(--accent)', fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                >
                  Ver todas as tarefas →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 6px' }} />

        {/* User dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px 5px 6px',
              borderRadius: 8, border: 'none',
              background: dropdownOpen ? 'var(--surface-3)' : 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'var(--surface-3)' }}
            onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent' }}
          >
            {user?.avatarUrl?.startsWith('data:') || user?.avatarUrl?.startsWith('http') ? (
              <img src={user.avatarUrl} alt="avatar" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 11,
              }}>
                {getInitials(user?.name || '')}
              </div>
            )}
            <div className="hidden sm:block" style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.2 }}>{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <ChevronDown size={13} className="hidden sm:block" style={{ color: 'var(--text-muted)', transition: 'transform 150ms', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 230, zIndex: 50,
              background: 'var(--surface)',
              borderRadius: 14, border: '1px solid var(--border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>
              {/* User header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {getInitials(user?.name || '')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', marginTop: 10,
                  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                }}>
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </span>
              </div>

              <div style={{ padding: '4px 0' }}>
                <TopBarDropItem to="/profile"  icon={User}     label="O meu perfil"  onClick={() => setDropdownOpen(false)} />
                <TopBarDropItem to="/settings" icon={Settings} label="Configurações" onClick={() => setDropdownOpen(false)} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 12px' }} />
                <button
                  onClick={() => { setDropdownOpen(false); handleLogout() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 16px', fontSize: 13,
                    color: 'var(--danger)', border: 'none', background: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
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

/* ── Icon button helper ─────────────────────────────────────── */
const TopBarIconBtn: React.FC<{
  title: string
  onClick: () => void
  children: React.ReactNode
}> = ({ title, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 36, height: 36, borderRadius: 8,
      border: 'none', background: 'none',
      color: 'var(--text-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', position: 'relative',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
  >
    {children}
  </button>
)

/* ── Dropdown item helper ───────────────────────────────────── */
const TopBarDropItem: React.FC<{
  to: string
  icon: React.ElementType
  label: string
  onClick: () => void
}> = ({ to, icon: Icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
  >
    <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    {label}
  </Link>
)
