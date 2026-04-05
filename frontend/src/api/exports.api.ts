import api from './client'

export const exportContacts = () => api.get('/exports/contacts', { responseType: 'blob' })
export const exportOpportunities = () => api.get('/exports/opportunities', { responseType: 'blob' })
export const exportTasks = () => api.get('/exports/tasks', { responseType: 'blob' })
