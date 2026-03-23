import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Bell, LogOut, User, Menu, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/contacts':   'Contactos',
  '/pipeline':   'Oportunidades Potenciais',
  '/properties': 'Propriedades',
  '/tasks':      'Tarefas',
  '/calendar':   'Calendário',
  '/reports':    'Relatórios',
  '/users':          'Utilizadores',
  '/conversations':  'Conversas',
  '/settings':       'Configurações',
  '/profile':        'O meu perfil',
  '/automations':    'Automações',
  '/snapshots':      'Snapshots',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += '/' + seg
    const label = pageTitles[path] || (seg.length > 20 ? 'Detalhe' : seg)
    crumbs.push({ label, path })
  }
  return crumbs
}

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const crumbs = getBreadcrumbs(location.pathname)
  const pageTitle = crumbs[crumbs.length - 1]?.label || 'Dashboard'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="flex items-center gap-4 px-6 flex-shrink-0"
      style={{
        height: 64,
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumbs / Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-slate-900 leading-tight">{pageTitle}</h1>
        {crumbs.length > 1 && (
          <nav className="flex items-center gap-1 mt-0.5">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                {i < crumbs.length - 1 ? (
                  <Link
                    to={crumb.path}
                    className="text-xs text-slate-400 hover:text-blue-600"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Notification bell (decorative for now) */}
        <button
          className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Notificações"
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"
            style={{ boxShadow: '0 0 0 2px #fff' }}
          />
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div
              className="flex items-center justify-center rounded-full text-white text-xs font-bold"
              style={{
                width: 34,
                height: 34,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name || '')}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 rounded-2xl bg-white overflow-hidden"
              style={{
                width: 220,
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                border: '1px solid #e2e8f0',
                zIndex: 50,
              }}
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                <span
                  className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: '#dbeafe', color: '#1d4ed8' }}
                >
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User size={15} className="text-slate-400" />
                  O meu perfil
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={15} className="text-slate-400" />
                    Configurações
                  </Link>
                )}
                <div className="mx-3 my-1 border-t border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
