import api from './client'

export const getProperties = (params?: any) => api.get('/properties', { params })
export const getProperty = (id: string) => api.get(`/properties/${id}`)
export const createProperty = (data: any) => api.post('/properties', data)
export const updateProperty = (id: string, data: any) => api.patch(`/properties/${id}`, data)
export const deleteProperty = (id: string) => api.delete(`/properties/${id}`)

// Photos
export const uploadPhoto = (id: string, file: File, categoria?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (categoria) fd.append('categoria', categoria)
  return api.post(`/properties/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const reorderPhotos = (id: string, order: string[]) =>
  api.patch(`/properties/${id}/photos/reorder`, { order })
export const updatePhoto = (id: string, photoId: string, categoria: string) =>
  api.patch(`/properties/${id}/photos/${photoId}`, { categoria })
export const deletePhoto = (id: string, photoId: string) =>
  api.delete(`/properties/${id}/photos/${photoId}`)

// Documents
export const uploadDocument = (id: string, file: File, nome: string, tipo?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('nome', nome)
  if (tipo) fd.append('tipo', tipo)
  return api.post(`/properties/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const deleteDocument = (id: string, docId: string) =>
  api.delete(`/properties/${id}/documents/${docId}`)

// Visits
export const getVisits = (id: string) => api.get(`/properties/${id}/visits`)
export const createVisit = (id: string, data: { contactId?: string; scheduledAt: string; notas?: string }) =>
  api.post(`/properties/${id}/visits`, data)
export const updateVisit = (id: string, visitId: string, data: { status?: string; interesse?: string; notas?: string }) =>
  api.patch(`/properties/${id}/visits/${visitId}`, data)

// IA
export const generateDescription = (id: string) =>
  api.post(`/properties/${id}/generate-description`)
