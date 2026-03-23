import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user: User, token: string) => {
    localStorage.setItem('crm_token', token)
    localStorage.setItem('crm_user', JSON.stringify(user))
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    set({ user: null, token: null })
  },
  hydrate: () => {
    const token = localStorage.getItem('crm_token')
    const userStr = localStorage.getItem('crm_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, token })
      } catch {
        localStorage.removeItem('crm_token')
        localStorage.removeItem('crm_user')
      }
    }
  }
}))
