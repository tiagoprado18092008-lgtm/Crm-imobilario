import api from './client'

export const getCommSettings = () => api.get('/settings/communications')
export const updateCommSettings = (data: any) => api.post('/settings/communications', data)
export const getCommStatus = () => api.get('/settings/communications/status')
