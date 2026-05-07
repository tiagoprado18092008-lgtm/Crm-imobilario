import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession, useClerk } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { CasaFlowLogo } from '../assets/casaflow-logo'

const T = {
  navy:    '#0f2553',
  navyMid: '#1a3a6e',
  gold:    '#b8963e',
  goldLt:  '#d4af5a',
  white:   '#ffffff',
  border:  '#dce3ef',
  muted:   '#6b7a99',
  error:   '#c0392b',
}

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: T.white }}>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: `4px solid ${T.navy}`, borderTopColor: 'transparent',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export const LoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const { session } = useSession()
  const { signOut } = useClerk()
  const { clerkExchange, token, hydrated, logout } = useAuthStore()
  const navigate = useNavigate()
  const exchanging = useRef(false)
  const processedSessionIds = useRef<Set<string>>(new Set())
  const [exchangeError, setExchangeError] = useState('')

  useEffect(() => {
    if (!isLoaded || !hydrated) return
    if (isSignedIn && token) { navigate('/dashboard', { replace: true }); return }
    if (!isSignedIn || !session) return
    if (exchanging.current) return
    if (processedSessionIds.current.has(session.id)) return

    exchanging.current = true
    processedSessionIds.current.add(session.id)

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) { exchanging.current = false; return }
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err: any) {
        console.error('Clerk exchange failed:', err)
        const msg = err?.message || 'Sem acesso. Contacte o administrador.'
        logout()
        await signOut()
        setExchangeError(msg)
        exchanging.current = false
      }
    })
  }, [isLoaded, hydrated, isSignedIn, session, token, clerkExchange, navigate, logout, signOut])

  if (!isLoaded || !hydrated) return <Spinner />
  if (isSignedIn && !token && !exchangeError) return <Spinner />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: T.white }}>

        {/* Left panel */}
        <div style={{
          width: '44%', background: T.navy,
          display: 'none', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 52px', position: 'relative', overflow: 'hidden',
        }} className="cf-left-panel">
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 380, height: 380, borderRadius: '50%', border: '60px solid rgba(184,150,62,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: 300, height: 300, borderRadius: '50%', border: '50px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
            <CasaFlowLogo size={36} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.white, letterSpacing: '-0.02em' }}>
                CASA<span style={{ fontWeight: 400 }}>FLOW</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1 }}>CRM Imobiliário</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.2 }} style={{ zIndex: 1 }}>
            <div style={{ width: 40, height: 3, background: T.gold, borderRadius: 2, marginBottom: 28 }} />
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 700, color: T.white, lineHeight: 1.18, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
              Gerencie o seu<br />negócio imobiliário<br /><span style={{ color: T.goldLt }}>com confiança.</span>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0, fontWeight: 300, maxWidth: 300 }}>
              Contactos, oportunidades e propriedades centralizados numa única plataforma.
            </p>
            <div style={{ display: 'flex', gap: 36, marginTop: 44 }}>
              {[{ value: '2.4k+', label: 'Imóveis' }, { value: '98%', label: 'Satisfação' }, { value: '150+', label: 'Agentes' }].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: T.goldLt, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, zIndex: 1 }}>
            © {new Date().getFullYear()} CasaFlow · Todos os direitos reservados
          </motion.p>
        </div>

        {/* Right: Clerk SignIn */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: T.white, flexDirection: 'column', gap: 16 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }} className="cf-mobile-logo">
            <CasaFlowLogo size={34} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em' }}>CASA<span style={{ fontWeight: 400 }}>FLOW</span></div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>CRM Imobiliário</div>
            </div>
          </div>

          {exchangeError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 8, maxWidth: 400, width: '100%',
              background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)',
              color: T.error, fontSize: 13,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {exchangeError}
            </div>
          )}

          <SignIn routing="hash" />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .cf-left-panel { display: flex !important; }
          .cf-mobile-logo { display: none !important; }
        }
      `}</style>
    </>
  )
}
