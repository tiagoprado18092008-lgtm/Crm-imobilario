import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import type { Role } from '../../types'

interface Props {
  roles: Role[]
  children: React.ReactNode
  fallback?: string
}

export const RoleGuard: React.FC<Props> = ({ roles, children, fallback = '/dashboard' }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role as Role)) return <Navigate to={fallback} replace />
  return <>{children}</>
}
