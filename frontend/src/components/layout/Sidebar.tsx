import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2, CheckSquare,
  Calendar, BarChart3, UserCog, Building, ChevronLeft,
  ChevronRight, LogOut, MessageCircle, Settings, Zap, Package
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'

const mainNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts',      icon: Users,           label: 'Contactos' },
  { to: '/pipeline',      icon: Kanban,          label: 'Oportunidades' },
  { to: '/properties',    icon: Building2,       label: 'Propriedades' },
  { to: '/tasks',         icon: CheckSquare,     label: 'Tarefas' },
  { to: '/calendar',      icon: Calendar,        label: 'Calendário' },
  { to: '/reports',       icon: BarChart3,       label: 'Relatórios' },
  { to: '/conversations', icon: MessageCircle,   label: 'Conversas' },
  { to: '/automations',   icon: Zap,             label: 'Automações' },
  { to: '/snapshots',     icon: Package,         label: 'Snapshots' },
]

const adminNav = [
  { to: '/users',    icon: UserCog,  label: 'Utilizadores' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
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
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{
          height: 64,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.45)',
            }}
          >
            <Building className="text-white" size={17} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p className="text-white font-bold text-sm leading-tight tracking-tight">CRM Imobiliário</p>
              <p className="text-xs" style={{ color: '#4a5578', letterSpacing: '0.02em' }}>Plataforma Premium</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute flex items-center justify-center rounded-full"
        style={{
          top: 44,
          right: -11,
          width: 22,
          height: 22,
          background: '#1e2540',
          border: '1.5px solid rgba(255,255,255,0.08)',
          color: '#6b7a99',
          zIndex: 10,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4" style={{ paddingLeft: 10, paddingRight: 10 }}>

        {!collapsed && (
          <p style={{
            fontSize: 10,
            color: '#2d3654',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '0 8px 8px',
          }}>
            Principal
          </p>
        )}

        <ul className="space-y-0.5">
          {mainNav.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? label : undefined}
                style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : {}}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {user?.role === 'ADMIN' && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 4px' }} />
            {!collapsed && (
              <p style={{
                fontSize: 10,
                color: '#2d3654',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '0 8px 8px',
              }}>
                Administração
              </p>
            )}
            <ul className="space-y-0.5">
              {adminNav.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    title={collapsed ? label : undefined}
                    style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : {}}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 10px' }}>
        {!collapsed ? (
          <div
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                fontSize: 11,
              }}
            >
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: '#3d4f72', marginTop: 1 }}>{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="flex-shrink-0 rounded-lg p-1.5"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3d4f72' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#3d4f72'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-white font-bold"
              style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontSize: 11,
              }}
              title={user?.name}
            >
              {getInitials(user?.name || '')}
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="rounded-lg p-1.5"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3d4f72' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
