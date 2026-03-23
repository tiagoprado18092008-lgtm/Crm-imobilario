import api from './client'

export const getInteractions = (params?: any) => api.get('/interactions', { params })
export const createInteraction = (data: any) => api.post('/interactions', data)
