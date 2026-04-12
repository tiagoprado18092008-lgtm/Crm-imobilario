import type { PermissionMap } from '../types'

export const DEFAULT_PERMISSIONS: Record<string, PermissionMap> = {
  AGENCY_OWNER: {
    contacts: ['view', 'create', 'edit', 'delete', 'export'],
    opportunities: ['view', 'create', 'edit', 'delete'],
    properties: ['view', 'create', 'edit', 'delete'],
    tasks: ['view', 'create', 'edit', 'delete'],
    appointments: ['view', 'create', 'edit', 'delete'],
    conversations: ['view', 'create', 'edit', 'delete'],
    campaigns: ['view', 'create', 'edit', 'delete'],
    forms: ['view', 'create', 'edit', 'delete'],
    automations: ['view', 'create', 'edit', 'delete'],
    reports: ['view'],
    settings: ['view', 'edit'],
    users: ['view', 'create', 'edit', 'delete'],
  },
  AGENCY_ADMIN: {
    contacts: ['view', 'create', 'edit', 'delete', 'export'],
    opportunities: ['view', 'create', 'edit', 'delete'],
    properties: ['view', 'create', 'edit', 'delete'],
    tasks: ['view', 'create', 'edit', 'delete'],
    appointments: ['view', 'create', 'edit', 'delete'],
    conversations: ['view', 'create', 'edit', 'delete'],
    campaigns: ['view', 'create', 'edit', 'delete'],
    forms: ['view', 'create', 'edit', 'delete'],
    automations: ['view', 'create', 'edit', 'delete'],
    reports: ['view'],
    settings: ['view', 'edit'],
    users: ['view', 'create', 'edit', 'delete'],
  },
  LOCATION_ADMIN: {
    contacts: ['view', 'create', 'edit', 'delete', 'export'],
    opportunities: ['view', 'create', 'edit', 'delete'],
    properties: ['view', 'create', 'edit', 'delete'],
    tasks: ['view', 'create', 'edit', 'delete'],
    appointments: ['view', 'create', 'edit', 'delete'],
    conversations: ['view', 'create', 'edit', 'delete'],
    campaigns: ['view', 'create', 'edit', 'delete'],
    forms: ['view', 'create', 'edit', 'delete'],
    automations: ['view', 'create', 'edit', 'delete'],
    reports: ['view'],
    settings: ['view', 'edit'],
    users: ['view', 'create', 'edit'],
  },
  TEAM_LEADER: {
    contacts: ['view', 'create', 'edit', 'delete', 'export'],
    opportunities: ['view', 'create', 'edit', 'delete'],
    properties: ['view', 'create', 'edit'],
    tasks: ['view', 'create', 'edit', 'delete'],
    appointments: ['view', 'create', 'edit', 'delete'],
    conversations: ['view', 'create', 'edit'],
    campaigns: ['view', 'create', 'edit'],
    forms: ['view', 'create', 'edit'],
    automations: ['view'],
    reports: ['view'],
    settings: ['view'],
    users: ['view'],
  },
  CONSULTANT: {
    contacts: ['view', 'create', 'edit'],
    opportunities: ['view', 'create', 'edit'],
    properties: ['view'],
    tasks: ['view', 'create', 'edit'],
    appointments: ['view', 'create', 'edit'],
    conversations: ['view', 'create'],
    campaigns: ['view'],
    forms: ['view'],
    automations: [],
    reports: [],
    settings: [],
    users: [],
  },
  USER: {
    contacts: ['view', 'create', 'edit'],
    opportunities: ['view', 'create', 'edit'],
    properties: ['view'],
    tasks: ['view', 'create', 'edit'],
    appointments: ['view', 'create', 'edit'],
    conversations: ['view', 'create'],
    campaigns: ['view'],
    forms: ['view'],
    automations: [],
    reports: [],
    settings: [],
    users: [],
  },
}

export const resolvePermissions = (user: { role: string; permissions?: PermissionMap | null }): PermissionMap => {
  const base = DEFAULT_PERMISSIONS[user.role] ?? DEFAULT_PERMISSIONS.USER
  if (!user.permissions) return base
  // Merge: explicit permissions override role defaults per module
  return { ...base, ...user.permissions }
}

export const can = (user: { role: string; permissions?: PermissionMap | null } | null, module: string, action: string): boolean => {
  if (!user) return false
  if (['AGENCY_OWNER', 'AGENCY_ADMIN'].includes(user.role)) return true
  const perms = resolvePermissions(user)
  return perms[module]?.includes(action) ?? false
}
