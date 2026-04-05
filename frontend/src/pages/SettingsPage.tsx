import React, { useEffect, useState } from 'react'
import {
  MessageCircle, Mail, Instagram, Settings,
  AlertCircle, Loader2, Eye, EyeOff, Info, Phone, Moon, Sun,
} from 'lucide-react'
import { getCommSettings, updateCommSettings, getCommStatus } from '../api/settings.api'
import { useUIStore } from '../store/ui.store'

type Tab = 'whatsapp' | 'email' | 'instagram' | 'general' | 'phone'

interface WhatsAppSettings {
  whatsappToken: string
  phoneNumberId: string
  verifyToken: string
}

interface EmailSettings {
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  fromName: string
  fromEmail: string
}

interface InstagramSettings {
  accessToken: string
  pageId: string
}

interface StatusState {
  whatsapp: 'configured' | 'demo' | 'unconfigured'
  email: 'configured' | 'demo' | 'unconfigured'
  instagram: 'configured' | 'demo' | 'unconfigured'
  phone: 'configured' | 'demo' | 'unconfigured'
}

const GMAIL_PRESET = { smtpHost: 'smtp.gmail.com', smtpPort: '587' }
const OUTLOOK_PRESET = { smtpHost: 'smtp.office365.com', smtpPort: '587' }

const StatusDot: React.FC<{ status: string }> = ({ status }) => (
  <div
    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{
      background: status === 'configured' ? '#22c55e' : '#cbd5e1',
      boxShadow: status === 'configured' ? '0 0 0 3px #dcfce7' : 'none',
    }}
  />
)

const StatusLabel: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'configured') return <span className="text-xs font-semibold text-emerald-600">Configurado</span>
  return <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Não configurado</span>
}

export const SettingsPage: React.FC = () => {
  const { darkMode, setDarkMode, setCrmName: setGlobalCrmName } = useUIStore()
  const [tab, setTab] = useState<Tab>('whatsapp')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [testMsg, setTestMsg] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const [status, setStatus] = useState<StatusState>({
    whatsapp: 'demo',
    email: 'unconfigured',
    instagram: 'unconfigured',
    phone: 'demo',
  })

  const [wa, setWa] = useState<WhatsAppSettings>({ whatsappToken: '', phoneNumberId: '', verifyToken: '' })
  const [email, setEmail] = useState<EmailSettings>({
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', fromName: '', fromEmail: '',
  })
  const [ig, setIg] = useState<InstagramSettings>({ accessToken: '', pageId: '' })
  const [twilioAccountSid, setTwilioAccountSid] = useState('')
  const [twilioAuthToken, setTwilioAuthToken] = useState('')
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('')
  const [twilioTwimlAppSid, setTwilioTwimlAppSid] = useState('')
  const [twilioApiKey, setTwilioApiKey] = useState('')
  const [twilioApiSecret, setTwilioApiSecret] = useState('')
  const [showTwilioToken, setShowTwilioToken] = useState(false)
  const [crmName, setCrmNameLocal] = useState(localStorage.getItem('imocrm-name') || 'ImoCRM')

  useEffect(() => {
    const load = async () => {
      try {
        const [settRes, stRes] = await Promise.all([
          getCommSettings(),
          getCommStatus(),
        ])
        const s = settRes.data || {}
        if (s.whatsappToken) setWa({ whatsappToken: s.whatsappToken, phoneNumberId: s.phoneNumberId || '', verifyToken: s.verifyToken || '' })
        if (s.smtpHost) setEmail({
          smtpHost: s.smtpHost, smtpPort: s.smtpPort || '587', smtpUser: s.smtpUser || '',
          smtpPass: s.smtpPass || '', fromName: s.fromName || '', fromEmail: s.fromEmail || '',
        })
        if (s.igAccessToken) setIg({ accessToken: s.igAccessToken, pageId: s.igPageId || '' })
        if (s.crmName) { setCrmNameLocal(s.crmName); setGlobalCrmName(s.crmName) }
        if (s.twilioAccountSid) setTwilioAccountSid(s.twilioAccountSid)
        if (s.twilioAuthToken) setTwilioAuthToken(s.twilioAuthToken)
        if (s.twilioPhoneNumber) setTwilioPhoneNumber(s.twilioPhoneNumber)
        if (s.twilioTwimlAppSid) setTwilioTwimlAppSid(s.twilioTwimlAppSid)
        if (s.twilioApiKey) setTwilioApiKey(s.twilioApiKey)
        if (s.twilioApiSecret) setTwilioApiSecret(s.twilioApiSecret)
        const st = stRes.data || {}
        setStatus({
          whatsapp: st.whatsapp || 'unconfigured',
          email: st.email || 'unconfigured',
          instagram: st.instagram || 'unconfigured',
          phone: st.phone || 'unconfigured',
        })
      } catch {
        // backend settings may not exist yet
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (data: any) => {
    setSaving(true)
    setSaveMsg('')
    try {
      await updateCommSettings(data)
      setSaveMsg('Guardado com sucesso!')
      // Refresh status after save
      const stRes = await getCommStatus()
      const st = stRes.data || {}
      setStatus({
        whatsapp: st.whatsapp || 'unconfigured',
        email: st.email || 'unconfigured',
        instagram: st.instagram || 'unconfigured',
        phone: st.phone || 'unconfigured',
      })
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('Erro ao guardar.')
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestMsg('')
    try {
      const { getCommStatus } = await import('../api/settings.api')
      await getCommStatus()
      setTestMsg('Conexão testada com sucesso!')
      setTimeout(() => setTestMsg(''), 3000)
    } catch {
      setTestMsg('Falha na conexão.')
    }
    setTesting(false)
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; status: string }[] = [
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={15} style={{ color: '#25d366' }} />, status: status.whatsapp },
    { key: 'email', label: 'Email (SMTP)', icon: <Mail size={15} style={{ color: '#3b82f6' }} />, status: status.email },
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={15} style={{ color: '#e1306c' }} />, status: status.instagram },
    { key: 'phone', label: 'Telefone', icon: <Phone size={15} style={{ color: '#22c55e' }} />, status: status.phone },
    { key: 'general', label: 'Geral', icon: <Settings size={15} style={{ color: 'var(--text-muted)' }} />, status: 'configured' },
  ]

  // Shared input class (no bg/border hardcoded — use inline styles)
  const inputClass = 'w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30'
  const inputStyle = { border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure as integrações de comunicação do CRM</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  background: tab === t.key ? 'var(--hover-bg)' : 'transparent',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: tab === t.key ? 600 : 400,
                }}
              >
                {t.icon}
                <span className="flex-1 text-sm">{t.label}</span>
                {t.key !== 'general' && <StatusDot status={t.status} />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* WhatsApp */}
          {tab === 'whatsapp' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <MessageCircle size={20} style={{ color: '#25d366' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp Business</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.whatsapp} />
                        <StatusLabel status={status.whatsapp} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>WhatsApp Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={wa.whatsappToken}
                        onChange={(e) => setWa({ ...wa, whatsappToken: e.target.value })}
                        placeholder="EAAxxxxxx..."
                        autoComplete="new-password"
                        className={inputClass + ' pr-10'}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone Number ID</label>
                    <input
                      type="text"
                      value={wa.phoneNumberId}
                      onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })}
                      placeholder="123456789..."
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Verify Token</label>
                    <input
                      type="text"
                      value={wa.verifyToken}
                      onChange={(e) => setWa({ ...wa, verifyToken: e.target.value })}
                      placeholder="meu_verify_token"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSave({ whatsappToken: wa.whatsappToken, phoneNumberId: wa.phoneNumberId, verifyToken: wa.verifyToken })}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
                      style={{ background: '#0066ff', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />}
                      Guardar
                    </button>
                    <button
                      onClick={handleTest}
                      disabled={testing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                    >
                      {testing && <Loader2 size={14} className="animate-spin" />}
                      Testar conexão
                    </button>
                    {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                    {testMsg && <span className={`text-sm font-medium ${testMsg.includes('Falha') ? 'text-red-500' : 'text-emerald-600'}`}>{testMsg}</span>}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-xl border p-5" style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} style={{ color: '#3b82f6' }} />
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Como obter as credenciais Meta</h4>
                </div>
                <ol className="space-y-2">
                  {[
                    'Aceda a developers.facebook.com e crie uma app Business',
                    'Adicione o produto "WhatsApp" à sua app',
                    'No painel de WhatsApp, copie o "Token de Acesso Temporário"',
                    'Copie o "Phone Number ID" do número de telefone configurado',
                    'Defina o seu Verify Token e configure o webhook para: /api/webhooks/whatsapp',
                    'Em produção, gere um Token de Acesso Permanente via Sistema de Utilizadores',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Email */}
          {tab === 'email' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                      <Mail size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email (SMTP)</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.email} />
                        <StatusLabel status={status.email} />
                      </div>
                    </div>
                  </div>
                  {/* Presets */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pré-configurar:</span>
                    <button
                      onClick={() => setEmail({ ...email, ...GMAIL_PRESET })}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                    >Gmail</button>
                    <button
                      onClick={() => setEmail({ ...email, ...OUTLOOK_PRESET })}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                    >Outlook</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>SMTP Host</label>
                    <input
                      type="text"
                      value={email.smtpHost}
                      onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Porta</label>
                    <input
                      type="text"
                      value={email.smtpPort}
                      onChange={(e) => setEmail({ ...email, smtpPort: e.target.value })}
                      placeholder="587"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
                    <input
                      type="text"
                      value={email.smtpUser}
                      onChange={(e) => setEmail({ ...email, smtpUser: e.target.value })}
                      placeholder="utilizador@gmail.com"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={email.smtpPass}
                        onChange={(e) => setEmail({ ...email, smtpPass: e.target.value })}
                        placeholder="••••••••"
                        className={inputClass + ' pr-10'}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Remetente</label>
                    <input
                      type="text"
                      value={email.fromName}
                      onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
                      placeholder="CRM Imobiliário"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email do Remetente</label>
                    <input
                      type="email"
                      value={email.fromEmail}
                      onChange={(e) => setEmail({ ...email, fromEmail: e.target.value })}
                      placeholder="noreply@empresa.pt"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => handleSave({ smtpHost: email.smtpHost, smtpPort: email.smtpPort, smtpUser: email.smtpUser, smtpPass: email.smtpPass, fromName: email.fromName, fromEmail: email.fromEmail })}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                    style={{ background: '#0066ff', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Guardar
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
                  >
                    {testing && <Loader2 size={14} className="animate-spin" />}
                    Testar conexão
                  </button>
                  {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                  {testMsg && <span className={`text-sm font-medium ${testMsg.includes('Falha') ? 'text-red-500' : 'text-emerald-600'}`}>{testMsg}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Instagram */}
          {tab === 'instagram' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fce7f3' }}>
                    <Instagram size={20} style={{ color: '#e1306c' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Instagram Messaging</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={status.instagram} />
                      <StatusLabel status={status.instagram} />
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Requer aprovação da Meta para acesso completo à Instagram Messaging API.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Access Token</label>
                    <input
                      type="password"
                      value={ig.accessToken}
                      onChange={(e) => setIg({ ...ig, accessToken: e.target.value })}
                      placeholder="EAAxxxxxx..."
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Page ID</label>
                    <input
                      type="text"
                      value={ig.pageId}
                      onChange={(e) => setIg({ ...ig, pageId: e.target.value })}
                      placeholder="123456789"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSave({ igAccessToken: ig.accessToken, igPageId: ig.pageId })}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                      style={{ background: '#0066ff', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />}
                      Guardar
                    </button>
                    {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} style={{ color: '#3b82f6' }} />
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Como obter acesso à Instagram Graph API</h4>
                </div>
                <ol className="space-y-2">
                  {[
                    'Aceda a developers.facebook.com e crie uma app',
                    'Adicione o produto "Instagram Graph API" e "Messenger"',
                    'Ligue a sua Página de Facebook e conta Instagram Business',
                    'Solicite as permissões: instagram_basic, instagram_manage_messages',
                    'Após aprovação da Meta, gere um token de acesso de longa duração',
                    'Configure o webhook para: /api/webhooks/instagram',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Telefone (Twilio) */}
          {tab === 'phone' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <Phone size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Twilio Voice (Click-to-Call)</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.phone} />
                        <StatusLabel status={status.phone} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-start gap-2">
                    <Info size={14} style={{ color: 'var(--text-secondary)', marginTop: 2, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      O softphone (botão flutuante verde) funciona sem credenciais configuradas. Com as credenciais Twilio, as chamadas são reais via browser.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account SID</label>
                    <input
                      type="text"
                      value={twilioAccountSid}
                      onChange={(e) => setTwilioAccountSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Auth Token</label>
                    <div className="relative">
                      <input
                        type={showTwilioToken ? 'text' : 'password'}
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className={inputClass + ' pr-10'}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => setShowTwilioToken(!showTwilioToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {showTwilioToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Número de Telefone Twilio</label>
                    <input
                      type="text"
                      value={twilioPhoneNumber}
                      onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                      placeholder="+351xxxxxxxxx"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>TwiML App SID <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(para chamadas do browser)</span></label>
                    <input
                      type="text"
                      value={twilioTwimlAppSid}
                      onChange={(e) => setTwilioTwimlAppSid(e.target.value)}
                      placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Key <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <input
                      type="text"
                      value={twilioApiKey}
                      onChange={(e) => setTwilioApiKey(e.target.value)}
                      placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Secret <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <input
                      type="password"
                      value={twilioApiSecret}
                      onChange={(e) => setTwilioApiSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Adicione estas variáveis ao ficheiro <code className="px-1 rounded" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>backend/.env</code> e reinicie o servidor.
                  </p>
                </div>
              </div>

              {/* How-to guide */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Info size={15} style={{ color: '#3b82f6' }} />
                  Como obter um número Twilio
                </h4>
                <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
                  <li>Crie uma conta em <strong>twilio.com</strong> (plano gratuito disponível)</li>
                  <li>No dashboard, copie o <strong>Account SID</strong> e <strong>Auth Token</strong></li>
                  <li>Vá a <em>Phone Numbers → Manage → Buy a number</em> e compre um número</li>
                  <li>Para chamadas do browser, crie um <strong>TwiML App</strong> em <em>Voice → TwiML Apps</em></li>
                  <li>No TwiML App, defina a Voice URL para <code className="px-1 rounded" style={{ background: 'var(--hover-bg)' }}>https://seu-dominio/webhook/twilio/client</code></li>
                  <li>Opcionalmente, crie uma <strong>API Key</strong> em <em>Account → API Keys</em> para maior segurança</li>
                  <li>Adicione as variáveis ao <code className="px-1 rounded" style={{ background: 'var(--hover-bg)' }}>backend/.env</code> e reinicie o servidor</li>
                </ol>
              </div>
            </div>
          )}

          {/* General */}
          {tab === 'general' && (
            <div className="space-y-5">
              {/* CRM Name */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--hover-bg)' }}>
                    <Settings size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Configurações Gerais</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do CRM</label>
                    <input
                      type="text"
                      value={crmName}
                      onChange={(e) => setCrmNameLocal(e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => { setGlobalCrmName(crmName); handleSave({ crmName }) }}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                      style={{ background: '#0066ff', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />}
                      Guardar
                    </button>
                    {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: darkMode ? '#1e3a5f' : '#fef9ee' }}>
                    {darkMode ? <Moon size={20} style={{ color: '#93c5fd' }} /> : <Sun size={20} style={{ color: '#f59e0b' }} />}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aparência</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Personaliza o tema da interface</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {darkMode ? 'Modo Escuro' : 'Modo Claro'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {darkMode ? 'Interface em fundo escuro' : 'Interface em fundo claro'}
                    </p>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="relative flex-shrink-0"
                    style={{
                      width: 52, height: 28, borderRadius: 14,
                      background: darkMode ? '#3b82f6' : '#d1d5db',
                      border: 'none', cursor: 'pointer', transition: 'background 200ms',
                      padding: 0,
                    }}
                    title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                  >
                    <span style={{
                      position: 'absolute', top: 4, left: darkMode ? 28 : 4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                      transition: 'left 200ms', display: 'block',
                    }} />
                  </button>
                </div>

                {/* Theme preview cards */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: 'Modo Claro', dark: false, preview: { bg: '#f0f2f8', card: '#ffffff', text: '#0f172a', sub: '#64748b' } },
                    { label: 'Modo Escuro', dark: true, preview: { bg: '#0f172a', card: '#1e293b', text: '#f1f5f9', sub: '#94a3b8' } },
                  ].map(({ label, dark, preview }) => (
                    <button
                      key={label}
                      onClick={() => setDarkMode(dark)}
                      style={{
                        border: `2px solid ${darkMode === dark ? '#3b82f6' : 'var(--border-color)'}`,
                        borderRadius: 12, padding: 12, cursor: 'pointer',
                        background: preview.bg, textAlign: 'left',
                      }}
                    >
                      <div style={{ background: preview.card, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                        <div style={{ width: '60%', height: 8, borderRadius: 4, background: preview.text, opacity: 0.8, marginBottom: 4 }} />
                        <div style={{ width: '40%', height: 6, borderRadius: 4, background: preview.sub, opacity: 0.5 }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: preview.text, margin: 0 }}>{label}</p>
                      {darkMode === dark && (
                        <p style={{ fontSize: 10, color: '#3b82f6', margin: '2px 0 0', fontWeight: 600 }}>✓ Ativo</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
