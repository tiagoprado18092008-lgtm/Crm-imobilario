import api from './client'

export const getLocations = (params?: any) => api.get('/locations', { params })
export const getLocation = (id: string) => api.get(`/locations/${id}`)
export const createLocation = (data: any) => api.post('/locations', data)
export const updateLocation = (id: string, data: any) => api.put(`/locations/${id}`, data)
export const deleteLocation = (id: string) => api.delete(`/locations/${id}`)
export const getLocationSettings = (id: string) => api.get(`/locations/${id}/settings`)
export const updateLocationSettings = (id: string, data: any) => api.put(`/locations/${id}/settings`, data)
export const getLocationMembers = (id: string) => api.get(`/locations/${id}/members`)
export const addLocationMember = (locationId: string, userId: string) => api.post(`/locations/${locationId}/members`, { userId })
