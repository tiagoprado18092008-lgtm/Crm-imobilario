import api from './client'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (name: string, email: string, password: string, phone?: string) =>
  api.post('/auth/register', { name, email, password, phone })

export const getMe = () => api.get('/auth/me')
