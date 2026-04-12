import api from './client'
export const getAgencySettings = () => api.get('/agency/settings')
export const updateAgencySettings = (data: any) => api.put('/agency/settings', data)
export const startImpersonation = (userId: string) => api.post(`/agency/impersonate/${userId}`)
export const exitImpersonation = () => api.post('/agency/impersonate/exit')
