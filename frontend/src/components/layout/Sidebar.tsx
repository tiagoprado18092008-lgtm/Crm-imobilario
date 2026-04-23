import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2,
  BarChart3, UserCog, LogOut, Settings,
  CalendarClock, ChevronRight,
  UserCircle, ChevronsUpDown, UserPlus, Briefcase,
  MessageSquare, Activity, Layers, Phone, PhoneCall,
} from 'lucide-react'
import { CasaFlowLogo } from '../../assets/casaflow-logo'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { usePermissions } from '../../hooks/usePermissions'
import { getUnreadCount } from '../../api/conversations.api'
import { useUIStore } from '../../store/ui.store'

interface NavItem { to: string; icon: React.ElementType; label: string; badge?: number }
interface NavGroup { label: string; items: NavItem[] }

const COLLAPSED_W = 64
const EXPANDED_W  = 224

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore()
  const { crmName } = useUIStore()
  const navigate = useNavigate()
  const { can, isAgencyAdmin, isLocationAdmin } = usePermissions()
  const isAgencyManager = isAgencyAdmin
  const isDirector = isAgencyManager
  const [collapsed, setCollapsed]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [orgMenuOpen,  setOrgMenuOpen]  = useState(false)
  const [convBadge, setConvBadge] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const orgMenuRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const convRes = await getUnreadCount().catch(() => null)
        if (convRes) setConvBadge(convRes.data?.count ?? 0)
      } catch {}
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (orgMenuRef.current  && !orgMenuRef.current.contains(e.target as Node))  setOrgMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const crmItems: NavItem[] = [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    ...(can('contacts', 'view')      ? [{ to: '/contacts',      icon: Users,         label: 'Contactos' }]                                 : []),
    ...(can('opportunities', 'view') ? [{ to: '/pipeline',      icon: Kanban,        label: 'Oportunidades' }]                             : []),
    ...(can('appointments', 'view')  ? [{ to: '/appointments',  icon: CalendarClock, label: 'Agendamentos' }]                              : []),
    ...(can('properties', 'view')    ? [{ to: '/properties',    icon: Building2,     label: 'Propriedades' }]                              : []),
    ...(can('conversations', 'view') ? [{ to: '/conversations', icon: MessageSquare, label: 'Conversas', badge: convBadge }]               : []),
    { to: '/calls',         icon: PhoneCall, label: 'Chamadas' },
    { to: '/phone-numbers', icon: Phone,     label: 'Números' },
  ]

  const gestaoItems: NavItem[] = [
    ...(can('reports', 'view') ? [{ to: '/reports', icon: BarChart3, label: 'Relatórios' }] : []),
  ]

  const navGroups: NavGroup[] = [
    { label: 'CRM', items: crmItems },
    ...(gestaoItems.length ? [{ label: 'Gestão', items: gestaoItems }] : []),
    { label: 'Equipa', items: [{ to: '/settings/team', icon: Users, label: 'Equipa' }] },
  ]

  if (isAgencyManager) {
    navGroups.push({
      label: 'Agência',
      items: [
        { to: '/agency',           icon: Briefcase, label: 'Gestão de Agência' },
        { to: '/agency/locations', icon: Building2, label: 'Escritórios' },
        { to: '/agency/users',     icon: Users,     label: 'Utilizadores' },
        { to: '/agency/settings',  icon: Settings,  label: 'Config. Agência' },
        { to: '/agency/activity',  icon: Activity,  label: 'Actividade' },
        { to: '/agency/pipelines', icon: Layers,    label: 'Pipelines' },
      ],
    })
  }

  if (isAgencyManager || isLocationAdmin) {
    navGroups.push({
      label: 'Configurações',
      items: [
        { to: '/settings/team',    icon: UserCog,  label: 'Equipa' },
        { to: '/settings/general', icon: Settings, label: 'Geral' },
      ],
    })
  }

  navGroups.push({ label: 'Sistema', items: [{ to: '/settings', icon: Settings, label: 'Integrações' }] })

  return (
    <motion.aside
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'tween', ease: [0.25, 1.1, 0.4, 1], duration: 0.24 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'var(--sidebar-bg)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.06)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Logo / Org ─────────────────────────────────────────── */}
      <div
        ref={orgMenuRef}
        style={{ position: 'relative', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', height: 60 }}
      >
        <button
          onClick={() => !collapsed && setOrgMenuOpen(o => !o)}
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
            cursor: collapsed ? 'default' : 'pointer',
            background: 'none', border: 'none',
            transition: 'background 140ms',
          }}
          onMouseEnter={e => { if (!collapsed) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}>
            <CasaFlowLogo size={26} />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {crmName}
                </span>
                <ChevronsUpDown size={13} style={{ color: 'rgba(200,211,232,0.45)', flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Org dropdown */}
        <AnimatePresence>
          {orgMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', zIndex: 50,
                top: '100%', left: 8, right: 8, marginTop: 4,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              {isDirector ? (
                <>
                  <SidebarDropItem to="/agency/users"         icon={Users}    label="Membros da agência" onClick={() => setOrgMenuOpen(false)} />
                  <SidebarDropItem to="/agency?tab=invites"   icon={UserPlus} label="Convites"           onClick={() => setOrgMenuOpen(false)} />
                  <SidebarDropItem to="/agency/settings"      icon={Settings} label="Config. da agência" onClick={() => setOrgMenuOpen(false)} />
                </>
              ) : (
                <>
                  <SidebarDropItem to="/settings/general" icon={Settings} label="Configurações" onClick={() => setOrgMenuOpen(false)} />
                  <SidebarDropItem to="/settings/team"    icon={UserCog}  label="Equipa"         onClick={() => setOrgMenuOpen(false)} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Collapse toggle ────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute', top: 42, right: -10, zIndex: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.22 }}>
          <ChevronRight size={10} />
        </motion.div>
      </button>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px' }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: collapsed ? '6px 8px' : '4px 4px 0' }} />
            )}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    fontSize: 9.5,
                    color: 'rgba(200,211,232,0.4)',
                    fontWeight: 700,
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                    padding: gi === 0 ? '8px 8px 4px' : '10px 8px 4px',
                    whiteSpace: 'nowrap',
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={collapsed ? label : undefined}
                    onClick={onNavigate}
                    style={{ textDecoration: 'none' }}
                  >
                    {({ isActive }) => (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: '10px 10px',
                          minHeight: 44,
                          borderRadius: 8,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          background: isActive ? 'rgba(46,107,230,0.18)' : 'transparent',
                          color: isActive ? '#fff' : 'rgba(200,211,232,0.72)',
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'background 120ms, color 120ms',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                            e.currentTarget.style.color = '#fff'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'rgba(200,211,232,0.72)'
                          }
                        }}
                      >
                        {/* Active indicator bar */}
                        {isActive && !collapsed && (
                          <div style={{
                            position: 'absolute', left: 0, top: '18%', bottom: '18%',
                            width: 3, borderRadius: 3,
                            background: 'var(--accent)',
                          }} />
                        )}

                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Icon size={15} />
                          {collapsed && badge ? (
                            <span style={{
                              position: 'absolute', top: -3, right: -3,
                              width: 7, height: 7, borderRadius: '50%',
                              background: 'var(--danger)',
                              border: '1.5px solid var(--sidebar-bg)',
                            }} />
                          ) : null}
                        </div>

                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.13 }}
                              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {!collapsed && badge ? (
                          <span style={{
                            marginLeft: 'auto', minWidth: 17, height: 17, borderRadius: 9,
                            background: 'var(--accent)',
                            color: '#fff', fontSize: 9.5, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 4px', flexShrink: 0,
                          }}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div
        ref={userMenuRef}
        style={{ position: 'relative', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 8px' }}
      >
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 9,
            padding: collapsed ? '8px 0' : '10px 10px',
            minHeight: 44,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: userMenuOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 140ms',
          }}
          onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.background = userMenuOpen ? 'rgba(255,255,255,0.07)' : 'transparent' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(46,107,230,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em',
          }}>
            {getInitials(user?.name || '')}
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.13 }}
                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(200,211,232,0.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {ROLE_LABELS[user?.role || ''] || user?.role}
                  </p>
                </div>
                <ChevronsUpDown size={12} style={{ color: 'rgba(200,211,232,0.4)', flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* User dropdown (pops upward) */}
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', zIndex: 50,
                bottom: '100%', left: 8, right: 8, marginBottom: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {getInitials(user?.name || '')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                </div>
              </div>

              <SidebarDropItem to="/profile"  icon={UserCircle} label="O meu perfil"  onClick={() => setUserMenuOpen(false)} />
              <SidebarDropItem to="/settings" icon={Settings}   label="Configurações" onClick={() => setUserMenuOpen(false)} />

              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

              <button
                onClick={() => { setUserMenuOpen(false); handleLogout() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', fontSize: 13,
                  color: 'var(--danger)', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={14} />
                Sair
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}

/* ── Dropdown item helper ───────────────────────────────────── */
const SidebarDropItem: React.FC<{
  to: string
  icon: React.ElementType
  label: string
  onClick: () => void
}> = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
  >
    <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    {label}
  </NavLink>
)
