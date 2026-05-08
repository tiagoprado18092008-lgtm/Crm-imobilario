// v2
import api from './client'

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const register = (name: string, email: string, password: string, role?: string, phone?: string, agency?: string) =>
  api.post('/auth/register', { name, email, password, role, phone, agency })

export const googleLogin = (idToken: string) =>
  api.post('/auth/google', { idToken })

export const getMe = () => api.get('/auth/me')

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}

export const refreshTokens = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const { data } = await api.post('/auth/refresh', { refreshToken })
  return data
}
