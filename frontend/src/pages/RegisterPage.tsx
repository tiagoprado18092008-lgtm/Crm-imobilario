import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Phone, User, Building2, AlertCircle } from 'lucide-react'
import { register } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({ name: '', email: '', phone: '', agency: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('As passwords não coincidem.'); return }
    setLoading(true)
    try {
      const res = await register(form.name, form.email, form.password, form.phone || undefined, form.agency || undefined)
      const { token, user } = res.data
      setAuth(user, token)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const IS: React.CSSProperties = {
    width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
    fontSize: 14, borderRadius: 12, outline: 'none', border: '1.5px solid var(--input-border)',
    background: 'var(--input-bg)', color: 'var(--text-primary)', transition: 'border-color 150ms, box-shadow 150ms',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none' }

  return (
    <div className="min-h-screen flex" style={{ background: '#080d1a' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-14 w-5/12 relative overflow-hidden" style={{ background: 'linear-gradient(155deg, #0d1530 0%, #111827 100%)' }}>
        <div style={{ position: 'absolute', bottom: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 46, height: 46, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">CRM Imobiliário</p>
            <p className="text-xs font-medium" style={{ color: '#6366f1', letterSpacing: '0.06em' }}>PLATAFORMA PREMIUM</p>
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="text-white font-bold leading-tight mb-5" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
            Comece a gerir o seu negócio hoje
          </h2>
          <p style={{ color: '#6b7a9a', fontSize: 14, lineHeight: 1.7 }}>
            Crie a sua conta e tenha acesso imediato a todas as ferramentas de um consultor imobiliário profissional.
          </p>
        </div>
        <p className="text-xs relative z-10" style={{ color: '#2d3654' }}>© {new Date().getFullYear()} CRM Imobiliário</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-page)' }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
            <div className="mb-6">
              <h1 className="font-bold leading-tight" style={{ fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Criar conta</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Registe-se gratuitamente</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={16} />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Nome completo</label>
                <div className="relative">
                  <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="text" value={form.name} onChange={set('name')} placeholder="João Silva" required autoFocus style={IS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <div className="relative">
                  <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="email" value={form.email} onChange={set('email')} placeholder="joao@agencia.pt" required style={IS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Agency */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Agência <span className="font-normal normal-case" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <div className="relative">
                  <Building2 size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="text" value={form.agency} onChange={set('agency')} placeholder="Nome da agência" style={IS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Telefone <span className="font-normal normal-case" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <div className="relative">
                  <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+351 910 000 000" style={IS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Mínimo 6 caracteres" required minLength={6}
                    style={{ ...IS, paddingRight: 48 }} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }} tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Confirmar password</label>
                <div className="relative">
                  <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')}
                    placeholder="Repita a password" required style={IS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold text-white rounded-xl"
                style={{ paddingTop: 12, paddingBottom: 12, marginTop: 4, background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)', cursor: loading ? 'not-allowed' : 'pointer', border: 'none' }}
              >
                {loading ? 'A criar conta...' : 'Criar conta →'}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
              Já tem conta?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#6366f1', textDecoration: 'none' }}>Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
