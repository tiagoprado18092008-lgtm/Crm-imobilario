import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import type { Role } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { token, user, hydrated } = useAuthStore()

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f0f2f8' }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
