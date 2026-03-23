import api from './client'

export const getProperties = (params?: any) => api.get('/properties', { params })
export const getProperty = (id: string) => api.get(`/properties/${id}`)
export const createProperty = (data: any) => api.post('/properties', data)
export const updateProperty = (id: string, data: any) => api.patch(`/properties/${id}`, data)
export const deleteProperty = (id: string) => api.delete(`/properties/${id}`)
