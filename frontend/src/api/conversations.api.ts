import api from './client'

export const getConversations = (params?: any) => api.get('/conversations', { params })
export const getConversation = (id: string) => api.get(`/conversations/${id}`)
export const getConversationStats = () => api.get('/conversations/stats')
export const getUnreadCount = () => api.get('/conversations/unread-count')
export const createConversation = (data: any) => api.post('/conversations', data)
export const sendMessage = (id: string, data: any) => api.post(`/conversations/${id}/messages`, data)
export const updateConversationStatus = (id: string, status: string) => api.patch(`/conversations/${id}/status`, { status })
export const assignConversation = (id: string, userId: string) => api.patch(`/conversations/${id}/assign`, { userId })
export const markAsRead = (id: string) => api.patch(`/conversations/${id}/read`)
export const toggleStar = (id: string) => api.patch(`/conversations/${id}/star`)
