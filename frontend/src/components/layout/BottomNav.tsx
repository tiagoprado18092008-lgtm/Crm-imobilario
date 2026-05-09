import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Kanban, CheckSquare, CalendarClock } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts',  icon: Users,           label: 'Contactos' },
  { to: '/pipeline',  icon: Kanban,          label: 'Pipeline' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tarefas' },
  { to: '/calendar',  icon: CalendarClock,   label: 'Calendário' },
]

export const BottomNav: React.FC = () => (
  <nav
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      height: `calc(56px + env(safe-area-inset-bottom))`,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--sidebar-bg)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'stretch',
    }}
  >
    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        style={{ textDecoration: 'none', flex: 1 }}
      >
        {({ isActive }) => (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? 'var(--accent)' : 'rgba(200,211,232,0.5)',
              transition: 'color 150ms',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, fontFamily: 'var(--font-body)', lineHeight: 1 }}>
              {label}
            </span>
          </div>
        )}
      </NavLink>
    ))}
  </nav>
)
