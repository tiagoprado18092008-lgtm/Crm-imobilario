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

// A backend that is starting up or restarting (tsx watch, a Railway deploy)
// refuses connections for a few seconds. Reads fail in that window and each
// page shows its own "Erro ao carregar ..." toast, although nothing is wrong.
// Reads are safe to repeat, so wait and try again; writes are never retried,
// because a request that timed out may still have been saved.
const RETRY_DELAYS_MS = [700, 1500, 3000]
const RETRYABLE_STATUS = new Set([502, 503, 504])

const isTransient = (error: any) =>
  !error.response || RETRYABLE_STATUS.has(error.response.status)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    const method = (original?.method ?? 'get').toLowerCase()
    if (original && method === 'get' && isTransient(error) && !axios.isCancel(error)) {
      const attempt: number = original._transientRetries ?? 0
      if (attempt < RETRY_DELAYS_MS.length) {
        original._transientRetries = attempt + 1
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
        return api(original)
      }
    }

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
