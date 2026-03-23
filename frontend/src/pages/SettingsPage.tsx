import React, { useEffect, useState } from 'react'
import {
  MessageCircle, Mail, Instagram, Settings,
  AlertCircle, Loader2, Eye, EyeOff, Info, Phone,
} from 'lucide-react'
import { getCommSettings, updateCommSettings, getCommStatus } from '../api/settings.api'

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
      background: status === 'configured' ? '#22c55e' : status === 'demo' ? '#f59e0b' : '#cbd5e1',
      boxShadow: status === 'configured' ? '0 0 0 3px #dcfce7' : status === 'demo' ? '0 0 0 3px #fef3c7' : 'none',
    }}
  />
)

const StatusLabel: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'configured') return <span className="text-xs font-semibold text-emerald-600">Configurado</span>
  if (status === 'demo') return <span className="text-xs font-semibold text-amber-600">Modo Demo</span>
  return <span className="text-xs font-semibold text-slate-400">Não configurado</span>
}

export const SettingsPage: React.FC = () => {
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
  const [crmName, setCrmName] = useState('CRM Imobiliário')
  const [timezone, setTimezone] = useState('Europe/Lisbon')
  const [language, setLanguage] = useState('pt-PT')

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
        if (s.crmName) setCrmName(s.crmName)
        const st = stRes.data || {}
        setStatus({
          whatsapp: st.whatsapp || 'demo',
          email: st.email || 'unconfigured',
          instagram: st.instagram || 'unconfigured',
          phone: st.phone || 'demo',
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
    { key: 'general', label: 'Geral', icon: <Settings size={15} className="text-slate-500" />, status: 'configured' },
  ]

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
        <h2 className="text-xl font-bold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500 mt-1">Configure as integrações de comunicação do CRM</p>
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
                  background: tab === t.key ? '#eff6ff' : 'transparent',
                  color: tab === t.key ? '#1d4ed8' : '#64748b',
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <MessageCircle size={20} style={{ color: '#25d366' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">WhatsApp Business</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.whatsapp} />
                        <StatusLabel status={status.whatsapp} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={wa.whatsappToken}
                        onChange={(e) => setWa({ ...wa, whatsappToken: e.target.value })}
                        placeholder="EAAxxxxxx..."
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number ID</label>
                    <input
                      type="text"
                      value={wa.phoneNumberId}
                      onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })}
                      placeholder="123456789..."
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Verify Token</label>
                    <input
                      type="text"
                      value={wa.verifyToken}
                      onChange={(e) => setWa({ ...wa, verifyToken: e.target.value })}
                      placeholder="meu_verify_token"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
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
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} className="text-blue-500" />
                  <h4 className="text-sm font-semibold text-blue-800">Como obter as credenciais Meta</h4>
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
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                      <Mail size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Email (SMTP)</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.email} />
                        <StatusLabel status={status.email} />
                      </div>
                    </div>
                  </div>
                  {/* Presets */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Pré-configurar:</span>
                    <button
                      onClick={() => setEmail({ ...email, ...GMAIL_PRESET })}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-600"
                    >Gmail</button>
                    <button
                      onClick={() => setEmail({ ...email, ...OUTLOOK_PRESET })}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-600"
                    >Outlook</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Host</label>
                    <input
                      type="text"
                      value={email.smtpHost}
                      onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Porta</label>
                    <input
                      type="text"
                      value={email.smtpPort}
                      onChange={(e) => setEmail({ ...email, smtpPort: e.target.value })}
                      placeholder="587"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={email.smtpUser}
                      onChange={(e) => setEmail({ ...email, smtpUser: e.target.value })}
                      placeholder="utilizador@gmail.com"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={email.smtpPass}
                        onChange={(e) => setEmail({ ...email, smtpPass: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Remetente</label>
                    <input
                      type="text"
                      value={email.fromName}
                      onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
                      placeholder="CRM Imobiliário"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email do Remetente</label>
                    <input
                      type="email"
                      value={email.fromEmail}
                      onChange={(e) => setEmail({ ...email, fromEmail: e.target.value })}
                      placeholder="noreply@empresa.pt"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fce7f3' }}>
                    <Instagram size={20} style={{ color: '#e1306c' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Instagram Messaging</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={status.instagram} />
                      <StatusLabel status={status.instagram} />
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Requer aprovação da Meta para acesso completo à Instagram Messaging API.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Access Token</label>
                    <input
                      type="password"
                      value={ig.accessToken}
                      onChange={(e) => setIg({ ...ig, accessToken: e.target.value })}
                      placeholder="EAAxxxxxx..."
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Page ID</label>
                    <input
                      type="text"
                      value={ig.pageId}
                      onChange={(e) => setIg({ ...ig, pageId: e.target.value })}
                      placeholder="123456789"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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

              <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} className="text-blue-500" />
                  <h4 className="text-sm font-semibold text-blue-800">Como obter acesso à Instagram Graph API</h4>
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
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <Phone size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Twilio Voice (Click-to-Call)</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.phone} />
                        <StatusLabel status={status.phone} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-start gap-2">
                    <Info size={14} style={{ color: '#15803d', marginTop: 2, flexShrink: 0 }} />
                    <p className="text-xs text-green-800">
                      O softphone (botão flutuante verde) funciona em <strong>modo demo</strong> sem credenciais. Com as credenciais Twilio, as chamadas são reais via browser.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Account SID</label>
                    <input
                      type="text"
                      value={twilioAccountSid}
                      onChange={(e) => setTwilioAccountSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Auth Token</label>
                    <div className="relative">
                      <input
                        type={showTwilioToken ? 'text' : 'password'}
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        onClick={() => setShowTwilioToken(!showTwilioToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showTwilioToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Número de Telefone Twilio</label>
                    <input
                      type="text"
                      value={twilioPhoneNumber}
                      onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                      placeholder="+351xxxxxxxxx"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">TwiML App SID <span className="text-slate-400 font-normal">(para chamadas do browser)</span></label>
                    <input
                      type="text"
                      value={twilioTwimlAppSid}
                      onChange={(e) => setTwilioTwimlAppSid(e.target.value)}
                      placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      value={twilioApiKey}
                      onChange={(e) => setTwilioApiKey(e.target.value)}
                      placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">API Secret <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <input
                      type="password"
                      value={twilioApiSecret}
                      onChange={(e) => setTwilioApiSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <p className="text-xs text-slate-400">
                    Adicione estas variáveis ao ficheiro <code className="bg-slate-100 px-1 rounded">backend/.env</code> e reinicie o servidor.
                  </p>
                </div>
              </div>

              {/* How-to guide */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Info size={15} className="text-blue-500" />
                  Como obter um número Twilio
                </h4>
                <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                  <li>Crie uma conta em <strong>twilio.com</strong> (plano gratuito disponível)</li>
                  <li>No dashboard, copie o <strong>Account SID</strong> e <strong>Auth Token</strong></li>
                  <li>Vá a <em>Phone Numbers → Manage → Buy a number</em> e compre um número</li>
                  <li>Para chamadas do browser, crie um <strong>TwiML App</strong> em <em>Voice → TwiML Apps</em></li>
                  <li>No TwiML App, defina a Voice URL para <code className="bg-slate-100 px-1 rounded">https://seu-dominio/webhook/twilio/client</code></li>
                  <li>Opcionalmente, crie uma <strong>API Key</strong> em <em>Account → API Keys</em> para maior segurança</li>
                  <li>Adicione as variáveis ao <code className="bg-slate-100 px-1 rounded">backend/.env</code> e reinicie o servidor</li>
                </ol>
              </div>
            </div>
          )}

          {/* General */}
          {tab === 'general' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100">
                  <Settings size={20} className="text-slate-500" />
                </div>
                <h3 className="font-semibold text-slate-800">Configurações Gerais</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do CRM</label>
                  <input
                    type="text"
                    value={crmName}
                    onChange={(e) => setCrmName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fuso Horário</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white text-slate-700"
                  >
                    <option value="Europe/Lisbon">Europe/Lisbon (UTC+0/+1)</option>
                    <option value="Europe/Madrid">Europe/Madrid (UTC+1/+2)</option>
                    <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Idioma</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white text-slate-700"
                  >
                    <option value="pt-PT">Português (Portugal)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleSave({ crmName, timezone, language })}
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
          )}
        </div>
      </div>
    </div>
  )
}
