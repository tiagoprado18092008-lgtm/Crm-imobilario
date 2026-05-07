import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Building2, LogOut } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'
import { useAuthStore } from '../../store/auth.store'

const T = { navy: '#0f2553', gold: '#d4a843', white: '#ffffff', navyLight: '#1a3a6e' }

export const SuperAdminLayout: React.FC = () => {
  const { signOut } = useClerk()
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    logout()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <aside style={{
        width: 220, background: T.navy, display: 'flex', flexDirection: 'column',
        padding: '24px 0', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white, letterSpacing: '-0.02em' }}>
            CASA<span style={{ fontWeight: 400 }}>FLOW</span>
          </div>
          <div style={{ fontSize: 10, color: T.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            Super Admin
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <NavLink
            to="/super-admin/agencies"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
              color: isActive ? T.gold : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14,
              transition: 'all 150ms',
            })}
          >
            <Building2 size={16} />
            Agências
          </NavLink>
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 14, width: '100%',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = T.white)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 220, flex: 1, padding: 32, background: '#f4f6fb', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
