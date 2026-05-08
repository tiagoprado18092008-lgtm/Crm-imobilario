import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword } from '../api/auth.api'

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('A password deve ter pelo menos 6 caracteres'); return }
    if (password !== confirm) { setError('As passwords não coincidem'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Link inválido ou expirado.')
    } finally { setLoading(false) }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #dce3ef',
    fontSize: 13, color: '#0f2553', outline: 'none', background: '#f8f9fc', boxSizing: 'border-box',
  }

  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
      <div style={{ textAlign: 'center', color: '#6b7a99' }}>
        <p>Link inválido ou em falta.</p>
        <Link to="/login" style={{ color: '#0f2553', fontWeight: 600 }}>← Voltar ao login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 380, background: '#fff', border: '1px solid #e5e9f2', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(15,37,83,0.07)' }}>
        <h2 style={{ margin: '0 0 8px', color: '#0f2553', fontSize: 22, fontWeight: 700 }}>Nova password</h2>
        {done ? (
          <p style={{ color: '#16a34a', fontSize: 14, marginTop: 12 }}>Password alterada com sucesso! A redirecionar…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>Escolhe uma nova password para a tua conta.</p>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Nova password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputSt} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Confirmar password
              </label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputSt} />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: '#0f2553', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'A guardar…' : 'Guardar nova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
