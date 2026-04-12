import React, { useState, useRef } from 'react'
import { User, Lock, Eye, EyeOff, Save, Camera, Bell, Palette } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useUIStore } from '../store/ui.store'
import api from '../api/client'
import { CustomSelect } from '../components/ui/CustomSelect'

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
  const { darkMode, setDarkMode } = useUIStore()
  const [language, setLanguage] = useState(localStorage.getItem('imocrm-lang') || 'pt-PT')
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--input-border)',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar"
              className="w-20 h-20 rounded-full object-cover shadow-lg"
              style={{ outline: '4px solid var(--bg-card)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ background: avatarColor, outline: '4px solid var(--bg-card)' }}>
              {getInitials(user?.name || '')}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-colors"
            style={{ background: '#6366f1' }}>
            <Camera size={13} style={{ color: '#fff' }} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: 'var(--bg-page)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dados pessoais</h3>

          {/* Avatar color picker */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cor do avatar</label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => { setAvatarColor(c); setAvatarPreview(null) }}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: avatarColor === c && !avatarPreview ? '2px solid #6366f1' : 'none', outlineOffset: 2 }} />
              ))}
              <button onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ border: '2px dashed var(--border-color)' }}>
                <Camera size={13} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Nome completo</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={inputStyle} required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input value={user?.email || ''} disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+351 910 000 000" style={inputStyle} />
            </div>
            {msg && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">{msg}</p>}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <Save size={14} />{saving ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Alterar password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  {field === 'current' ? 'Password atual' : field === 'next' ? 'Nova password' : 'Confirmar nova password'}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={passwords[field]}
                    onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                    required style={{ ...inputStyle, paddingRight: field === 'current' ? 40 : undefined }} />
                  {field === 'current' && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', cursor: savingPw ? 'not-allowed' : 'pointer' }}>
              <Lock size={14} />{savingPw ? 'A alterar...' : 'Alterar password'}
            </button>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="rounded-2xl p-6 space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Preferências de notificações</h3>
          {[
            { key: 'emailNewLead', label: 'Novo lead atribuído', desc: 'Recebe email quando um lead é atribuído a ti' },
            { key: 'emailTaskDue', label: 'Tarefa com prazo', desc: 'Lembrete por email quando uma tarefa está prestes a expirar' },
            { key: 'emailCampaign', label: 'Relatório de campanha', desc: 'Resumo após envio de campanhas de email' },
            { key: 'browserNewMessage', label: 'Nova mensagem', desc: 'Notificação no browser quando receberes mensagem' },
            { key: 'browserTask', label: 'Tarefas em atraso', desc: 'Notificação de tarefas vencidas' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
              </div>
              <button onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                className="w-11 h-6 rounded-full transition-colors relative"
                style={{ background: notifications[n.key as keyof typeof notifications] ? '#6366f1' : 'var(--border-color)', border: 'none', cursor: 'pointer' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform"
                  style={{
                    background: 'var(--bg-card)',
                    transform: notifications[n.key as keyof typeof notifications] ? 'translateX(20px)' : 'translateX(2px)',
                  }} />
              </button>
            </div>
          ))}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>As preferências de notificação são guardadas localmente.</p>
        </div>
      )}

      {/* Appearance Tab */}
      {tab === 'appearance' && (
        <div className="rounded-2xl p-6 space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aparência</h3>
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tema</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'light', label: 'Modo Claro', bg: '#f8fafc', border: '#e2e8f0', active: !darkMode },
                { id: 'dark', label: 'Modo Escuro', bg: '#0a0f1e', border: '#1e293b', active: darkMode },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setDarkMode(t.id === 'dark')}
                  className="p-3 rounded-xl border-2 text-center transition-all"
                  style={{ borderColor: t.active ? '#c9a84c' : 'var(--border-color)', background: 'var(--bg-card)' }}>
                  <div className="w-full h-10 rounded-lg mb-2" style={{ background: t.bg, border: `1px solid ${t.border}` }} />
                  <span className="text-xs font-semibold" style={{ color: t.active ? '#c9a84c' : 'var(--text-secondary)' }}>{t.label}</span>
                  {t.active && <span className="block text-xs mt-0.5" style={{ color: '#22c55e' }}>✓ Ativo</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Língua</label>
            <CustomSelect
              value={language}
              onChange={(val) => {
                setLanguage(val)
                localStorage.setItem('imocrm-lang', val)
              }}
              options={[
                { value: 'pt-PT', label: 'Português (Portugal)' },
                { value: 'pt-BR', label: 'Português (Brasil)' },
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}
