import { create } from 'zustand'

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toast: ToastState | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  crmName: string
  setCrmName: (name: string) => void
}

const saved = localStorage.getItem('imocrm-dark-mode')
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
const initialDark = saved !== null ? saved === 'true' : prefersDark

if (initialDark) document.documentElement.classList.add('dark')

export const useUIStore = create<UIState>((set) => ({
  crmName: localStorage.getItem('imocrm-name') || 'ImoCRM',
  setCrmName: (name: string) => {
    localStorage.setItem('imocrm-name', name)
    set({ crmName: name })
  },
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toast: null,
  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ toast: { message, type } })
  },
  clearToast: () => set({ toast: null }),
  darkMode: initialDark,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('imocrm-dark-mode', String(next))
      return { darkMode: next }
    }),
  setDarkMode: (dark: boolean) =>
    set(() => {
      if (dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('imocrm-dark-mode', String(dark))
      return { darkMode: dark }
    }),
}))
