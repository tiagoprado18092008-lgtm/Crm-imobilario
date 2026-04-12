import React from 'react'
import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: '#080d1a' }}>
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 80, height: 80, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <ShieldX size={40} style={{ color: '#f87171' }} />
        </div>

        <div>
          <h1 className="text-white font-bold text-3xl mb-2" style={{ letterSpacing: '-0.02em' }}>
            403 — Acesso Negado
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Não tem permissão para aceder a esta página.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            Voltar
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
