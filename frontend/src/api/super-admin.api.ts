import api from './client'

export const listAgencies = () => api.get('/super-admin/agencies')
export const createAgency = (data: { name: string; slug?: string; email?: string; phone?: string; ownerEmail: string }) =>
  api.post('/super-admin/agencies', data)
export const getAgencyDetail = (id: string) => api.get(`/super-admin/agencies/${id}`)
export const updateAgency = (id: string, data: object) => api.patch(`/super-admin/agencies/${id}`, data)
export const deactivateAgency = (id: string) => api.delete(`/super-admin/agencies/${id}`)
