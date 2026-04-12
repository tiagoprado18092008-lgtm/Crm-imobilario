import api from './client'

export const getMyAgency = () =>
  api.get('/agencies/me')

export const getAgencyById = (id: string) =>
  api.get(`/agencies/${id}`)

export const updateAgency = (id: string, dto: { name?: string; slug?: string; logoUrl?: string }) =>
  api.put(`/agencies/${id}`, dto)

export const listAgencyMembers = (id: string) =>
  api.get(`/agencies/${id}/members`)

export const assignUserToAgency = (agencyId: string, userId: string) =>
  api.post(`/agencies/${agencyId}/members`, { userId })
