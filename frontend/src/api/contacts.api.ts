import api from './client'

export const getContacts = (params?: any) => api.get('/contacts', { params })
export const getContact = (id: string) => api.get(`/contacts/${id}`)
export const createContact = (data: any) => api.post('/contacts', data)
export const updateContact = (id: string, data: any) => api.put(`/contacts/${id}`, data)
export const deleteContact = (id: string) => api.delete(`/contacts/${id}`)
