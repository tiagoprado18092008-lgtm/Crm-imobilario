import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth.api'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email obrigatório'); return }
    setLoading(true); setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tenta novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 380, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(15,37,83,0.07)' }}>
        <h2 style={{ margin: '0 0 8px', color: '#0f2553', fontSize: 22, fontWeight: 700 }}>Recuperar password</h2>
        {sent ? (
          <>
            <p style={{ color: '#6b7a99', fontSize: 14, marginTop: 12 }}>
              Se o email existir na plataforma, receberás um link de recuperação em breve. Verifica também a caixa de spam.
            </p>
            <Link to="/login" style={{ color: '#0f2553', fontSize: 13, display: 'inline-block', marginTop: 16 }}>← Voltar ao login</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>
              Indica o teu email e enviamos instruções para recuperares o acesso.
            </p>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="o.teu@email.com"
              autoFocus
              style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #dce3ef', fontSize: 13, color: '#0f2553', outline: 'none', background: '#f8f9fc', boxSizing: 'border-box' as const, marginBottom: 16 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: '#0f2553', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'A enviar…' : 'Enviar link de recuperação'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: '#6b7a99', fontSize: 13 }}>← Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
