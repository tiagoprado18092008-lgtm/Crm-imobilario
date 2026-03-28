import api from './client'

export const getOpportunities = (params?: any) => api.get('/opportunities', { params })
export const getOpportunity = (id: string) => api.get(`/opportunities/${id}`)
export const createOpportunity = (data: any) => api.post('/opportunities', data)
export const updateOpportunity = (id: string, data: any) => api.put(`/opportunities/${id}`, data)
export const deleteOpportunity = (id: string) => api.delete(`/opportunities/${id}`)
export const moveOpportunityStage = (id: string, stage: string, position: number) =>
  api.patch(`/opportunities/${id}/stage`, { stage, position })
