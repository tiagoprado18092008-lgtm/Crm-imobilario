import api from './client'
export const getActivity = (params?: any) => api.get('/activity', { params })
