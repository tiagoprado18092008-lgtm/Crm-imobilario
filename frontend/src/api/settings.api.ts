import api from './client'

export const getCommSettings = () => api.get('/settings/communications')
export const updateCommSettings = (data: any) => api.post('/settings/communications', data)
export const getCommStatus = () => api.get('/settings/communications/status')
export const triggerTwilioSetup = () => api.post('/settings/twilio-setup')
export const testWhatsApp = () => api.post('/settings/communications/test/whatsapp')
export const testEmail = () => api.post('/settings/communications/test/email')
export const testTwilio = () => api.post('/settings/communications/test/twilio')
