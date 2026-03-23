import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import type { Role } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
