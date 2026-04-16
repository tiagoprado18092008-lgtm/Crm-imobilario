import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2,
  BarChart3, UserCog, LogOut, Settings,
  CalendarClock, ChevronRight,
  UserCircle, ChevronsUpDown, UserPlus, Briefcase,
  MessageSquare, Activity, Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { usePermissions } from '../../hooks/usePermissions'
import { getUnreadCount } from '../../api/conversations.api'
import { CasaFlowLogo, CasaFlowWordmark } from '../../assets/casaflow-logo'
import { useUIStore } from '../../store/ui.store'

/* ── Design tokens ────────────────────────────────────────────── */
const T = {
  navy:    '#0f2553',
  navyMid: '#1a3a6e',
  gold:    '#b8963e',
  goldLt:  '#d4af5a',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
}

interface NavItem { to: string; icon: React.ElementType; label: string; badge?: number }
interface NavGroup { label: string; items: NavItem[] }

const COLLAPSED_W = 60
const EXPANDED_W  = 244

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
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(can('contacts', 'view')      ? [{ to: '/contacts',     icon: Users,        label: 'Contactos' }]      : []),
    ...(can('opportunities', 'view') ? [{ to: '/pipeline',     icon: Kanban,       label: 'Oportunidades' }]  : []),
    ...(can('appointments', 'view')  ? [{ to: '/appointments', icon: CalendarClock,label: 'Agendamentos' }]   : []),
    ...(can('properties', 'view')    ? [{ to: '/properties',   icon: Building2,    label: 'Propriedades' }]   : []),
    ...(can('conversations', 'view') ? [{ to: '/conversations', icon: MessageSquare, label: 'Conversas', badge: convBadge }] : []),
  ]

  const gestaoItems: NavItem[] = [
    ...(can('reports', 'view')  ? [{ to: '/reports', icon: BarChart3,   label: 'Relatórios' }]                : []),
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
        { to: '/agency',          icon: Briefcase, label: 'Gestão de Agência' },
        { to: '/agency/locations', icon: Building2, label: 'Escritórios' },
        { to: '/agency/users',    icon: Users,     label: 'Utilizadores' },
        { to: '/agency/settings', icon: Settings,  label: 'Config. Agência' },
        { to: '/agency/activity', icon: Activity,  label: 'Actividade' },
        { to: '/agency/pipelines', icon: Layers,   label: 'Pipelines' },
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

  const labelVariants = {
    open:   { opacity: 1, x: 0, display: 'block' },
    closed: { opacity: 0, x: -8, transitionEnd: { display: 'none' } },
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.22 }}
      className="flex flex-col h-full relative flex-shrink-0 overflow-hidden"
      style={{
        background: T.white,
        borderRight: `1.5px solid ${T.border}`,
        boxShadow: '2px 0 16px rgba(15,37,83,0.06)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Logo + Org selector ─────────────────────────────── */}
      <div
        ref={orgMenuRef}
        className="relative flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.border}`, height: 64 }}
      >
        <button
          onClick={() => !collapsed && setOrgMenuOpen(o => !o)}
          className="w-full h-full flex items-center gap-3 px-3 transition-colors"
          style={{
            cursor: collapsed ? 'default' : 'pointer',
            background: orgMenuOpen ? T.offWhite : 'none',
            border: 'none',
          }}
          onMouseEnter={e => { if (!collapsed) e.currentTarget.style.background = T.offWhite }}
          onMouseLeave={e => { e.currentTarget.style.background = orgMenuOpen ? T.offWhite : 'none' }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
            <CasaFlowLogo size={28} />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: T.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>{crmName}</span>
                  </div>
                </div>
                <ChevronsUpDown size={13} style={{ color: T.muted, flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Org dropdown */}
        {orgMenuOpen && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 rounded-xl overflow-hidden"
            style={{
              top: '100%', left: 8, right: 8, marginTop: 4,
              background: T.white,
              border: `1px solid ${T.border}`,
              boxShadow: '0 8px 32px rgba(15,37,83,0.12)',
            }}
          >
            {isDirector ? (
              <>
                <OrgMenuItem to="/agency"              icon={Users}    label="Membros da agência"      onClick={() => setOrgMenuOpen(false)} />
                <OrgMenuItem to="/agency?tab=invites"  icon={UserPlus} label="Convites"                onClick={() => setOrgMenuOpen(false)} />
                <OrgMenuItem to="/agency?tab=settings" icon={Settings} label="Config. da agência"      onClick={() => setOrgMenuOpen(false)} />
              </>
            ) : (
              <>
                <OrgMenuItem to="/settings" icon={Settings} label="Configurações" onClick={() => setOrgMenuOpen(false)} />
                {user?.role === 'ADMIN' && (
                  <OrgMenuItem to="/users" icon={UserCog} label="Gestão de utilizadores" onClick={() => setOrgMenuOpen(false)} />
                )}
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Toggle button ─────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute flex items-center justify-center rounded-full z-10"
        style={{
          top: 42, right: -10, width: 20, height: 20,
          background: T.white,
          border: `1.5px solid ${T.border}`,
          color: T.muted, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(15,37,83,0.12)',
        }}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={10} />
        </motion.div>
      </button>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ paddingLeft: 8, paddingRight: 8 }}>
        {navGroups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: 2 }}>
            {gi > 0 && (
              <div style={{ height: 1, background: T.border, margin: collapsed ? '6px 8px' : '2px 8px 0' }} />
            )}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', padding: gi === 0 ? '6px 8px 5px' : '10px 8px 5px',
                    whiteSpace: 'nowrap',
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
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    title={collapsed ? label : undefined}
                    style={collapsed ? { justifyContent: 'center', paddingLeft: 0, paddingRight: 0 } : {}}
                    onClick={onNavigate}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Icon size={16} />
                      {collapsed && badge ? (
                        <span style={{
                          position: 'absolute', top: -3, right: -3, width: 7, height: 7,
                          borderRadius: '50%', background: '#ef4444', border: `1.5px solid ${T.white}`,
                        }} />
                      ) : null}
                    </div>

                    <motion.span
                      variants={labelVariants}
                      animate={collapsed ? 'closed' : 'open'}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, whiteSpace: 'nowrap' }}
                    >
                      {label}
                    </motion.span>

                    {!collapsed && badge ? (
                      <span style={{
                        marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                        background: T.navy, color: T.white, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', flexShrink: 0,
                      }}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
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
        className="relative flex-shrink-0"
        style={{ borderTop: `1px solid ${T.border}`, padding: '10px 8px' }}
      >
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          className="w-full flex items-center gap-2.5 rounded-xl transition-all"
          style={{
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: userMenuOpen ? T.offWhite : 'transparent',
            border: `1px solid ${userMenuOpen ? T.border : 'transparent'}`,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.offWhite; e.currentTarget.style.borderColor = T.border; }}
          onMouseLeave={e => { e.currentTarget.style.background = userMenuOpen ? T.offWhite : 'transparent'; e.currentTarget.style.borderColor = userMenuOpen ? T.border : 'transparent'; }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
            style={{
              width: 28, height: 28, fontSize: 10,
              background: T.navy,
              color: T.white,
              letterSpacing: '0.05em',
            }}
          >
            {getInitials(user?.name || '')}
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 flex items-center gap-1"
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold truncate leading-tight" style={{ color: T.navy }}>{user?.name}</p>
                  <p className="text-xs truncate leading-tight" style={{ color: T.muted, marginTop: 1 }}>
                    {ROLE_LABELS[user?.role || ''] || user?.role}
                  </p>
                </div>
                <ChevronsUpDown size={12} style={{ color: T.muted, flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* User dropdown */}
        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute z-50 rounded-xl overflow-hidden"
            style={{
              bottom: '100%', left: 8, right: 8, marginBottom: 6,
              background: T.white,
              border: `1px solid ${T.border}`,
              boxShadow: '0 8px 32px rgba(15,37,83,0.12)',
            }}
          >
            {/* User info header */}
            <div className="flex items-center gap-2.5 px-3 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
                style={{ width: 32, height: 32, fontSize: 11, background: T.navy, color: T.white }}>
                {getInitials(user?.name || '')}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: T.navy }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: T.muted }}>{user?.email}</p>
              </div>
            </div>

            <UserMenuItem icon={UserCircle} label="O meu perfil"   to="/profile"   onClick={() => setUserMenuOpen(false)} />
            <UserMenuItem icon={Settings}   label="Configurações"  to="/settings"  onClick={() => setUserMenuOpen(false)} />

            <div style={{ height: 1, background: T.border, margin: '2px 0' }} />

            <button
              onClick={() => { setUserMenuOpen(false); handleLogout() }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
              style={{ color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,57,43,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={13} />
              Sair
            </button>
          </motion.div>
        )}
      </div>
    </motion.aside>
  )
}

/* ── Small helper components ────────────────────────────────── */
const T2 = { navy: '#0f2553', muted: '#6b7a99', offWhite: '#f8f9fc' }

const OrgMenuItem: React.FC<{ to: string; icon: React.ElementType; label: string; onClick: () => void }> = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
    style={{ color: T2.muted, textDecoration: 'none' }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = T2.offWhite; (e.currentTarget as HTMLAnchorElement).style.color = T2.navy; }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; (e.currentTarget as HTMLAnchorElement).style.color = T2.muted; }}
  >
    <Icon size={13} />
    {label}
  </NavLink>
)

const UserMenuItem: React.FC<{ to: string; icon: React.ElementType; label: string; onClick: () => void }> = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
    style={{ color: T2.muted, textDecoration: 'none' }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = T2.offWhite; (e.currentTarget as HTMLAnchorElement).style.color = T2.navy; }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; (e.currentTarget as HTMLAnchorElement).style.color = T2.muted; }}
  >
    <Icon size={13} />
    {label}
  </NavLink>
)
