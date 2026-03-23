import api from './client'

export const getTasks = (params?: any) => api.get('/tasks', { params })
export const getTask = (id: string) => api.get(`/tasks/${id}`)
export const createTask = (data: any) => api.post('/tasks', data)
export const updateTask = (id: string, data: any) => api.patch(`/tasks/${id}`, data)
export const deleteTask = (id: string) => api.delete(`/tasks/${id}`)
