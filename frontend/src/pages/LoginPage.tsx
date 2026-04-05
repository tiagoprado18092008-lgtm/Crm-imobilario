import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { login, googleLogin } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex" style={{ background: '#080d1a' }}>

      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-14 w-5/12 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0d1530 0%, #111827 100%)' }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', bottom: -120, right: -120,
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '10%',
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">CRM Imobiliário</p>
            <p className="text-xs font-medium" style={{ color: '#6366f1', letterSpacing: '0.06em' }}>PLATAFORMA PREMIUM</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-white font-bold leading-tight mb-5" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
            A plataforma que os melhores consultores usam
          </h2>
          <p style={{ color: '#6b7a9a', fontSize: 14, lineHeight: 1.7 }}>
            Pipeline visual, automações inteligentes, inbox unificado e relatórios em tempo real — tudo para fechar mais negócios.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Automações IA', 'Pipeline Kanban', 'WhatsApp & Email', 'Lead Scoring', 'Multi-equipa'].map(f => (
              <span key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-10 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { value: '360°', label: 'Visão completa' },
              { value: 'RBAC', label: 'Controlo de acessos' },
              { value: '100%', label: 'Personalizável' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-white font-bold text-2xl" style={{ letterSpacing: '-0.02em' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a5578' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs relative z-10" style={{ color: '#2d3654' }}>
          © {new Date().getFullYear()} CRM Imobiliário — Todos os direitos reservados
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-page)' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>CRM Imobiliário</p>
              <p className="text-xs font-medium" style={{ color: '#6366f1' }}>PLATAFORMA PREMIUM</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>

            <div className="mb-7">
              <h1 className="font-bold leading-tight" style={{ fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Bem-vindo de volta
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>Entre na sua conta para continuar</p>
            </div>

            {error && (
              <div
                className="flex items-center gap-3 mb-5 p-3.5 rounded-xl text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                  <span className="text-red-600 font-bold text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className="input-premium"
                    style={{
                      width: '100%',
                      paddingLeft: 40,
                      paddingRight: 16,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 14,
                      borderRadius: 12,
                      outline: 'none',
                      border: '1.5px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="input-premium"
                    style={{
                      width: '100%',
                      paddingLeft: 40,
                      paddingRight: 48,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 14,
                      borderRadius: 12,
                      outline: 'none',
                      border: '1.5px solid var(--input-border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold text-white rounded-xl"
                style={{
                  paddingTop: 12,
                  paddingBottom: 12,
                  marginTop: 4,
                  background: loading
                    ? '#a5b4fc'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  transition: 'all 150ms',
                  letterSpacing: '0.01em',
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width={16} height={16} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    A entrar...
                  </>
                ) : (
                  <>
                    Entrar na conta
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-5">
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>ou continue com</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>

            {/* Google Login */}
            <div className="mt-4">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (!credentialResponse.credential) return
                    setError('')
                    setLoading(true)
                    try {
                      const res = await googleLogin(credentialResponse.credential)
                      const { token, user } = res.data
                      setAuth(user, token)
                      navigate('/dashboard', { replace: true })
                    } catch (err: any) {
                      setError(err?.response?.data?.error || 'Falha no login com Google.')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  onError={() => setError('Falha no login com Google.')}
                  width="100%"
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                />
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium"
                  style={{ border: '1.5px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Entrar com Google
                </button>
              )}
            </div>

            <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#6366f1', textDecoration: 'none' }}>
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
