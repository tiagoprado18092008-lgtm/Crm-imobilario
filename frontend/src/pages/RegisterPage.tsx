import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, AlertCircle, User, Mail, Lock, Building2 } from 'lucide-react'
import { register, getMe } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { CasaFlowLogo } from '../assets/casaflow-logo'

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

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px 12px 40px',
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
  e.target.style.boxShadow   = '0 0 0 3px rgba(15,37,83,0.1)'
  e.target.style.background  = T.white
}
const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = T.border
  e.target.style.boxShadow   = 'none'
  e.target.style.background  = T.offWhite
}

const ROLES = [
  { value: 'CONSULTANT',   label: 'Consultor',          Icon: User },
  { value: 'AGENCY_OWNER', label: 'Diretor de Agência',  Icon: Building2 },
]

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    role: 'CONSULTANT', agencyName: '',
  })
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('As passwords não coincidem.'); return }
    if (form.role === 'AGENCY_OWNER' && !form.agencyName.trim()) { setError('Nome da agência obrigatório.'); return }
    setLoading(true)
    try {
      const res = await register(
        form.name, form.email, form.password, form.role,
        undefined,
        form.role === 'AGENCY_OWNER' ? form.agencyName : undefined,
      )
      const { token, user } = res.data
      localStorage.setItem('crm_token', token)
      // Try to fetch fresh user, fall back to register response
      let finalUser = user
      try {
        const meRes = await getMe()
        finalUser = meRes.data
      } catch {}
      setAuth(finalUser, token)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const iconStyle: React.CSSProperties = {
    position: 'absolute', left: 13, top: '50%',
    transform: 'translateY(-50%)',
    color: T.muted, pointerEvents: 'none',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'DM Sans', sans-serif",
        background: T.white,
      }}>

        {/* ── Left panel (desktop) ──────────────────────────── */}
        <div style={{
          width: '38%',
          background: T.navy,
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 52px',
          position: 'relative',
          overflow: 'hidden',
        }} className="cf-left-panel">

          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: 360, height: 360, borderRadius: '50%',
            border: '56px solid rgba(184,150,62,0.07)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-50px', left: '-50px',
            width: 280, height: 280, borderRadius: '50%',
            border: '44px solid rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}
          >
            <CasaFlowLogo size={34} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.white, letterSpacing: '-0.02em' }}>
                CASA<span style={{ fontWeight: 400 }}>FLOW</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 1 }}>
                CRM Imobiliário
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            style={{ zIndex: 1 }}
          >
            <div style={{ width: 40, height: 3, background: T.gold, borderRadius: 2, marginBottom: 28 }} />
            <h2 style={{
              fontSize: 33, fontWeight: 700, color: T.white,
              lineHeight: 1.2, letterSpacing: '-0.03em', margin: '0 0 18px',
            }}>
              Junte-se a centenas<br />de profissionais<br />
              <span style={{ color: T.goldLt }}>imobiliários.</span>
            </h2>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Crie a sua conta gratuitamente e comece a gerir o seu negócio hoje mesmo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
              {[
                '✓  Gestão de contactos e leads',
                '✓  Pipeline de oportunidades',
                '✓  Catálogo de propriedades',
                '✓  Relatórios e análises',
              ].map(item => (
                <div key={item} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, zIndex: 1 }}
          >
            © {new Date().getFullYear()} CasaFlow · Todos os direitos reservados
          </motion.p>
        </div>

        {/* ── Right: form ───────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          overflowY: 'auto',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ width: '100%', maxWidth: 400 }}
          >

            {/* Mobile logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }} className="cf-mobile-logo">
              <CasaFlowLogo size={32} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, letterSpacing: '-0.02em' }}>
                  CASA<span style={{ fontWeight: 400 }}>FLOW</span>
                </div>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                  CRM Imobiliário
                </div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: T.navy, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                Criar conta
              </h1>
              <p style={{ fontSize: 14, color: T.muted, margin: 0, fontWeight: 300 }}>
                Registe-se gratuitamente
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: T.white,
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              padding: '28px 28px 24px',
              boxShadow: '0 2px 8px rgba(15,37,83,0.04), 0 12px 40px rgba(15,37,83,0.07)',
            }}>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 18 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8, overflow: 'hidden',
                      background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)',
                      color: T.error, fontSize: 13,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Role picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Perfil
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {ROLES.map(({ value, label, Icon }) => {
                        const active = form.role === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, role: value }))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                              fontSize: 13, fontWeight: active ? 600 : 400,
                              fontFamily: "'DM Sans', sans-serif",
                              background: active ? 'rgba(15,37,83,0.07)' : T.offWhite,
                              border: active ? `1.5px solid ${T.navy}` : `1.5px solid ${T.border}`,
                              color: active ? T.navy : T.muted,
                              transition: 'all 160ms',
                            }}
                          >
                            <Icon size={13} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Agency name */}
                  <AnimatePresence initial={false}>
                    {form.role === 'AGENCY_OWNER' && (
                      <motion.div
                        key="agency"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                          Nome da Agência
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Building2 size={14} style={iconStyle} />
                          <input
                            type="text"
                            value={form.agencyName}
                            onChange={set('agencyName')}
                            placeholder="Nome da sua agência"
                            required={form.role === 'AGENCY_OWNER'}
                            style={inputBase}
                            onFocus={onFocusInput}
                            onBlur={onBlurInput}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Nome completo
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={iconStyle} />
                      <input
                        type="text"
                        value={form.name}
                        onChange={set('name')}
                        placeholder="João Silva"
                        required
                        autoFocus
                        style={inputBase}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={iconStyle} />
                      <input
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="joao@agencia.pt"
                        required
                        autoComplete="email"
                        style={inputBase}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconStyle} />
                      <input
                        type={show ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        autoComplete="new-password"
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
                          background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4,
                          display: 'flex', alignItems: 'center', transition: 'color 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.navy)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                      >
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                      Confirmar password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconStyle} />
                      <input
                        type={show ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={set('confirm')}
                        placeholder="Repita a password"
                        required
                        autoComplete="new-password"
                        style={inputBase}
                        onFocus={onFocusInput}
                        onBlur={onBlurInput}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '13px 20px', marginTop: 4,
                      borderRadius: 10, border: 'none',
                      background: loading ? 'rgba(15,37,83,0.4)' : T.navy,
                      color: T.white, fontSize: 15, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: loading ? 'not-allowed' : 'pointer',
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
                        A criar conta...
                      </>
                    ) : (
                      <>Criar conta <ArrowRight size={15} /></>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Login link */}
            <p style={{ textAlign: 'center', fontSize: 14, color: T.muted, marginTop: 22, fontWeight: 300 }}>
              Já tem conta?{' '}
              <Link to="/login" style={{
                color: T.navy, fontWeight: 600, textDecoration: 'none',
                borderBottom: `1.5px solid ${T.gold}`, paddingBottom: 1,
              }}>
                Entrar
              </Link>
            </p>
          </motion.div>
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
