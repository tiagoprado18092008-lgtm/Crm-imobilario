import api from './client'

export const getTemplates = (params?: { channel?: string }) => api.get('/message-templates', { params })
export const createTemplate = (data: any) => api.post('/message-templates', data)
export const updateTemplate = (id: string, data: any) => api.put(`/message-templates/${id}`, data)
export const deleteTemplate = (id: string) => api.delete(`/message-templates/${id}`)
