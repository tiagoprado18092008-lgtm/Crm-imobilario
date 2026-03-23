import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2, CheckSquare,
  Calendar, BarChart3, UserCog, Building, ChevronLeft,
  ChevronRight, LogOut, MessageCircle, Settings
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'

const mainNav = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts',    icon: Users,           label: 'Contactos' },
  { to: '/pipeline',    icon: Kanban,          label: 'Oportunidades' },
  { to: '/properties',  icon: Building2,       label: 'Propriedades' },
  { to: '/tasks',       icon: CheckSquare,     label: 'Tarefas' },
  { to: '/calendar',    icon: Calendar,        label: 'Calendário' },
  { to: '/reports',       icon: BarChart3,       label: 'Relatórios' },
  { to: '/conversations', icon: MessageCircle,   label: 'Conversas' },
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
        width: collapsed ? 68 : 240,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 border-b"
        style={{
          height: 64,
          borderColor: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
            }}
          >
            <Building className="text-white" size={18} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p className="text-white font-bold text-sm leading-tight">CRM</p>
              <p className="text-xs" style={{ color: '#64748b' }}>Imobiliário</p>
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
          right: -12,
          width: 24,
          height: 24,
          background: '#1e40af',
          border: '2px solid #0f172a',
          color: '#fff',
          zIndex: 10,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4" style={{ paddingLeft: 10, paddingRight: 10 }}>

        {!collapsed && (
          <p className="section-label" style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px 8px' }}>
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
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {user?.role === 'ADMIN' && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 4px' }} />
            {!collapsed && (
              <p style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px 8px' }}>
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
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 10px' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              }}
            >
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: '#64748b' }}>{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="flex-shrink-0 rounded-lg p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-white text-xs font-bold"
              style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              }}
              title={user?.name}
            >
              {getInitials(user?.name || '')}
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
