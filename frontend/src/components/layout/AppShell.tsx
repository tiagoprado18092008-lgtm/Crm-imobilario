import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Toast } from '../ui/Toast'
import { SoftPhone } from '../calls/SoftPhone'
import { useUIStore } from '../../store/ui.store'
import { ErrorBoundary } from './ErrorBoundary'

export const AppShell: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f2f8' }}>
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

      {/* Mobile sidebar */}
      <div
        className="fixed inset-y-0 left-0 z-30 lg:hidden"
        style={{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: '24px 28px' }}
        >
          <ErrorBoundary inline>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Toast />
      <SoftPhone />
    </div>
  )
}
