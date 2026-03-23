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
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toast: null,
  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    set({ toast: { message, type } })
  },
  clearToast: () => set({ toast: null })
}))
