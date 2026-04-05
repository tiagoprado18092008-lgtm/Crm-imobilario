import api from './client'
export const globalSearch = (q: string) => api.get('/search', { params: { q } })
