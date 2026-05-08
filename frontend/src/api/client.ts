import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const { impersonating, user } = useAuthStore.getState()
  if (impersonating && user) {
    config.headers['X-Impersonate-User'] = user.id
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const is401 = error.response?.status === 401
    const isAuthEndpoint = original?.url?.includes('/auth/')

    if (is401 && !original._retry && !isAuthEndpoint) {
      const storedRefresh = localStorage.getItem('crm_refresh_token')

      if (storedRefresh) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            refreshQueue.push((token) => {
              original.headers['Authorization'] = `Bearer ${token}`
              resolve(api(original))
            })
          })
        }

        original._retry = true
        isRefreshing = true

        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/auth/refresh`,
            { refreshToken: storedRefresh }
          )
          const { token, refreshToken: newRefresh } = data
          localStorage.setItem('crm_token', token)
          localStorage.setItem('crm_refresh_token', newRefresh)
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          refreshQueue.forEach((cb) => cb(token))
          refreshQueue = []
          original.headers['Authorization'] = `Bearer ${token}`
          return api(original)
        } catch {
          refreshQueue = []
          localStorage.removeItem('crm_token')
          localStorage.removeItem('crm_refresh_token')
          localStorage.removeItem('crm_user')
          localStorage.removeItem('crm_impersonating')
          localStorage.removeItem('crm_location')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      }

      // No refresh token — clear and redirect
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm_user')
      localStorage.removeItem('crm_impersonating')
      localStorage.removeItem('crm_location')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
