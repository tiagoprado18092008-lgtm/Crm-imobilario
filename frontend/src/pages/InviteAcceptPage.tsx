import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { SignUp } from '@clerk/clerk-react'
import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'

type Step = 'loading' | 'invalid' | 'signup'

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token inválido ou em falta.')
      setStep('invalid')
      return
    }
    axios
      .get(`${BASE}/invitations/verify/${token}`)
      .then(res => {
        const data = res.data?.data ?? res.data
        setEmail(data.email)
        setStep('signup')
      })
      .catch(err => {
        const msg = err?.response?.data?.error || 'Token inválido ou expirado.'
        setErrorMsg(msg)
        setStep('invalid')
      })
  }, [token])

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080d1a' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#818cf8' }} />
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4" style={{ background: '#080d1a' }}>
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={28} style={{ color: '#f87171' }} />
        </div>
        <h1 className="text-white font-bold text-xl">Convite inválido</h1>
        <p className="text-sm text-center max-w-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {errorMsg}
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Contacte o seu administrador para obter um novo convite.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', cursor: 'pointer' }}
        >
          Ir para o login
        </button>
      </div>
    )
  }

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignUp
        routing="hash"
        initialValues={{ emailAddress: email }}
      />
    </main>
  )
}
