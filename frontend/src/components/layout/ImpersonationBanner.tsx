import React from 'react'
import { useAuthStore } from '../../store/auth.store'

export const ImpersonationBanner: React.FC = () => {
  const { impersonating, stopImpersonation, user } = useAuthStore()

  if (!impersonating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-sm flex items-center justify-center gap-4 py-2 px-4 shadow-lg">
      <span>
        A visualizar como <strong>{user?.name}</strong>
        {user?.role && (
          <span className="ml-1 opacity-80">
            ({user.role === 'LOCATION_ADMIN' ? 'Admin de Escritório' : user.role === 'USER' || user.role === 'CONSULTANT' ? 'Consultor' : user.role})
          </span>
        )}
      </span>
      <button
        onClick={stopImpersonation}
        className="bg-white text-orange-600 px-3 py-0.5 rounded font-semibold hover:bg-orange-50 transition-colors text-xs"
      >
        Sair
      </button>
    </div>
  )
}
