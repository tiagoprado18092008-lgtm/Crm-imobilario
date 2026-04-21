import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Kanban, Building2,
  BarChart3, UserCog, LogOut, Settings,
  CalendarClock, UserCircle, UserPlus, Briefcase,
  MessageSquare, Activity, Layers, Phone, PhoneCall,
  Home, ChevronRight, ChevronsUpDown, Search,
  ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth.store'
import { getInitials } from '../../utils/formatters'
import { ROLE_LABELS } from '../../utils/constants'
import { usePermissions } from '../../hooks/usePermissions'
import { getUnreadCount } from '../../api/conversations.api'
import { useUIStore } from '../../store/ui.store'

/* ── Types ─────────────────────────────────────────────────── */
interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: number
  children?: { to: string; label: string }[]
}
interface NavSection {
  label: string
  items: NavItem[]
}
interface RailItem {
  id: string
  icon: React.ElementType
  label: string
}

/* ── Dimensions ─────────────────────────────────────────────── */
const RAIL_W = 56
const PANEL_W = 200
const PANEL_COLLAPSED_W = 0

/* ── Rail icon button ───────────────────────────────────────── */
const RailButton: React.FC<{
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}> = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'rgba(200,211,232,0.65)',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 150ms, color 150ms',
      flexShrink: 0,
    }}
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.color = '#fff'
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'rgba(200,211,232,0.65)'
      }
    }}
  >
    <Icon size={17} />
    {badge ? (
      <span style={{
        position: 'absolute', top: 5, right: 5,
        width: 7, height: 7, borderRadius: '50%',
        background: '#DC2626',
        border: '1.5px solid var(--sidebar-bg)',
      }} />
    ) : null}
  </button>
)

/* ── Panel nav item ─────────────────────────────────────────── */
const PanelItem: React.FC<{
  item: NavItem
  onNavigate?: () => void
}> = ({ item, onNavigate }) => {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const hasChildren = item.children && item.children.length > 0
  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 8,
            background: isActive ? 'rgba(46,107,230,0.15)' : 'transparent',
            color: isActive ? '#fff' : 'rgba(200,211,232,0.75)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'var(--font-body)',
            textAlign: 'left',
            transition: 'background 120ms, color 120ms',
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
              e.currentTarget.style.color = 'rgba(200,211,232,0.75)'
            }
          }}
        >
          <item.icon size={14} style={{ flexShrink: 0, opacity: 0.85 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
          <ChevronDown
            size={12}
            style={{
              flexShrink: 0,
              opacity: 0.5,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
            }}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingLeft: 22, paddingTop: 2, paddingBottom: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {item.children!.map(child => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={onNavigate}
                    style={{ textDecoration: 'none' }}
                  >
                    {({ isActive: ca }) => (
                      <div
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: ca ? 600 : 400,
                          color: ca ? '#fff' : 'rgba(200,211,232,0.6)',
                          background: ca ? 'rgba(46,107,230,0.2)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 120ms, color 120ms',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontFamily: 'var(--font-body)',
                        }}
                        onMouseEnter={e => {
                          if (!ca) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = '#fff'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!ca) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'rgba(200,211,232,0.6)'
                          }
                        }}
                      >
                        {child.label}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <NavLink to={item.to} onClick={onNavigate} style={{ textDecoration: 'none' }}>
      {({ isActive: ia }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 8,
            background: ia ? 'rgba(46,107,230,0.18)' : 'transparent',
            color: ia ? '#fff' : 'rgba(200,211,232,0.75)',
            fontSize: 12.5,
            fontWeight: ia ? 600 : 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            position: 'relative',
          }}
          onMouseEnter={e => {
            if (!ia) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.color = '#fff'
            }
          }}
          onMouseLeave={e => {
            if (!ia) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(200,211,232,0.75)'
            }
          }}
        >
          {ia && (
            <div style={{
              position: 'absolute', left: 0, top: '20%', bottom: '20%',
              width: 3, borderRadius: 3,
              background: 'var(--accent)',
            }} />
          )}
          <item.icon size={14} style={{ flexShrink: 0, opacity: 0.85 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.label}
          </span>
          {item.badge ? (
            <span style={{
              minWidth: 16, height: 16, borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', flexShrink: 0,
            }}>
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </div>
      )}
    </NavLink>
  )
}

/* ── Dropdown helper for org/user menus ─────────────────────── */
const DropItem: React.FC<{
  to: string
  icon: React.ElementType
  label: string
  onClick: () => void
}> = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}
    onMouseEnter={e => {
      ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-3)'
      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
    }}
    onMouseLeave={e => {
      ;(e.currentTarget as HTMLAnchorElement).style.background = 'none'
      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
    }}
  >
    <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    {label}
  </NavLink>
)

/* ── Main Sidebar ───────────────────────────────────────────── */
export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore()
  const { crmName } = useUIStore()
  const navigate = useNavigate()
  const { can, isAgencyAdmin, isLocationAdmin } = usePermissions()
  const isAgencyManager = isAgencyAdmin

  const [convBadge, setConvBadge] = useState(0)
  const [activeRail, setActiveRail] = useState<string>('crm')
  const [panelOpen, setPanelOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  const userMenuRef = useRef<HTMLDivElement>(null)
  const orgMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUnreadCount().catch(() => null)
        if (res) setConvBadge(res.data?.count ?? 0)
      } catch {}
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) setOrgMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  /* ── Rail sections ────────────────────────────────────────── */
  const crmItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(can('contacts', 'view') ? [{ to: '/contacts', icon: Users, label: 'Contactos' }] : []),
    ...(can('opportunities', 'view') ? [{ to: '/pipeline', icon: Kanban, label: 'Oportunidades' }] : []),
    ...(can('appointments', 'view') ? [{ to: '/appointments', icon: CalendarClock, label: 'Agendamentos' }] : []),
    ...(can('properties', 'view') ? [{ to: '/properties', icon: Building2, label: 'Propriedades' }] : []),
    ...(can('conversations', 'view') ? [{ to: '/conversations', icon: MessageSquare, label: 'Conversas', badge: convBadge }] : []),
    { to: '/calls', icon: PhoneCall, label: 'Chamadas' },
    { to: '/phone-numbers', icon: Phone, label: 'Números' },
  ]

  const gestaoItems: NavItem[] = [
    ...(can('reports', 'view') ? [{ to: '/reports', icon: BarChart3, label: 'Relatórios' }] : []),
  ]

  const equipaItems: NavItem[] = [
    { to: '/settings/team', icon: Users, label: 'Equipa' },
  ]

  const agencyItems: NavItem[] = isAgencyManager ? [
    { to: '/agency/users', icon: Users, label: 'Membros' },
    { to: '/agency?tab=invites', icon: UserPlus, label: 'Convites' },
    { to: '/agency/locations', icon: Building2, label: 'Escritórios' },
    { to: '/agency/settings', icon: Settings, label: 'Config. Agência' },
    { to: '/agency/activity', icon: Activity, label: 'Actividade' },
    { to: '/agency/pipelines', icon: Layers, label: 'Pipelines' },
  ] : []

  const configItems: NavItem[] = [
    { to: '/settings', icon: Settings, label: 'Integrações' },
    ...(isAgencyManager || isLocationAdmin ? [{ to: '/settings/general', icon: Settings, label: 'Geral' }] : []),
  ]

  const allSections: Record<string, NavSection[]> = {
    crm: [
      { label: 'Principal', items: crmItems },
      ...(gestaoItems.length ? [{ label: 'Gestão', items: gestaoItems }] : []),
    ],
    equipa: [{ label: 'Equipa', items: equipaItems }],
    ...(isAgencyManager ? { agencia: [{ label: 'Agência', items: agencyItems }] } : {}),
    config: [{ label: 'Configurações', items: configItems }],
  }

  const railItems: RailItem[] = [
    { id: 'crm', icon: LayoutDashboard, label: 'CRM' },
    { id: 'equipa', icon: Users, label: 'Equipa' },
    ...(isAgencyManager ? [{ id: 'agencia', icon: Briefcase, label: 'Agência' }] : []),
    { id: 'config', icon: Settings, label: 'Configurações' },
  ]

  const currentSections = allSections[activeRail] || []

  const allItems = currentSections.flatMap(s => s.items)
  const filtered = search.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : null

  const handleRailClick = (id: string) => {
    if (activeRail === id) {
      setPanelOpen(o => !o)
    } else {
      setActiveRail(id)
      setPanelOpen(true)
    }
  }

  const totalW = RAIL_W + (panelOpen ? PANEL_W : PANEL_COLLAPSED_W)

  return (
    <motion.div
      animate={{ width: totalW }}
      transition={{ type: 'tween', ease: [0.25, 1.1, 0.4, 1], duration: 0.28 }}
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
      }}
    >
      {/* ══ RAIL (icon column) ══════════════════════════════════ */}
      <div style={{
        width: RAIL_W,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 8px',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        height: '100%',
        gap: 4,
      }}>
        {/* Logo / Org button */}
        <div ref={orgMenuRef} style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
          <button
            onClick={() => setOrgMenuOpen(o => !o)}
            style={{
              width: '100%',
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            title={crmName}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(46,107,230,0.45)',
            }}>
              <Home size={16} color="#fff" />
            </div>
          </button>

          {/* Org dropdown */}
          <AnimatePresence>
            {orgMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: RAIL_W - 4,
                  zIndex: 100,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                  overflow: 'hidden',
                  minWidth: 200,
                }}
              >
                {isAgencyManager ? (
                  <>
                    <DropItem to="/agency/users" icon={Users} label="Membros da agência" onClick={() => setOrgMenuOpen(false)} />
                    <DropItem to="/agency?tab=invites" icon={UserPlus} label="Convites" onClick={() => setOrgMenuOpen(false)} />
                    <DropItem to="/agency/settings" icon={Settings} label="Config. da agência" onClick={() => setOrgMenuOpen(false)} />
                  </>
                ) : (
                  <>
                    <DropItem to="/settings/general" icon={Settings} label="Configurações" onClick={() => setOrgMenuOpen(false)} />
                    <DropItem to="/settings/team" icon={UserCog} label="Equipa" onClick={() => setOrgMenuOpen(false)} />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation rail items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
          {railItems.map(ri => (
            <RailButton
              key={ri.id}
              icon={ri.icon}
              label={ri.label}
              active={activeRail === ri.id && panelOpen}
              onClick={() => handleRailClick(ri.id)}
              badge={ri.id === 'crm' && convBadge > 0 ? convBadge : undefined}
            />
          ))}
        </div>

        {/* User avatar */}
        <div ref={userMenuRef} style={{ position: 'relative', marginBottom: 8 }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: userMenuOpen ? 'var(--accent)' : 'rgba(46,107,230,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.05em',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = 'rgba(46,107,230,0.55)' }}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'rgba(46,107,230,0.35)' }}
            title={user?.name}
          >
            {getInitials(user?.name || '')}
          </button>

          {/* User dropdown */}
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: RAIL_W - 4,
                  zIndex: 100,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                  overflow: 'hidden',
                  minWidth: 210,
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
                  }}>
                    {getInitials(user?.name || '')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ROLE_LABELS[user?.role || ''] || user?.role}
                    </p>
                  </div>
                </div>
                <DropItem to="/profile" icon={UserCircle} label="O meu perfil" onClick={() => setUserMenuOpen(false)} />
                <DropItem to="/settings" icon={Settings} label="Configurações" onClick={() => setUserMenuOpen(false)} />
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
      </div>

      {/* ══ PANEL (detail nav) ══════════════════════════════════ */}
      <motion.div
        animate={{ width: panelOpen ? PANEL_W : 0, opacity: panelOpen ? 1 : 0 }}
        transition={{ type: 'tween', ease: [0.25, 1.1, 0.4, 1], duration: 0.25 }}
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: PANEL_W,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 8px',
          overflow: 'hidden',
        }}>
          {/* Panel header: section title + collapse btn */}
          <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 4,
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {crmName}
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'none', border: 'none',
                color: 'rgba(200,211,232,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                transition: 'background 120ms, color 120ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'rgba(200,211,232,0.45)'
              }}
              title="Recolher"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Search */}
          <div style={{
            position: 'relative',
            marginBottom: 10,
            flexShrink: 0,
          }}>
            <Search size={12} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(200,211,232,0.4)',
              pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              style={{
                width: '100%',
                height: 32,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 8,
                paddingLeft: 28,
                paddingRight: 10,
                fontSize: 12,
                color: '#fff',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Nav sections */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {filtered ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'rgba(200,211,232,0.4)', padding: '8px 10px' }}>Sem resultados</p>
                ) : filtered.map(item => (
                  <PanelItem key={item.to} item={item} onNavigate={() => { setSearch(''); onNavigate?.() }} />
                ))}
              </div>
            ) : (
              currentSections.map((section, si) => (
                <div key={section.label} style={{ marginBottom: 12 }}>
                  {si > 0 && (
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 4px 8px' }} />
                  )}
                  <p style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'rgba(200,211,232,0.38)',
                    padding: '0 10px 4px',
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                  }}>
                    {section.label}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {section.items.map(item => (
                      <PanelItem key={item.to} item={item} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </nav>

          {/* User footer in panel */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 4px 10px',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 6px',
              borderRadius: 8,
              cursor: 'default',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(46,107,230,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {getInitials(user?.name || '')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12, fontWeight: 600, color: '#fff',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {user?.name}
                </p>
                <p style={{
                  fontSize: 10, color: 'rgba(200,211,232,0.5)',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </p>
              </div>
              <ChevronsUpDown size={12} style={{ color: 'rgba(200,211,232,0.35)', flexShrink: 0 }} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
