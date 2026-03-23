import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
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
    <div className="min-h-screen flex" style={{ background: '#f1f5f9' }}>

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-5/12"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative circles */}
        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 350, height: 350, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)'
        }} />
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 250, height: 250, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)'
        }} />
        <div style={{
          position: 'absolute', top: 200, right: 40,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)'
        }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 48, height: 48,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">CRM Imobiliário</p>
            <p className="text-blue-300 text-xs">Consultores Premium</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Gerencie o seu negócio imobiliário com total controlo
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Pipeline de oportunidades, gestão de leads, sub-agentes e relatórios — tudo numa plataforma.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-8">
            {[
              { value: '360°', label: 'Visão completa' },
              { value: 'RBAC', label: 'Controlo de acessos' },
              { value: 'MVP', label: 'Pronto a usar' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-white text-2xl font-bold">{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-400 text-xs relative z-10">
          © {new Date().getFullYear()} CRM Imobiliário. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              <Building2 className="text-white" size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">CRM Imobiliário</p>
              <p className="text-slate-500 text-xs">Consultores Premium</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
            <p className="text-slate-500 text-sm mt-1">Entre na sua conta para continuar</p>
          </div>

          {error && (
            <div
              className="flex items-center gap-3 mb-5 p-4 rounded-xl text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-xs">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  style={{ pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    background: '#fff',
                    color: '#0f172a',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  style={{ pointerEvents: 'none' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 text-sm rounded-xl outline-none"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    background: '#fff',
                    color: '#0f172a',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.35)',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                transition: 'all 150ms',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  A entrar...
                </>
              ) : 'Entrar na conta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
