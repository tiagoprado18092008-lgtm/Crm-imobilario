import api from './client'

export type LeadState = 'NOVO' | 'A_TRABALHAR' | 'QUALIFICADO' | 'DESQUALIFICADO' | 'NURTURING'

export type Lead = {
  id: string
  companyName: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  state: LeadState
  source: string | null
  attempts: number
  lastAttemptAt: string | null
  nextAttemptAt: string | null
  lastDisposition: string | null
  optOutCalls: boolean
  tags: string[]
  createdAt: string
  owner?: { id: string; name: string } | null
  company?: { id: string; name: string; sector: string; concelho: string | null } | null
}

export const getLeads = (params?: Record<string, unknown>) => api.get('/leads', { params })
export const getLead = (id: string) => api.get(`/leads/${id}`)
export const createLead = (data: unknown) => api.post('/leads', data)
export const updateLead = (id: string, data: unknown) => api.patch(`/leads/${id}`, data)
export const deleteLead = (id: string) => api.delete(`/leads/${id}`)

/** Wrap-up after a call. The disposition decides the lead's next state. */
export const recordDisposition = (
  id: string,
  data: { disposition: string; notes?: string; nextAttemptAt?: string },
) => api.post(`/leads/${id}/disposition`, data)

/** Lead to Company + Contact + Deal, in one transaction. */
export const convertLead = (id: string, data: Record<string, unknown>) =>
  api.post(`/leads/${id}/convert`, data)

export const bulkAssignLeads = (ids: string[], ownerId: string) =>
  api.post('/leads/bulk/assign', { ids, ownerId })

/** Validates a file and reports what would happen. Writes nothing. */
export const previewLeadImport = (file: File, mapping?: Record<string, string | null>) => {
  const form = new FormData()
  form.append('file', file)
  if (mapping) form.append('mapping', JSON.stringify(mapping))
  return api.post('/leads/import/preview', form)
}

export const commitLeadImport = (
  file: File,
  opts: { mapping?: Record<string, string | null>; source?: string; ownerId?: string } = {},
) => {
  const form = new FormData()
  form.append('file', file)
  if (opts.mapping) form.append('mapping', JSON.stringify(opts.mapping))
  if (opts.source) form.append('source', opts.source)
  if (opts.ownerId) form.append('ownerId', opts.ownerId)
  return api.post('/leads/import', form)
}
