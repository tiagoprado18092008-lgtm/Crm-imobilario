import api from './client'

export const getCallToken = () => api.get('/calls/token')
export const initiateCall = (data: { to: string; contactId?: string; opportunityId?: string; fromNumberId?: string }) =>
  api.post('/calls', data)
export const getCalls = (params?: any) => api.get('/calls', { params })
export const updateCallNotes = (id: string, notes: string) =>
  api.patch(`/calls/${id}`, { notes })
