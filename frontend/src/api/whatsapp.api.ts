import api from './client'

export const getWhatsAppStatus = () => api.get<{ status: string; phone: string | null }>('/whatsapp/status')
export const connectWhatsApp = () => api.post('/whatsapp/connect')
export const disconnectWhatsApp = () => api.post('/whatsapp/disconnect')
