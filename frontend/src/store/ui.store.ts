import { create } from 'zustand'
import { applyTheme, getStoredTheme, setStoredTheme, resolveTheme } from '../lib/theme'

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toast: ToastState | null
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  clearToast: () => void
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  crmName: string
  setCrmName: (name: string) => void
}

// Bootstrap: apply stored theme immediately (script in index.html already did this,
// this just keeps zustand state in sync with what's actually rendered)
const initialDark = resolveTheme(getStoredTheme()) === 'dark'

export const useUIStore = create<UIState>((set) => ({
  crmName: localStorage.getItem('imocrm-name') || 'CasaFlow',
  setCrmName: (name: string) => {
    localStorage.setItem('imocrm-name', name)
    set({ crmName: name })
  },
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toast: null,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    set({ toast: { message, type } })
  },
  clearToast: () => set({ toast: null }),
  darkMode: initialDark,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      setStoredTheme(next ? 'dark' : 'light')
      return { darkMode: next }
    }),
  setDarkMode: (dark: boolean) =>
    set(() => {
      setStoredTheme(dark ? 'dark' : 'light')
      return { darkMode: dark }
    }),
}))

// Keep zustand in sync if theme changes externally (e.g. system preference)
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
      const isDark = resolveTheme('system') === 'dark'
      useUIStore.setState({ darkMode: isDark })
    }
  })
}
