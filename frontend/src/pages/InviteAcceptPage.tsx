import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth.store'

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'

type Step = 'loading' | 'invalid' | 'form' | 'success'

interface InvitationInfo {
  email: string
  role: string
  agencyName?: string
}

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const [step, setStep] = useState<Step>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStep('invalid')
      setErrorMsg('Token inválido ou em falta.')
      return
    }
    axios
      .get(`${BASE}/invitations/verify/${token}`)
      .then(res => {
        const data = res.data?.data ?? res.data
        setInvitation({ email: data.email, role: data.role, agencyName: data.agencyName })
        setStep('form')
      })
      .catch(err => {
        const msg = err?.response?.data?.error || 'Token inválido ou expirado.'
        setErrorMsg(msg)
        setStep('invalid')
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nome obrigatório.'); return }
    if (password.length < 6) { toast.error('A password deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { toast.error('As passwords não coincidem.'); return }

    setSubmitting(true)
    try {
      const res = await axios.post(`${BASE}/auth/register`, {
        name: name.trim(),
        email: invitation!.email,
        password,
        phone: phone.trim() || undefined,
        invitationToken: token,
      })
      const data = res.data?.data ?? res.data
      const jwt = data?.token
      const user = data?.user
      if (jwt && user) setAuth(user, jwt)
      setStep('success')
      toast.success('Conta criada com sucesso!')
      setTimeout(() => navigate('/'), 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Erro ao criar conta.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Loading ── */
  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080d1a' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#818cf8' }} />
      </div>
    )
  }

  /* ── Invalid ── */
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

  /* ── Success ── */
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4" style={{ background: '#080d1a' }}>
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 64, height: 64, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <CheckCircle size={28} style={{ color: '#4ade80' }} />
        </div>
        <h1 className="text-white font-bold text-xl">Conta criada!</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          A entrar na aplicação...
        </p>
        <Loader2 size={18} className="animate-spin" style={{ color: '#818cf8' }} />
      </div>
    )
  }

  /* ── Form ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    color: '#fff',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 6,
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: '#080d1a' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white font-bold text-2xl mb-1" style={{ letterSpacing: '-0.01em' }}>
            Criar conta
          </h1>
          {invitation?.agencyName && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Convidado para <span className="text-white font-medium">{invitation.agencyName}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (disabled) */}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Nome *</label>
            <input
              type="text"
              placeholder="O seu nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)',
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label style={labelStyle}>Confirmar password *</label>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Repita a password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Phone (optional) */}
          <div>
            <label style={labelStyle}>Telefone <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(opcional)</span></label>
            <input
              type="tel"
              placeholder="+351 9XX XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> A criar conta...</>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Já tem conta?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 12 }}
          >
            Iniciar sessão
          </button>
        </p>
      </div>
    </div>
  )
}
