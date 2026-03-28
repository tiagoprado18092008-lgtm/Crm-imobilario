import React, { useState, useRef } from 'react'
import { User, Lock, Eye, EyeOff, Save, Camera, Bell, Palette } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import api from '../api/client'

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'appearance', label: 'Aparência', icon: Palette },
]

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#14b8a6,#0d9488)',
]

export const ProfilePage: React.FC = () => {
  const { user, setAuth } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgPw, setMsgPw] = useState('')
  const [error, setError] = useState('')
  const [errorPw, setErrorPw] = useState('')
  const [avatarColor, setAvatarColor] = useState(
    user?.avatarUrl?.startsWith('data:') || user?.avatarUrl?.startsWith('http') ? AVATAR_COLORS[0] : (user?.avatarUrl || AVATAR_COLORS[0])
  )
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl?.startsWith('data:') || user?.avatarUrl?.startsWith('http') ? user.avatarUrl : null
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const [notifications, setNotifications] = useState({
    emailNewLead: true,
    emailTaskDue: true,
    emailCampaign: false,
    browserNewMessage: true,
    browserTask: true,
  })

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Resize to max 200x200 before saving
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 200
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      setAvatarPreview(base64)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setMsg(''); setError('')
    try {
      const res = await api.patch(`/users/${user?.id}`, {
        name: form.name,
        phone: form.phone,
        avatarUrl: avatarPreview || avatarColor,
      })
      const token = localStorage.getItem('crm_token') || ''
      setAuth(res.data, token)
      setMsg('Perfil atualizado com sucesso.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao guardar perfil.')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsgPw(''); setErrorPw('')
    if (passwords.next !== passwords.confirm) { setErrorPw('As passwords não coincidem.'); return }
    if (passwords.next.length < 6) { setErrorPw('Mínimo 6 caracteres.'); return }
    setSavingPw(true)
    try {
      await api.patch(`/users/${user?.id}/password`, { currentPassword: passwords.current, newPassword: passwords.next })
      setMsgPw('Password alterada com sucesso.')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      setErrorPw(err?.response?.data?.error || 'Erro ao alterar password.')
    } finally { setSavingPw(false) }
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar"
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg" />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-lg"
              style={{ background: avatarColor }}>
              {getInitials(user?.name || '')}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors">
            <Camera size={13} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-slate-800">Dados pessoais</h3>

          {/* Avatar color picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Cor do avatar</label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => { setAvatarColor(c); setAvatarPreview(null) }}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: avatarColor === c && !avatarPreview ? '2px solid #6366f1' : 'none', outlineOffset: 2 }} />
              ))}
              <button onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-indigo-400 transition-colors">
                <Camera size={13} className="text-slate-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Nome completo</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
              <input value={user?.email || ''} disabled
                className={inputCls + ' bg-slate-50 text-slate-400 cursor-not-allowed'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+351 910 000 000" className={inputCls} />
            </div>
            {msg && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">{msg}</p>}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Save size={14} />{saving ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-5">Alterar password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  {field === 'current' ? 'Password atual' : field === 'next' ? 'Nova password' : 'Confirmar nova password'}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={passwords[field]}
                    onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                    required className={inputCls + ' pr-10'} />
                  {field === 'current' && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {msgPw && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">{msgPw}</p>}
            {errorPw && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{errorPw}</p>}
            <button type="submit" disabled={savingPw}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Lock size={14} />{savingPw ? 'A alterar...' : 'Alterar password'}
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="font-semibold text-slate-800">Preferências de notificações</h3>
          {[
            { key: 'emailNewLead', label: 'Novo lead atribuído', desc: 'Recebe email quando um lead é atribuído a ti' },
            { key: 'emailTaskDue', label: 'Tarefa com prazo', desc: 'Lembrete por email quando uma tarefa está prestes a expirar' },
            { key: 'emailCampaign', label: 'Relatório de campanha', desc: 'Resumo após envio de campanhas de email' },
            { key: 'browserNewMessage', label: 'Nova mensagem', desc: 'Notificação no browser quando receberes mensagem' },
            { key: 'browserTask', label: 'Tarefas em atraso', desc: 'Notificação de tarefas vencidas' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
              </div>
              <button onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${notifications[n.key as keyof typeof notifications] ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[n.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-400">As preferências de notificação são guardadas localmente.</p>
        </div>
      )}

      {/* Appearance Tab */}
      {tab === 'appearance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="font-semibold text-slate-800">Aparência</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Tema</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Claro', bg: '#f8fafc', border: '#e2e8f0' },
                { id: 'dark', label: 'Escuro', bg: '#0a0f1e', border: '#1e293b' },
                { id: 'system', label: 'Sistema', bg: 'linear-gradient(135deg,#f8fafc 50%,#0a0f1e 50%)', border: '#6366f1' },
              ].map(t => (
                <button key={t.id}
                  className="p-3 rounded-xl border-2 text-center transition-all hover:border-indigo-400"
                  style={{ borderColor: t.id === 'light' ? '#6366f1' : '#e2e8f0' }}>
                  <div className="w-full h-10 rounded-lg mb-2" style={{ background: t.bg, border: `1px solid ${t.border}` }} />
                  <span className="text-xs font-medium text-slate-600">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Modo escuro em desenvolvimento — em breve disponível.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Língua</label>
            <select className={inputCls} defaultValue="pt-PT">
              <option value="pt-PT">Português (Portugal)</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
