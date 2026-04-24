import api from './client'

// Sessão pessoal do consultor
export const getMyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null }>('/whatsapp/me/status')
export const connectMyWhatsApp = () => api.post('/whatsapp/me/connect')
export const disconnectMyWhatsApp = () => api.post('/whatsapp/me/disconnect')

// Sessão partilhada da agência
export const getAgencyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null }>('/whatsapp/agency/status')
export const connectAgencyWhatsApp = () => api.post('/whatsapp/agency/connect')
export const disconnectAgencyWhatsApp = () => api.post('/whatsapp/agency/disconnect')

// Aliases legacy (mantêm compatibilidade com código existente)
export const getWhatsAppStatus = getAgencyWhatsAppStatus
export const connectWhatsApp = connectAgencyWhatsApp
export const disconnectWhatsApp = disconnectAgencyWhatsApp
