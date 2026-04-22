import { create } from 'zustand'
import type { User, Location } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean
  impersonating: User | null
  currentLocation: Location | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  hydrate: () => void
  startImpersonation: (target: User) => void
  stopImpersonation: () => void
  setCurrentLocation: (loc: Location | null) => void
  clerkExchange: (clerkToken: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  impersonating: null,
  currentLocation: null,
  setAuth: (user: User, token: string) => {
    localStorage.setItem('crm_token', token)
    localStorage.setItem('crm_user', JSON.stringify(user))
    localStorage.removeItem('crm_impersonating')
    localStorage.removeItem('crm_location')
    set({ user, token, impersonating: null, currentLocation: null })
  },
  clerkExchange: async (clerkToken: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/auth/clerk-exchange`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Erro de autenticação');
    }
    const { token, user } = await res.json();
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(user));
    set({ user, token, hydrated: true, impersonating: null, currentLocation: null });
  },
  logout: () => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_impersonating')
    localStorage.removeItem('crm_location')
    set({ user: null, token: null, impersonating: null, currentLocation: null })
  },
  hydrate: () => {
    const token = localStorage.getItem('crm_token')
    const userStr = localStorage.getItem('crm_user')
    const impersonatingStr = localStorage.getItem('crm_impersonating')
    const locationStr = localStorage.getItem('crm_location')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        const impersonating = impersonatingStr ? (JSON.parse(impersonatingStr) as User) : null
        const currentLocation = locationStr ? (JSON.parse(locationStr) as Location) : null
        set({ user, token, hydrated: true, impersonating, currentLocation })
        return
      } catch {
        localStorage.removeItem('crm_token')
        localStorage.removeItem('crm_user')
        localStorage.removeItem('crm_impersonating')
        localStorage.removeItem('crm_location')
      }
    }
    set({ hydrated: true })
  },
  startImpersonation: (target: User) => {
    const currentUser = get().user
    if (!currentUser) return
    localStorage.setItem('crm_impersonating', JSON.stringify(currentUser))
    localStorage.setItem('crm_user', JSON.stringify(target))
    set({ impersonating: currentUser, user: target })
  },
  stopImpersonation: () => {
    const impersonating = get().impersonating
    if (!impersonating) return
    localStorage.setItem('crm_user', JSON.stringify(impersonating))
    localStorage.removeItem('crm_impersonating')
    set({ user: impersonating, impersonating: null })
  },
  setCurrentLocation: (loc: Location | null) => {
    if (loc) {
      localStorage.setItem('crm_location', JSON.stringify(loc))
    } else {
      localStorage.removeItem('crm_location')
    }
    set({ currentLocation: loc })
  },
}))
