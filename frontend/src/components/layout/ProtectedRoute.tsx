import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuthStore } from '../../store/auth.store'
import { usePermissions } from '../../hooks/usePermissions'
import type { Role } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
  module?: string
  action?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, module, action }) => {
  const { token, user, hydrated, logout } = useAuthStore()
  const { can } = usePermissions()
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth()

  // Wait for both Clerk and local store to be ready
  if (!hydrated || !clerkLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f0f2f8' }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // Clerk signed out — clear CRM store and redirect to login
  if (!isSignedIn) {
    if (token || user) logout()
    return <Navigate to="/login" replace />
  }

  // Clerk signed in but no CRM token yet — redirect to login to trigger exchange
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  if (module && action && !can(module, action)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
