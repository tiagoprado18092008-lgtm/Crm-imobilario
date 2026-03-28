import { useAuthStore } from '../store/auth.store'

export const useAuth = () => {
  const { user, token, hydrated, setAuth, logout } = useAuthStore()
  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: !hydrated,
    setAuth,
    logout,
  }
}
