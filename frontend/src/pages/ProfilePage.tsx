import React, { useState } from 'react'
import { User, Mail, Phone, Lock, Eye, EyeOff, Save } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import api from '../api/client'

export const ProfilePage: React.FC = () => {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgPw, setMsgPw] = useState('')
  const [error, setError] = useState('')
  const [errorPw, setErrorPw] = useState('')

  const inputStyle = {
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#0f172a',
    transition: 'border-color 150ms',
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setError('')
    try {
      const res = await api.patch(`/users/${user?.id}`, { name: form.name, phone: form.phone })
      const token = localStorage.getItem('crm_token') || ''
      setAuth(res.data, token)
      setMsg('Perfil atualizado com sucesso.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao guardar perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsgPw('')
    setErrorPw('')
    if (passwords.next !== passwords.confirm) {
      setErrorPw('As passwords não coincidem.')
      return
    }
    if (passwords.next.length < 6) {
      setErrorPw('A nova password deve ter pelo menos 6 caracteres.')
      return
    }
    setSavingPw(true)
    try {
      await api.patch(`/users/${user?.id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      })
      setMsgPw('Password alterada com sucesso.')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      setErrorPw(err?.response?.data?.error || 'Erro ao alterar password.')
    } finally {
      setSavingPw(false)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Avatar + nome */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-full text-white text-2xl font-bold"
          style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', flexShrink: 0 }}
        >
          {getInitials(user?.name || '')}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-5">Dados pessoais</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ pointerEvents: 'none' }} />
              <input
                type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ pointerEvents: 'none' }} />
              <input
                type="email" value={user?.email || ''} disabled
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ pointerEvents: 'none' }} />
              <input
                type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+351 910 000 000"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={15} />
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </form>
      </div>

      {/* Alterar password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-5">Alterar password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {(['current', 'next', 'confirm'] as const).map((field, i) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {field === 'current' ? 'Password atual' : field === 'next' ? 'Nova password' : 'Confirmar nova password'}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ pointerEvents: 'none' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={passwords[field]}
                  onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl outline-none"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
                {i === 0 && (
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {msgPw && <p className="text-sm text-green-600">{msgPw}</p>}
          {errorPw && <p className="text-sm text-red-600">{errorPw}</p>}
          <button
            type="submit" disabled={savingPw}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', cursor: savingPw ? 'not-allowed' : 'pointer', opacity: savingPw ? 0.7 : 1 }}
          >
            <Lock size={15} />
            {savingPw ? 'A alterar...' : 'Alterar password'}
          </button>
        </form>
      </div>
    </div>
  )
}
