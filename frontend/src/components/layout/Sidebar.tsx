import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2, CheckSquare,
  BarChart3, UserCog, ChevronLeft, ChevronRight, LogOut,
  MessageCircle, Settings, Zap, Package, Phone, Mail,
  FileText, CalendarClock, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { getTasks } from '../../api/tasks.api'
import { getConversations } from '../../api/conversations.api'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { crmName } = useUIStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [taskBadge, setTaskBadge] = useState(0)
  const [convBadge, setConvBadge] = useState(0)

  useEffect(() => {
    // Load badge counts
    const load = async () => {
      try {
        const [tasksRes, convRes] = await Promise.allSettled([
          getTasks({ status: 'PENDING', limit: 50 }),
          getConversations({ status: 'OPEN', limit: 50 }),
        ])
        if (tasksRes.status === 'fulfilled') {
          const raw = tasksRes.value.data
          const tasks = Array.isArray(raw) ? raw : raw?.data ?? []
          const overdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) <= new Date()).length
          setTaskBadge(overdue)
        }
        if (convRes.status === 'fulfilled') {
          const raw = convRes.value.data
          const convs = Array.isArray(raw) ? raw : raw?.data ?? []
          setConvBadge(convs.filter((c: any) => !c.assignedToId).length)
        }
      } catch {}
    }
    load()
    const interval = setInterval(load, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navGroups: NavGroup[] = [
    {
      label: 'CRM',
      items: [
        { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/conversations', icon: MessageCircle,   label: 'Conversas',     badge: convBadge },
        { to: '/contacts',      icon: Users,           label: 'Contactos' },
        { to: '/pipeline',      icon: Kanban,          label: 'Oportunidades' },
        { to: '/appointments',  icon: CalendarClock,   label: 'Agendamentos' },
        { to: '/properties',    icon: Building2,       label: 'Propriedades' },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { to: '/tasks',   icon: CheckSquare, label: 'Tarefas',   badge: taskBadge },
        { to: '/reports', icon: BarChart3,   label: 'Relatórios' },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { to: '/campaigns', icon: Mail,     label: 'Campanhas Email' },
        { to: '/forms',     icon: FileText, label: 'Formulários' },
      ],
    },
    {
      label: 'Ferramentas',
      items: [
        { to: '/phone-numbers', icon: Phone,        label: 'Números Tel.' },
        { to: '/automations',   icon: Zap,          label: 'Automações' },
        { to: '/snapshots',     icon: Package,      label: 'Snapshots' },
      ],
    },
  ]

  const adminGroup: NavGroup = {
    label: 'Admin',
    items: [
      { to: '/users',    icon: UserCog,  label: 'Utilizadores' },
      { to: '/settings', icon: Settings, label: 'Configurações' },
    ],
  }

  const allGroups = user?.role === 'ADMIN' ? [...navGroups, adminGroup] : navGroups

  const renderBadge = (count: number) => {
    if (!count || collapsed) return null
    return (
      <span style={{
        marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
        background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0,
      }}>
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return (
    <aside
      className="flex flex-col h-full relative"
      style={{
        width: collapsed ? 68 : 236,
        background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1530 100%)',
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 flex-shrink-0" style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1a2e4a 0%, #c9a84c 100%)', boxShadow: '0 4px 14px rgba(201,168,76,0.35)' }}>
            <TrendingUp className="text-white" size={17} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p className="text-white font-bold text-sm leading-tight tracking-tight">{crmName}</p>
              <p className="text-xs" style={{ color: '#c9a84c', letterSpacing: '0.06em', fontWeight: 600, fontSize: 9, textTransform: 'uppercase' }}>Plataforma Premium</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="absolute flex items-center justify-center rounded-full"
        style={{ top: 44, right: -11, width: 22, height: 22, background: '#1e2540', border: '1.5px solid rgba(255,255,255,0.08)', color: '#6b7a99', zIndex: 10, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        title={collapsed ? 'Expandir' : 'Recolher'}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ paddingLeft: 10, paddingRight: 10 }}>
        {allGroups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {/* Group label */}
            {!collapsed && (
              <p style={{
                fontSize: 10, color: '#2d3654', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: gi === 0 ? '4px 8px 6px' : '12px 8px 6px',
              }}>
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 4px' }} />
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    title={collapsed ? label : undefined}
                    style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0, position: 'relative' } : {}}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Icon size={17} />
                      {/* Collapsed badge dot */}
                      {collapsed && badge ? (
                        <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0a0f1e' }} />
                      ) : null}
                    </div>
                    {!collapsed && (
                      <>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>
                        {renderBadge(badge || 0)}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 10px' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)', fontSize: 11 }}>
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: '#3d4f72', marginTop: 1 }}>{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="flex-shrink-0 rounded-lg p-1.5"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3d4f72' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3d4f72'; (e.currentTarget as HTMLElement).style.background = 'none' }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center rounded-full text-white font-bold"
              style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 11 }}
              title={user?.name}>
              {getInitials(user?.name || '')}
            </div>
            <button onClick={handleLogout} title="Sair" className="rounded-lg p-1.5"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3d4f72' }}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
