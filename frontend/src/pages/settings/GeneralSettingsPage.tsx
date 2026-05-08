import React, { useState } from 'react'
import { Settings, User, Lock, Bell, Save, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'
import { updateUser } from '../../api/users.api'
import api from '../../api/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid #dce3ef',
  fontSize: 13, color: '#0f2553', outline: 'none', fontFamily: 'inherit', background: '#f8f9fc',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6b7a99', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em',
}
const sectionStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e9f2', borderRadius: 14, padding: '24px 28px', marginBottom: 20,
}

export const GeneralSettingsPage: React.FC = () => {
  const { user, setAuth } = useAuthStore()
  const { showToast } = useUIStore()
  const token = localStorage.getItem('crm_token') || ''

  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', amiNumber: (user as any)?.amiNumber || '' })
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      const res = await updateUser(user.id, { name: profile.name, phone: profile.phone, amiNumber: profile.amiNumber || undefined })
      setAuth({ ...user, name: profile.name, phone: profile.phone } as any, token)
      showToast('Perfil atualizado.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao guardar.', 'error')
    } finally { setSavingProfile(false) }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPwd !== passwords.confirm) { showToast('As passwords não coincidem.', 'error'); return }
    if (passwords.newPwd.length < 6) { showToast('A password deve ter pelo menos 6 caracteres.', 'error'); return }
    setSavingPwd(true)
    try {
      await api.patch(`/users/${user?.id}/password`, { currentPassword: passwords.current, newPassword: passwords.newPwd })
      showToast('Password alterada com sucesso.', 'success')
      setPasswords({ current: '', newPwd: '', confirm: '' })
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao alterar password.', 'error')
    } finally { setSavingPwd(false) }
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f2553', margin: 0, letterSpacing: '-0.02em' }}>Configurações Gerais</h1>
          <p style={{ fontSize: 13, color: '#6b7a99', margin: 0 }}>Perfil e preferências da conta</p>
        </div>
      </div>

      {/* Profile */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <User size={15} style={{ color: '#6366f1' }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: 0 }}>Informações pessoais</h2>
        </div>
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input style={inputStyle} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = '#dce3ef')} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+351 91..."
                onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = '#dce3ef')} />
            </div>
            <div>
              <label style={labelStyle}>Número AMI</label>
              <input style={inputStyle} value={profile.amiNumber} onChange={e => setProfile(p => ({ ...p, amiNumber: e.target.value }))} placeholder="ex: 12345"
                onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = '#dce3ef')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={{ ...inputStyle, background: '#f1f5f9', color: '#6b7a99', cursor: 'not-allowed' }} value={profile.email} readOnly />
            <p style={{ fontSize: 11, color: '#6b7a99', margin: '5px 0 0' }}>O email não pode ser alterado.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={savingProfile} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: savingProfile ? '#a5b4fc' : '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: savingProfile ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              <Save size={13} />{savingProfile ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Lock size={15} style={{ color: '#6366f1' }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f2553', margin: 0 }}>Alterar password</h2>
        </div>
        {user?.googleId && !user?.passwordHash ? (
          <p style={{ fontSize: 13, color: '#6b7a99', background: '#f8f9fc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e9f2' }}>
            A sua conta usa login com Google. Não é possível definir uma password.
          </p>
        ) : (
          <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Password atual</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} required value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = '#dce3ef')} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7a99', display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nova password</label>
                <input type={showPwd ? 'text' : 'password'} required minLength={6} value={passwords.newPwd} onChange={e => setPasswords(p => ({ ...p, newPwd: e.target.value }))}
                  style={inputStyle} onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = '#dce3ef')} />
              </div>
              <div>
                <label style={labelStyle}>Confirmar nova password</label>
                <input type={showPwd ? 'text' : 'password'} required value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                  style={{ ...inputStyle, borderColor: passwords.confirm && passwords.confirm !== passwords.newPwd ? '#ef4444' : '#dce3ef' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')} onBlur={e => (e.target.style.borderColor = passwords.confirm !== passwords.newPwd ? '#ef4444' : '#dce3ef')} />
              </div>
            </div>
            {passwords.confirm && passwords.confirm !== passwords.newPwd && (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>As passwords não coincidem.</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingPwd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: savingPwd ? '#a5b4fc' : '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: savingPwd ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                <Lock size={13} />{savingPwd ? 'A alterar...' : 'Alterar password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
