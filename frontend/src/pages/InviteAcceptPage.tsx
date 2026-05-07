import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { SignUp } from '@clerk/clerk-react'
import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'

const T = { navy: '#0f2553', gold: '#d4a843', white: '#ffffff', muted: '#6b7a99' }

type Step = 'loading' | 'invalid' | 'signup'

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [email, setEmail] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [inviteType, setInviteType] = useState<'OWNER' | 'CONSULTANT'>('CONSULTANT')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setErrorMsg('Token inválido ou em falta.'); setStep('invalid'); return }
    axios
      .get(`${BASE}/invitations/verify/${token}`)
      .then(res => {
        const data = res.data?.data ?? res.data
        setEmail(data.email)
        if (data.agencyName) setAgencyName(data.agencyName)
        if (data.type) setInviteType(data.type)
        setStep('signup')
      })
      .catch(err => {
        setErrorMsg(err?.response?.data?.error || 'Token inválido ou expirado.')
        setStep('invalid')
      })
  }, [token])

  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6fb' }}>
        <Loader2 size={32} style={{ color: T.navy, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (step === 'invalid') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 24, background: '#f4f6fb', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={28} color="#ef4444" />
        </div>
        <h1 style={{ color: T.navy, fontWeight: 700, fontSize: 20, margin: 0 }}>Convite inválido</h1>
        <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', maxWidth: 320, margin: 0 }}>{errorMsg}</p>
        <p style={{ color: T.muted, fontSize: 13, margin: 0 }}>Contacte o seu administrador para obter um novo convite.</p>
        <button onClick={() => navigate('/login')} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: T.navy, color: T.white, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Ir para o login
        </button>
      </div>
    )
  }

  const isOwner = inviteType === 'OWNER'
  const welcomeTitle = isOwner
    ? `Bem-vindo(a) à ${agencyName || 'CasaFlow'}!`
    : `Junte-se à equipa${agencyName ? ` ${agencyName}` : ''}`
  const welcomeDesc = isOwner
    ? 'Crie a sua conta para começar a gerir a sua agência.'
    : 'Crie a sua conta para aceder à plataforma CasaFlow.'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6fb', padding: 24, fontFamily: "'DM Sans', sans-serif", gap: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em', marginBottom: 6 }}>
          CASA<span style={{ fontWeight: 400 }}>FLOW</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.navy, margin: '0 0 8px' }}>{welcomeTitle}</h1>
        <p style={{ color: T.muted, fontSize: 14, margin: 0 }}>{welcomeDesc}</p>
      </div>

      <SignUp
        routing="hash"
        initialValues={{ emailAddress: email }}
        afterSignUpUrl="/login"
      />
    </div>
  )
}
