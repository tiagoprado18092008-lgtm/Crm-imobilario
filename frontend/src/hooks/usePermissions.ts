import { useAuthStore } from '../store/auth.store'
import { resolvePermissions } from '../lib/permissions'
import type { Role } from '../types'

export const usePermissions = () => {
  const { user } = useAuthStore()

  const can = (module: string, action: string): boolean => {
    if (!user) return false
    if (['AGENCY_OWNER', 'AGENCY_ADMIN'].includes(user.role)) return true
    const perms = resolvePermissions(user)
    return perms[module]?.includes(action) ?? false
  }

  const isAgencyAdmin = user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN'
  const isLocationAdmin = user?.role === 'LOCATION_ADMIN'
  const isAgencyManager = isAgencyAdmin
  const role: Role | undefined = user?.role as Role | undefined

  return { can, role, isAgencyAdmin, isLocationAdmin, isAgencyManager }
}
