import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react'
import { login } from '../api/auth.api'
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
      setError(err?.response?.data?.message || 'Email ou password incorretos.')
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
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#f0f2f8' }}>
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
              <p className="font-bold text-slate-900 text-lg leading-tight">CRM Imobiliário</p>
              <p className="text-xs font-medium" style={{ color: '#6366f1' }}>PLATAFORMA PREMIUM</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)', border: '1px solid #eaecf3' }}>

            <div className="mb-7">
              <h1 className="font-bold text-slate-900 leading-tight" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-slate-400 mt-1.5">Entre na sua conta para continuar</p>
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
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
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
                      border: '1.5px solid #e2e8f0',
                      background: '#fafbfd',
                      color: '#0f172a',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
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
                      border: '1.5px solid #e2e8f0',
                      background: '#fafbfd',
                      color: '#0f172a',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
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

            <p className="text-center text-sm text-slate-400 mt-6">
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
