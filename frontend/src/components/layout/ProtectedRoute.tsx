import React, { useEffect } from 'react'
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

  // Clearing the store is a side effect, so it belongs in an effect rather
  // than in the render pass. Calling logout() during render made React warn
  // about updating one component while rendering another, and the redirect
  // below happens either way.
  const signedOut = hydrated && clerkLoaded && !isSignedIn
  const hasStaleSession = Boolean(token || user)

  useEffect(() => {
    if (signedOut && hasStaleSession) logout()
  }, [signedOut, hasStaleSession, logout])

  // Wait for both Clerk and local store to be ready
  if (!hydrated || !clerkLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f0f2f8' }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // Clerk signed out — the effect above clears the stale store.
  if (!isSignedIn) {
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
