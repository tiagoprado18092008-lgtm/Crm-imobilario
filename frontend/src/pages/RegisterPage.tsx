import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Briefcase, Building2 } from 'lucide-react'
import { register } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { cn } from '../lib/utils'

/* ── Logo SVG ────────────────────────────────────────────────── */
const CasaFlowLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="url(#lg-r)" />
    <path d="M16 6L5 14v13h7v-8h8v8h7V14L16 6z" fill="white" fillOpacity=".95" />
    <defs>
      <linearGradient id="lg-r" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
)

/* ── Animated gradient background ───────────────────────────── */
const GradientBg = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0" style={{ background: '#050813' }} />
    <div className="absolute" style={{
      top: '-10%', left: '20%',
      width: 600, height: 600, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
      filter: 'blur(40px)',
      animation: 'orbFloat 8s ease-in-out infinite',
    }} />
    <div className="absolute" style={{
      bottom: '-15%', right: '10%',
      width: 500, height: 500, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
      filter: 'blur(50px)',
      animation: 'orbFloat 11s ease-in-out infinite reverse',
    }} />
    <div className="absolute" style={{
      top: '50%', left: '-5%',
      width: 350, height: 350, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
      filter: 'blur(30px)',
      animation: 'orbFloat 14s ease-in-out infinite',
    }} />
    <div className="absolute inset-0 opacity-[0.025]" style={{
      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      backgroundSize: '200px 200px',
    }} />
  </div>
)

const ROLES = [
  { value: 'CONSULTANT', label: 'Consultor', icon: User },
  { value: 'AGENCY_OWNER', label: 'Diretor de Agência', icon: Building2 },
]

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'CONSULTANT', agencyName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('As passwords não coincidem.'); return }
    if (form.role === 'AGENCY_OWNER' && !form.agencyName.trim()) { setError('Nome da agência obrigatório.'); return }
    setLoading(true)
    try {
      const res = await register(form.name, form.email, form.password, form.role, undefined, form.role === 'AGENCY_OWNER' ? form.agencyName : undefined)
      const { token, user } = res.data
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(99,102,241,0.6)'
    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
    e.target.style.background = 'rgba(255,255,255,0.07)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
    e.target.style.boxShadow = 'none'
    e.target.style.background = 'rgba(255,255,255,0.05)'
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" style={{ background: '#050813' }}>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>

      <GradientBg />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="mb-3 p-0.5 rounded-2xl" style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.5))',
            boxShadow: '0 0 32px rgba(99,102,241,0.3)',
          }}>
            <div className="rounded-[13px] p-2" style={{ background: 'rgba(10,12,28,0.8)' }}>
              <CasaFlowLogo size={30} />
            </div>
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">CasaFlow</h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#6366f1', letterSpacing: '0.1em' }}>PLATAFORMA IMOBILIÁRIA</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-white font-bold text-xl leading-tight" style={{ letterSpacing: '-0.02em' }}>
              Criar conta
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Registe-se gratuitamente
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 mb-5 p-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
            >
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(239,68,68,0.2)' }}>!</span>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Perfil
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ value, label, icon: Icon }) => {
                  const active = form.role === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: value }))}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                        border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        color: active ? '#818cf8' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      <span className="truncate text-xs">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Agency name — shown only for AGENCY_OWNER */}
            <AnimatePresence initial={false}>
              {form.role === 'AGENCY_OWNER' && (
                <motion.div
                  key="agencyName"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Nome da Agência
                  </label>
                  <div className="relative">
                    <Building2 size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      value={form.agencyName}
                      onChange={set('agencyName')}
                      placeholder="Nome da sua agência"
                      required={form.role === 'AGENCY_OWNER'}
                      className={cn('w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-150')}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Nome completo
              </label>
              <div className="relative">
                <User size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="João Silva"
                  required
                  autoFocus
                  className={cn('w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-150')}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="joao@agencia.pt"
                  required
                  autoComplete="email"
                  className={cn('w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-150')}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={cn('w-full rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-150')}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'rgba(255,255,255,0.3)', border: 'none', background: 'none', cursor: 'pointer' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Confirmar password
              </label>
              <div className="relative">
                <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Repita a password"
                  required
                  autoComplete="new-password"
                  className={cn('w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-150')}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold text-white rounded-xl py-3 mt-1"
              style={{
                background: loading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                letterSpacing: '0.01em',
                transition: 'all 150ms',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width={15} height={15} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  A criar conta...
                </>
              ) : (
                <>
                  Criar conta
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#818cf8', textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          © {new Date().getFullYear()} CasaFlow — Todos os direitos reservados
        </p>
      </motion.div>
    </div>
  )
}
