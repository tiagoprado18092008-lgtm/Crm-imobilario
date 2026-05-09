import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Toast } from '../ui/Toast'
import { SoftPhone } from '../calls/SoftPhone'
import { useUIStore } from '../../store/ui.store'
import { useAuthStore } from '../../store/auth.store'
import { ErrorBoundary } from './ErrorBoundary'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import { GlobalSearch } from './GlobalSearch'
import { ImpersonationBanner } from './ImpersonationBanner'
import { useIsMobile } from '../../hooks/useIsMobile'

export const AppShell: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { user, setAuth, token, impersonating } = useAuthStore()
  const showOnboarding = user?.onboardingCompleted === false
  const isMobile = useIsMobile()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <ImpersonationBanner />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible */}
      <div className="hidden lg:flex flex-shrink-0" style={{ height: '100vh' }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className="fixed inset-y-0 left-0 z-30 lg:hidden"
        style={{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
          width: 240,
        }}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          className={`flex-1 overflow-y-auto${impersonating ? ' pt-10' : ''}`}
          style={{
            padding: 'clamp(12px, 4vw, 28px)',
            paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 12px)' : 'clamp(12px, 4vw, 28px)',
          }}
        >
          <ErrorBoundary inline>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNav />}

      <Toast />
      <SoftPhone />
      <GlobalSearch />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => {
          if (user && token) setAuth({ ...user, onboardingCompleted: true }, token)
        }} />
      )}
    </div>
  )
}
