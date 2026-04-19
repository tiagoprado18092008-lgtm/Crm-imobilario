// v2
import api from './client'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (name: string, email: string, password: string, role?: string, phone?: string, agency?: string) =>
  api.post('/auth/register', { name, email, password, role, phone, agency })

export const googleLogin = (idToken: string) =>
  api.post('/auth/google', { idToken })

export const getMe = () => api.get('/auth/me')
