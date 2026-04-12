import React from 'react'
import { usePermissions } from '../../hooks/usePermissions'

interface PermissionGateProps {
  module: string
  action: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  fallback = null,
  children,
}) => {
  const { can } = usePermissions()
  return can(module, action) ? <>{children}</> : <>{fallback}</>
}
