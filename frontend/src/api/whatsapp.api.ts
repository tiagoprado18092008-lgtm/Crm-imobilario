import api from './client'

// Sessão pessoal do consultor
export const getMyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null; qr?: string | null }>(
    `/whatsapp/me/status?t=${Date.now()}`,
    { headers: { 'Cache-Control': 'no-cache' } },
  )
export const connectMyWhatsApp = () => api.post('/whatsapp/me/connect')
export const disconnectMyWhatsApp = () => api.post('/whatsapp/me/disconnect')

// Sessão partilhada da agência
export const getAgencyWhatsAppStatus = () =>
  api.get<{ status: string; phone: string | null; qr?: string | null }>(
    `/whatsapp/agency/status?t=${Date.now()}`,
    { headers: { 'Cache-Control': 'no-cache' } },
  )
export const connectAgencyWhatsApp = () => api.post('/whatsapp/agency/connect')
export const disconnectAgencyWhatsApp = () => api.post('/whatsapp/agency/disconnect')

// Aliases legacy (mantêm compatibilidade com código existente)
export const getWhatsAppStatus = getAgencyWhatsAppStatus
export const connectWhatsApp = connectAgencyWhatsApp
export const disconnectWhatsApp = disconnectAgencyWhatsApp
