import api from './client'

export const getMyAgency = () =>
  api.get('/agency/me')

export const getAgencyById = (id: string) =>
  api.get(`/agency/${id}`)

export const updateAgency = (id: string, dto: {
  name?: string; legalName?: string; slug?: string; logoUrl?: string; coverUrl?: string;
  description?: string; phone?: string; email?: string; website?: string;
  address?: string; city?: string; country?: string; niche?: string; currency?: string
}) =>
  api.put(`/agency/${id}`, dto)

export const uploadAgencyLogo = (id: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/agency/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export const regenerateApiKey = (id: string) =>
  api.post(`/agency/${id}/regenerate-api-key`)

export const listAgencyMembers = (id: string) =>
  api.get(`/agency/${id}/members`)

export const assignUserToAgency = (agencyId: string, userId: string) =>
  api.post(`/agency/${agencyId}/members`, { userId })

export const removeAgencyMember = (agencyId: string, userId: string) =>
  api.delete(`/agency/${agencyId}/members/${userId}`)
