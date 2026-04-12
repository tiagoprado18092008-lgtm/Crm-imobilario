import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { CasaFlowLogo } from '../assets/casaflow-logo'

/* ─── shared design tokens ───────────────────────────────────── */
const T = {
  navy:    '#0f2553',
  navyMid: '#1a3a6e',
  gold:    '#b8963e',
  goldLt:  '#d4af5a',
  white:   '#ffffff',
  offWhite:'#f8f9fc',
  border:  '#dce3ef',
  muted:   '#6b7a99',
  error:   '#c0392b',
}

/* ─── reusable input style helpers ──────────────────────────── */
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: `1.5px solid ${T.border}`,
  background: T.offWhite,
  fontSize: 14,
  color: T.navy,
  outline: 'none',
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 400,
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
}
const onFocusInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = T.navyMid
  e.target.style.boxShadow  = `0 0 0 3px rgba(15,37,83,0.1)`
  e.target.style.background  = T.white
}
const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = T.border
  e.target.style.boxShadow   = 'none'
  e.target.style.background  = T.offWhite
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      const { token, user } = res.data
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Email ou password incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'DM Sans', sans-serif",
        background: T.white,
      }}>

        {/* ── Left panel ─────────────────────────────────────── */}
        <div style={{
          width: '44%',
          background: T.navy,
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 52px',
          position: 'relative',
          overflow: 'hidden',
        }} className="cf-left-panel">

          {/* Subtle texture rings */}
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: 380, height: 380, borderRadius: '50%',
            border: '60px solid rgba(184,150,62,0.07)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-60px', left: '-60px',
            width: 300, height: 300, borderRadius: '50%',
            border: '50px solid rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '30%',
            width: 200, height: 200, borderRadius: '50%',
            border: '2px solid rgba(184,150,62,0.12)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}
          >
            <CasaFlowLogo size={36} />
            <div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: T.white,
                letterSpacing: '-0.02em',
              }}>
                CASA<span style={{ fontWeight: 400 }}>FLOW</span>
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: 1,
              }}>CRM Imobiliário</div>
            </div>
          </motion.div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            style={{ zIndex: 1 }}
          >
            <div style={{
              width: 40, height: 3,
              background: T.gold,
              borderRadius: 2,
              marginBottom: 28,
            }} />
            <h2 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 36,
              fontWeight: 700,
              color: T.white,
              lineHeight: 1.18,
              letterSpacing: '-0.03em',
              margin: 0,
              marginBottom: 20,
            }}>
              Gerencie o seu<br />
              negócio imobiliário<br />
              <span style={{ color: T.goldLt }}>com confiança.</span>
            </h2>
            <p style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.7,
              margin: 0,
              fontWeight: 300,
              maxWidth: 300,
            }}>
              Contactos, oportunidades e propriedades centralizados numa única plataforma.
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 36, marginTop: 44 }}>
              {[
                { value: '2.4k+', label: 'Imóveis' },
                { value: '98%', label: 'Satisfação' },
                { value: '150+', label: 'Agentes' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: T.goldLt, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, zIndex: 1 }}
          >
            © {new Date().getFullYear()} CasaFlow · Todos os direitos reservados
          </motion.p>
        </div>

        {/* ── Right: form ────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: T.white,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ width: '100%', maxWidth: 400 }}
          >

            {/* Mobile logo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 36,
            }} className="cf-mobile-logo">
              <CasaFlowLogo size={34} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em' }}>
                  CASA<span style={{ fontWeight: 400 }}>FLOW</span>
                </div>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                  CRM Imobiliário
                </div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: 28,
                fontWeight: 700,
                color: T.navy,
                letterSpacing: '-0.03em',
                margin: 0,
                marginBottom: 6,
              }}>Bem-vindo de volta</h1>
              <p style={{ fontSize: 14, color: T.muted, margin: 0, fontWeight: 300 }}>
                Entre na sua conta para continuar
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: T.white,
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              padding: '32px 28px 28px',
              boxShadow: '0 2px 8px rgba(15,37,83,0.04), 0 12px 40px rgba(15,37,83,0.07)',
            }}>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(192,57,43,0.06)',
                      border: `1px solid rgba(192,57,43,0.2)`,
                      color: T.error, fontSize: 13, overflow: 'hidden',
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      autoFocus
                      style={{ ...inputBase }}
                      onFocus={onFocusInput}
                      onBlur={onBlurInput}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={show ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        style={{ ...inputBase, paddingRight: 44 }}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShow(!show)}
                        style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: T.muted, padding: 4, display: 'flex', alignItems: 'center',
                          transition: 'color 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.navy)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                      >
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '13px 20px', marginTop: 4,
                      borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? 'rgba(15,37,83,0.4)' : T.navy,
                      color: T.white, fontSize: 15, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: loading ? 'none' : '0 4px 18px rgba(15,37,83,0.28)',
                      transition: 'background 200ms, box-shadow 200ms, transform 150ms',
                      letterSpacing: '-0.01em',
                    }}
                    onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = T.navyMid; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(15,37,83,0.4)' : T.navy; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
                  >
                    {loading ? (
                      <>
                        <svg style={{ animation: 'spin 0.8s linear infinite' }} width={15} height={15} fill="none" viewBox="0 0 24 24">
                          <circle opacity={0.25} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path opacity={0.8} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        A entrar...
                      </>
                    ) : (
                      <>Entrar na conta <ArrowRight size={15} /></>
                    )}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 12, color: T.muted, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>ou</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>

              {/* Google */}
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={async (cr) => {
                    if (!cr.credential) return
                    setError(''); setLoading(true)
                    try {
                      const res = await googleLogin(cr.credential)
                      const { token, user } = res.data
                      setAuth(user, token)
                      navigate('/dashboard', { replace: true })
                    } catch (err: any) {
                      setError(err?.response?.data?.error || 'Falha no login com Google.')
                    } finally { setLoading(false) }
                  }}
                  onError={() => setError('Falha no login com Google.')}
                  width="100%"
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                />
              ) : (
                <button disabled style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: `1.5px solid ${T.border}`, background: T.white,
                  color: T.muted, fontSize: 14, fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'not-allowed', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10, opacity: 0.7,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </button>
              )}
            </div>

            {/* Register link */}
            <p style={{ textAlign: 'center', fontSize: 14, color: T.muted, marginTop: 22, fontWeight: 300 }}>
              Ainda não tem conta?{' '}
              <Link to="/register" style={{
                color: T.navy, fontWeight: 600, textDecoration: 'none',
                borderBottom: `1.5px solid ${T.gold}`, paddingBottom: 1,
              }}>
                Criar conta
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Responsive: show left panel on desktop */}
      <style>{`
        @media (min-width: 1024px) {
          .cf-left-panel { display: flex !important; }
          .cf-mobile-logo { display: none !important; }
        }
      `}</style>
    </>
  )
}
