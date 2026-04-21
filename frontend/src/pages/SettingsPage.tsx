import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  MessageCircle, Mail, Instagram, Settings,
  AlertCircle, Loader2, Eye, EyeOff, Info, Phone, Moon, Sun,
  Plus, Search, Trash2, Edit2, Check, X, Globe, Mic, MessageSquare, Calendar,
  BookOpen, Copy, ExternalLink, Zap, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCommSettings, updateCommSettings, getCommStatus, triggerTwilioSetup, testWhatsApp, testEmail, testTwilio } from '../api/settings.api'
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp as disconnectWA } from '../api/whatsapp.api'
import { listNumbers, searchNumbers, purchaseNumber, releaseNumber, updateNumber } from '../api/phone-numbers.api'
import { useUIStore } from '../store/ui.store'

const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Austrália' },
]

type Tab = 'whatsapp' | 'email' | 'instagram' | 'general' | 'phone' | 'guide'

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
  igVerifyToken: string
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

// ─── GuidePanel ───────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title="Copiar"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? '#22c55e' : 'var(--text-muted)',
        padding: '2px 4px', borderRadius: 4, flexShrink: 0,
        display: 'flex', alignItems: 'center',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

const WebhookRow: React.FC<{ label: string; path: string }> = ({ label, path }) => {
  const [open, setOpen] = React.useState(false)
  const base = typeof window !== 'undefined'
    ? (window.location.origin.includes('localhost') ? 'https://SEU-DOMINIO.com' : window.location.origin.replace(':5173', ':3000'))
    : 'https://SEU-DOMINIO.com'
  const url = `${base}${path}`
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)', fontWeight: 600, fontSize: 13,
        }}
      >
        <span>{label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)' }}>
          <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', wordBreak: 'break-all' }}>{url}</code>
          <CopyButton text={url} />
        </div>
      )}
    </div>
  )
}

const GuidePanel: React.FC<{ status: any; onNavigate: (tab: any) => void }> = ({ status, onNavigate }) => {
  const channels = [
    {
      key: 'whatsapp',
      label: 'WhatsApp Business',
      color: '#25d366',
      bg: '#dcfce7',
      icon: '💬',
      steps: [
        { text: 'Acede a', link: { label: 'developers.facebook.com', href: 'https://developers.facebook.com' }, after: ' e cria uma App Business.' },
        { text: 'Adiciona o produto "WhatsApp" à App.' },
        { text: 'Em WhatsApp > Configuração, copia o Token de Acesso Temporário e o Phone Number ID.' },
        { text: 'Define o Verify Token (qualquer texto secreto teu).' },
        { text: 'No Meta, configura o Webhook URL:', webhook: '/webhook/whatsapp' },
        { text: 'Subscrive ao evento: messages.' },
        { text: 'Guarda as credenciais na aba "WhatsApp" ao lado.' },
        { text: 'Usa "Testar conexão" para confirmar.' },
      ],
    },
    {
      key: 'email',
      label: 'Email (SMTP + IMAP)',
      color: 'var(--accent)',
      bg: '#dbeafe',
      icon: '✉️',
      steps: [
        { text: 'Para Gmail: ativa a autenticação em 2 passos e cria uma', link: { label: 'App Password', href: 'https://myaccount.google.com/apppasswords' }, after: '.' },
        { text: 'Para Outlook: usa smtp.office365.com na porta 587 com as tuas credenciais normais.' },
        { text: 'Preenche SMTP Host, Port, User, Password e o nome do remetente.' },
        { text: 'Para receber emails (IMAP): preenche o .env com IMAP_HOST, IMAP_USER e IMAP_PASS — o CRM vai verificar novos emails a cada 60 segundos.' },
        { text: 'Gmail IMAP: imap.gmail.com porta 993 | Outlook: outlook.office365.com porta 993.' },
        { text: 'Guarda e clica em "Testar conexão".' },
      ],
    },
    {
      key: 'instagram',
      label: 'Instagram Messaging',
      color: '#e1306c',
      bg: '#fce7f3',
      icon: '📸',
      steps: [
        { text: 'Precisas de uma conta Instagram Business ligada a uma Página de Facebook.' },
        { text: 'Acede a', link: { label: 'developers.facebook.com', href: 'https://developers.facebook.com' }, after: ' e cria uma App.' },
        { text: 'Adiciona "Instagram Graph API" e "Messenger".' },
        { text: 'Solicita as permissões: instagram_basic, instagram_manage_messages.' },
        { text: 'Após aprovação da Meta, gera um token de acesso de longa duração e copia o Page ID.' },
        { text: 'Define o Verify Token do Instagram (diferente do WhatsApp).' },
        { text: 'No Meta, configura o Webhook URL:', webhook: '/webhook/instagram' },
        { text: 'Subscrive ao evento: messages.' },
        { text: 'Guarda as credenciais na aba "Instagram" ao lado.' },
      ],
    },
    {
      key: 'phone',
      label: 'SMS e Chamadas (Twilio)',
      color: 'var(--accent)',
      bg: '#ede9fe',
      icon: '📞',
      steps: [
        { text: 'Cria uma conta em', link: { label: 'twilio.com', href: 'https://www.twilio.com' }, after: '.' },
        { text: 'No painel Twilio, copia o Account SID e Auth Token.' },
        { text: 'Preenche a URL Pública do Servidor (ex: https://meucrm.com).' },
        { text: 'Guarda as credenciais na aba "Telefone" — o CRM vai criar automaticamente a TwiML App e API Key.' },
        { text: 'Compra um número de telefone na secção "Números Comprados".' },
        { text: 'Para SMS inbound, o Twilio vai usar o webhook:', webhook: '/webhook/twilio/sms' },
        { text: 'Para chamadas inbound:', webhook: '/webhook/twilio/inbound-call' },
        { text: 'Usa "Testar conexão" para confirmar.' },
      ],
    },
  ]

  const allConfigured = Object.values(status).every((s: any) => s === 'configured')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fef9ee' }}>
            <Zap size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Guia de Configuração de Canais</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Segue estas instruções para ligar cada canal de comunicação</p>
          </div>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'whatsapp', label: 'WhatsApp', color: '#25d366' },
            { key: 'email', label: 'Email', color: 'var(--accent)' },
            { key: 'instagram', label: 'Instagram', color: '#e1306c' },
            { key: 'phone', label: 'Telefone', color: 'var(--accent)' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => onNavigate(c.key as any)}
              className="flex items-center justify-between p-3 rounded-xl transition-all"
              style={{
                border: `1px solid ${status[c.key] === 'configured' ? c.color + '40' : 'var(--border)'}`,
                background: status[c.key] === 'configured' ? c.color + '10' : 'var(--surface-3)',
                cursor: 'pointer',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: status[c.key] === 'configured' ? '#22c55e' : '#cbd5e1' }} />
                <span className="text-xs font-semibold" style={{ color: status[c.key] === 'configured' ? '#22c55e' : 'var(--text-muted)' }}>
                  {status[c.key] === 'configured' ? 'Configurado' : 'Por configurar'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {allConfigured && (
          <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
            <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>Todos os canais configurados! O CRM está 100% operacional.</p>
          </div>
        )}
      </div>

      {/* Step-by-step per channel */}
      {channels.map(ch => (
        <div key={ch.key} className="rounded-xl border shadow-sm overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: ch.bg + '30' }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20 }}>{ch.icon}</span>
              <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{ch.label}</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: status[ch.key] === 'configured' ? '#22c55e' : '#cbd5e1' }} />
              <span className="text-xs font-semibold" style={{ color: status[ch.key] === 'configured' ? '#22c55e' : 'var(--text-muted)' }}>
                {status[ch.key] === 'configured' ? 'Configurado' : 'Por configurar'}
              </span>
              <button
                onClick={() => onNavigate(ch.key as any)}
                className="flex items-center gap-1 ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: ch.color, border: 'none', cursor: 'pointer' }}
              >
                Configurar <ExternalLink size={10} />
              </button>
            </div>
          </div>

          <div className="p-5">
            <ol className="space-y-3">
              {ch.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: ch.bg, color: ch.color }}
                  >{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {step.text}{' '}
                      {step.link && (
                        <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="font-medium" style={{ color: ch.color }}>
                          {step.link.label}
                        </a>
                      )}
                      {step.after}
                    </span>
                    {step.webhook && <WebhookRow label="URL do Webhook" path={step.webhook} />}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ))}

      {/* IMAP note */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-2">
          <Info size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <strong>Nota sobre IMAP (receção de emails):</strong> As credenciais IMAP (IMAP_HOST, IMAP_USER, IMAP_PASS, IMAP_PORT) são configuradas diretamente no ficheiro <code>.env</code> do servidor. O CRM verifica automaticamente novos emails a cada 60 segundos e cria conversas para cada mensagem recebida.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { darkMode, setDarkMode, setCrmName: setGlobalCrmName, showToast } = useUIStore()
  const [tab, setTab] = useState<Tab>(() => {
    const p = new URLSearchParams(window.location.search).get('tab')
    return (p as Tab) || 'whatsapp'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [twilioSetupRunning, setTwilioSetupRunning] = useState(false)
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({})
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } | null }>({})
  const [saveMsg, setSaveMsg] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const [status, setStatus] = useState<StatusState>({
    whatsapp: 'demo',
    email: 'unconfigured',
    instagram: 'unconfigured',
    phone: 'demo',
  })

  const [wa, setWa] = useState<WhatsAppSettings>({ whatsappToken: '', phoneNumberId: '', verifyToken: '' })

  // WhatsApp QR / Baileys state
  const [waQrStatus, setWaQrStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED')
  const [waQrPhone, setWaQrPhone] = useState<string | null>(null)
  const [waQrImage, setWaQrImage] = useState<string | null>(null)
  const [waQrLoading, setWaQrLoading] = useState(false)
  const waSSERef = useRef<EventSource | null>(null)
  const [email, setEmail] = useState<EmailSettings>({
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', fromName: '', fromEmail: '',
  })
  const [ig, setIg] = useState<InstagramSettings>({ accessToken: '', pageId: '', igVerifyToken: '' })
  const [twilioAccountSid, setTwilioAccountSid] = useState('')
  const [twilioAuthToken, setTwilioAuthToken] = useState('')
  const [twilioSidSaved, setTwilioSidSaved] = useState(false)
  const [twilioTokenSaved, setTwilioTokenSaved] = useState(false)
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('')
  const [twilioTwimlAppSid, setTwilioTwimlAppSid] = useState('')
  const [twilioApiKey, setTwilioApiKey] = useState('')
  const [twilioApiSecret, setTwilioApiSecret] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [showTwilioToken, setShowTwilioToken] = useState(false)
  const [crmName, setCrmNameLocal] = useState(localStorage.getItem('imocrm-name') || 'CasaFlow')

  // Phone numbers (Twilio)
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(false)
  const [showNumberSearch, setShowNumberSearch] = useState(false)
  const [numberSearchLoading, setNumberSearchLoading] = useState(false)
  const [numberSearchResults, setNumberSearchResults] = useState<any[]>([])
  const [numberSearchCountry, setNumberSearchCountry] = useState('US')
  const [numberSearchAreaCode, setNumberSearchAreaCode] = useState('')
  const [numberSearchType, setNumberSearchType] = useState('')
  const [numberPurchasing, setNumberPurchasing] = useState<string | null>(null)
  const [numberEditId, setNumberEditId] = useState<string | null>(null)
  const [numberEditName, setNumberEditName] = useState('')
  const [numberError, setNumberError] = useState('')

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
        if (s.igAccessToken) setIg({ accessToken: s.igAccessToken, pageId: s.igPageId || '', igVerifyToken: s.igVerifyToken || '' })
        if (s.crmName) { setCrmNameLocal(s.crmName); setGlobalCrmName(s.crmName) }
        // Don't pre-fill masked values — show empty input with placeholder instead
        if (s.twilioAccountSid) { if (s.twilioAccountSid.startsWith('*')) setTwilioSidSaved(true); else setTwilioAccountSid(s.twilioAccountSid) }
        if (s.twilioAuthToken) { if (s.twilioAuthToken.startsWith('*')) setTwilioTokenSaved(true); else setTwilioAuthToken(s.twilioAuthToken) }
        if (s.twilioPhoneNumber) setTwilioPhoneNumber(s.twilioPhoneNumber)
        if (s.twilioTwimlAppSid) setTwilioTwimlAppSid(s.twilioTwimlAppSid)
        if (s.twilioApiKey) setTwilioApiKey(s.twilioApiKey)
        if (s.twilioApiSecret) setTwilioApiSecret(s.twilioApiSecret)
        if (s.publicUrl) setPublicUrl(s.publicUrl)
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

  const fetchPhoneNumbers = useCallback(async () => {
    setPhoneNumbersLoading(true)
    try {
      const res = await listNumbers()
      setPhoneNumbers(res.data)
    } catch { } finally { setPhoneNumbersLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'phone') fetchPhoneNumbers()
  }, [tab, fetchPhoneNumbers])

  useEffect(() => {
    getWhatsAppStatus().then(r => {
      setWaQrStatus(r.data.status as any)
      setWaQrPhone(r.data.phone)
    }).catch(() => {})
  }, [])

  const startWaPolling = () => {
    if (waSSERef.current) clearInterval(waSSERef.current as any)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const r = await getWhatsAppStatus()
        const { status, phone, qr } = r.data as any
        if (qr && status !== 'CONNECTED') {
          setWaQrImage(qr)
          setWaQrStatus('CONNECTING')
          setWaQrLoading(false)
        }
        if (status === 'CONNECTED') {
          setWaQrImage(null)
          setWaQrStatus('CONNECTED')
          setWaQrPhone(phone)
          setWaQrLoading(false)
          clearInterval(interval)
          waSSERef.current = null
        }
      } catch {}
      if (attempts >= 20) { // 20 * 3s = 60s timeout
        clearInterval(interval)
        waSSERef.current = null
        setWaQrLoading(false)
      }
    }, 3000)
    waSSERef.current = interval as any
  }

  const handleWaConnect = async () => {
    setWaQrLoading(true)
    setWaQrImage(null)
    try {
      await connectWhatsApp()
      startWaPolling()
    } catch (err: any) {
      setWaQrLoading(false)
      showToast(err?.response?.data?.error || 'Erro ao ligar WhatsApp', 'error')
    }
  }

  const handleWaDisconnect = async () => {
    if (waSSERef.current) { clearInterval(waSSERef.current as any); waSSERef.current = null }
    await disconnectWA()
    setWaQrStatus('DISCONNECTED')
    setWaQrPhone(null)
    setWaQrImage(null)
  }

  const handleNumberSearch = async () => {
    setNumberSearchLoading(true)
    setNumberError('')
    try {
      const res = await searchNumbers(numberSearchCountry, numberSearchAreaCode || undefined, numberSearchType || undefined)
      setNumberSearchResults(res.data)
    } catch (e: any) {
      setNumberError(e.response?.data?.error || 'Erro ao pesquisar. Verifica as credenciais Twilio.')
    } finally { setNumberSearchLoading(false) }
  }

  const handleNumberPurchase = async (num: any) => {
    setNumberPurchasing(num.phoneNumber)
    setNumberError('')
    try {
      await purchaseNumber(num.phoneNumber, num.friendlyName || num.phoneNumber)
      await fetchPhoneNumbers()
      setShowNumberSearch(false)
      setNumberSearchResults([])
    } catch (e: any) {
      setNumberError(e.response?.data?.error || 'Erro ao comprar número')
    } finally { setNumberPurchasing(null) }
  }

  const handleNumberRelease = async (id: string) => {
    if (!confirm('Tens a certeza que queres libertar este número? Esta ação não pode ser desfeita.')) return
    try {
      await releaseNumber(id)
      setPhoneNumbers(n => n.filter(x => x.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao libertar número')
    }
  }

  const handleNumberEdit = async (id: string) => {
    try {
      await updateNumber(id, numberEditName)
      setPhoneNumbers(n => n.map(x => x.id === id ? { ...x, friendlyName: numberEditName } : x))
      setNumberEditId(null)
    } catch { }
  }

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
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao guardar.'
      setSaveMsg('Erro: ' + msg)
    }
    setSaving(false)
  }

  const handleTwilioSetup = async () => {
    setTwilioSetupRunning(true)
    setSaveMsg('')
    try {
      await triggerTwilioSetup()
      setSaveMsg('✓ Chamadas pelo browser configuradas!')
      // Reload settings to show updated state
      const res = await getCommSettings()
      const s = res.data || {}
      if (s.twilioTwimlAppSid) setTwilioTwimlAppSid(s.twilioTwimlAppSid)
      if (s.twilioApiKey) setTwilioApiKey(s.twilioApiKey)
      if (s.twilioApiSecret) setTwilioApiSecret(s.twilioApiSecret)
      setTimeout(() => setSaveMsg(''), 4000)
    } catch (err: any) {
      setSaveMsg('Erro: ' + (err?.response?.data?.message || err?.message || 'Falha no auto-setup.'))
    }
    setTwilioSetupRunning(false)
  }

  const handleTest = async (section: 'whatsapp' | 'email' | 'twilio', fn: () => Promise<any>) => {
    setTesting(t => ({ ...t, [section]: true }))
    setTestResult(r => ({ ...r, [section]: null }))
    try {
      const res = await fn()
      const message = res?.data?.message || 'Conexão testada com sucesso!'
      setTestResult(r => ({ ...r, [section]: { success: true, message } }))
      setTimeout(() => setTestResult(r => ({ ...r, [section]: null })), 5000)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha na conexão.'
      setTestResult(r => ({ ...r, [section]: { success: false, message } }))
    }
    setTesting(t => ({ ...t, [section]: false }))
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; status: string }[] = [
    { key: 'guide', label: 'Guia de Início', icon: <BookOpen size={15} style={{ color: '#f59e0b' }} />, status: 'configured' },
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={15} style={{ color: '#25d366' }} />, status: status.whatsapp },
    { key: 'email', label: 'Email (SMTP)', icon: <Mail size={15} style={{ color: 'var(--accent)' }} />, status: status.email },
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={15} style={{ color: '#e1306c' }} />, status: status.instagram },
    { key: 'phone', label: 'Telefone', icon: <Phone size={15} style={{ color: '#22c55e' }} />, status: status.phone },
    { key: 'general', label: 'Geral', icon: <Settings size={15} style={{ color: 'var(--text-muted)' }} />, status: 'configured' },
  ]

  // Shared input class (no bg/border hardcoded — use inline styles)
  const inputClass = 'w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30'
  const inputStyle = { border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }

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
                  background: tab === t.key ? 'var(--surface-3)' : 'transparent',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: tab === t.key ? 600 : 400,
                }}
              >
                {t.icon}
                <span className="flex-1 text-sm">{t.label}</span>
                {t.key !== 'general' && t.key !== 'guide' && <StatusDot status={t.status} />}
              </button>
            ))}
            <Link
              to="/calendar/settings"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 400,
                textDecoration: 'none',
                display: 'flex',
              }}
            >
              <Calendar size={15} style={{ color: '#10b981' }} />
              <span className="flex-1 text-sm">Calendário</span>
            </Link>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Guia de Início */}
          {tab === 'guide' && <GuidePanel status={status} onNavigate={setTab} />}

          {/* WhatsApp */}
          {tab === 'whatsapp' && (
            <div className="space-y-5">
              {/* WhatsApp QR / Baileys */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                    <MessageCircle size={20} style={{ color: '#25d366' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp via QR Code</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Liga o teu WhatsApp pessoal ou de empresa sem precisar da API da Meta</p>
                  </div>
                </div>

                {waQrStatus === 'CONNECTED' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Ligado{waQrPhone ? ` — +${waQrPhone}` : ''}</span>
                    </div>
                    <button
                      onClick={handleWaDisconnect}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <X size={13} /> Desligar
                    </button>
                  </div>
                ) : waQrImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Abre o WhatsApp no telemóvel → Dispositivos ligados → Ligar dispositivo → Lê o QR</p>
                    <img src={waQrImage} alt="WhatsApp QR Code" style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid var(--border)' }} />
                  </div>
                ) : (
                  <button
                    onClick={handleWaConnect}
                    disabled={waQrLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                    style={{ background: '#25d366', opacity: waQrLoading ? 0.7 : 1, border: 'none', cursor: waQrLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {waQrLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    {waQrLoading ? 'A gerar QR code...' : 'Ligar com QR Code'}
                  </button>
                )}
              </div>

              {/* Credenciais */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                      <MessageCircle size={20} style={{ color: '#25d366' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp Business API</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status.whatsapp} />
                        <StatusLabel status={status.whatsapp} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Token */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Token de Acesso
                      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>— começa por EAAxx...</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={wa.whatsappToken}
                        onChange={(e) => setWa({ ...wa, whatsappToken: e.target.value })}
                        placeholder={status.whatsapp === 'configured' ? '••••••••••••••••••••' : 'EAAxxxxxx...'}
                        autoComplete="new-password"
                        className={inputClass + ' pr-10'}
                        style={inputStyle}
                      />
                      <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Phone Number ID */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Phone Number ID
                      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>— número no painel Meta</span>
                    </label>
                    <input
                      type="text"
                      value={wa.phoneNumberId}
                      onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })}
                      placeholder={status.whatsapp === 'configured' ? '••••••••••' : '123456789012345'}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  {/* Verify Token */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Verify Token
                      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>— palavra-passe para validar o webhook</span>
                    </label>
                    <input
                      type="text"
                      value={wa.verifyToken}
                      onChange={(e) => setWa({ ...wa, verifyToken: e.target.value })}
                      placeholder="ex: casaflow_webhook_2024"
                      className={inputClass}
                      style={inputStyle}
                    />
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Podes usar qualquer texto — tens de usar o mesmo valor no painel Meta ao configurar o webhook.
                    </p>
                  </div>

                  {/* Webhook URL — para copiar */}
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>URL do Webhook (para configurar na Meta)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--surface)', color: '#25d366', fontFamily: 'monospace', border: '1px solid var(--border)', wordBreak: 'break-all' }}>
                        {(import.meta as any).env?.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('casaflow-frontend', 'casaflow-backend')}/webhook/whatsapp
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${(import.meta as any).env?.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('casaflow-frontend', 'casaflow-backend')}/webhook/whatsapp`
                          navigator.clipboard.writeText(url)
                          showToast('URL copiado!', 'success')
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                        style={{ background: '#25d366', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        <Copy size={12} /> Copiar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => handleSave({ whatsappToken: wa.whatsappToken, phoneNumberId: wa.phoneNumberId, verifyToken: wa.verifyToken })}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
                      style={{ background: '#0066ff', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />}
                      Guardar credenciais
                    </button>
                    <button
                      onClick={() => handleTest('whatsapp', testWhatsApp)}
                      disabled={!!testing['whatsapp']}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
                    >
                      {testing['whatsapp'] ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Testar ligação
                    </button>
                    {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                    {testResult['whatsapp'] && (
                      <span className={`text-sm font-medium flex items-center gap-1 ${testResult['whatsapp'].success ? 'text-emerald-600' : 'text-red-500'}`}>
                        {testResult['whatsapp'].success ? <Check size={13} /> : <X size={13} />}
                        {testResult['whatsapp'].message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Guia passo-a-passo */}
              <div className="rounded-xl border p-5" style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Info size={15} style={{ color: 'var(--accent)' }} />
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Como configurar — passo a passo</h4>
                </div>
                <ol className="space-y-3">
                  {[
                    { step: 'Acede a developers.facebook.com e cria uma app do tipo "Business"', link: 'https://developers.facebook.com' },
                    { step: 'Dentro da app, clica em "Adicionar produto" e escolhe "WhatsApp"', link: null },
                    { step: 'Em WhatsApp → Configuração, copia o "Token de acesso temporário" e o "Phone Number ID"', link: null },
                    { step: 'Cola os valores nos campos acima e clica em "Guardar credenciais"', link: null },
                    { step: 'Ainda em WhatsApp → Configuração, clica em "Configurar webhook", cola o URL acima e o Verify Token', link: null },
                    { step: 'Subscreve os eventos: messages, message_deliveries, message_reads', link: null },
                    { step: 'Clica em "Testar ligação" para confirmar que está tudo correto', link: null },
                    { step: 'Para produção, gera um Token Permanente em WhatsApp → Contas do sistema', link: null },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{i + 1}</span>
                      <span>
                        {item.step}
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-xs" style={{ color: 'var(--accent)' }}>
                            Abrir <ExternalLink size={10} />
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* O que acontece após configurar */}
              <div className="rounded-xl border p-5" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle size={15} style={{ color: '#16a34a' }} />
                  <h4 className="text-sm font-semibold" style={{ color: '#15803d' }}>O que acontece automaticamente</h4>
                </div>
                <ul className="space-y-1.5">
                  {[
                    'Mensagens recebidas aparecem em tempo real na secção "Conversas"',
                    'Se o número não existir como contacto, é criado automaticamente',
                    'Podes responder diretamente do CRM sem sair da plataforma',
                    'Todo o histórico de mensagens fica guardado no perfil do contacto',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#166534' }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Email */}
          {tab === 'email' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                      <Mail size={20} style={{ color: 'var(--accent)' }} />
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
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
                    >Gmail</button>
                    <button
                      onClick={() => setEmail({ ...email, ...OUTLOOK_PRESET })}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
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
                      placeholder="CasaFlow"
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
                    onClick={() => handleTest('email', testEmail)}
                    disabled={!!testing['email']}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
                  >
                    {testing['email'] && <Loader2 size={14} className="animate-spin" />}
                    Testar conexão
                  </button>
                  {saveMsg && <span className={`text-sm font-medium ${saveMsg.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>{saveMsg}</span>}
                  {testResult['email'] && (
                    <span className={`text-sm font-medium flex items-center gap-1 ${testResult['email'].success ? 'text-emerald-600' : 'text-red-500'}`}>
                      {testResult['email'].success ? <Check size={13} /> : <X size={13} />}
                      {testResult['email'].message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instagram */}
          {tab === 'instagram' && (
            <div className="space-y-5">
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
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

                <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
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
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Verify Token
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>usado para verificar o webhook no Meta</span>
                    </label>
                    <input
                      type="text"
                      value={ig.igVerifyToken}
                      onChange={(e) => setIg({ ...ig, igVerifyToken: e.target.value })}
                      placeholder="meu_ig_verify_token_secreto"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSave({ igAccessToken: ig.accessToken, igPageId: ig.pageId, igVerifyToken: ig.igVerifyToken })}
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

              <div className="rounded-xl border p-5" style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Info size={15} style={{ color: 'var(--accent)' }} />
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
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                    <Phone size={20} style={{ color: '#22c55e' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Twilio</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={status.phone} />
                      <StatusLabel status={status.phone} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Account SID
                      <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="ml-2 text-xs" style={{ color: 'var(--accent)', fontWeight: 400 }}>
                        Obter em twilio.com →
                      </a>
                    </label>
                    <input
                      type="text"
                      value={twilioAccountSid}
                      onChange={(e) => { setTwilioAccountSid(e.target.value); setTwilioSidSaved(false) }}
                      placeholder={twilioSidSaved ? '✓ Já configurado — deixa em branco para manter' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
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
                        onChange={(e) => { setTwilioAuthToken(e.target.value); setTwilioTokenSaved(false) }}
                        placeholder={twilioTokenSaved ? '✓ Já configurado — deixa em branco para manter' : '••••••••••••••••••••••••••••••••'}
                        className={inputClass + ' pr-10'}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => setShowTwilioToken(!showTwilioToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showTwilioToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Public URL */}
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        URL Pública do Servidor
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Em desenvolvimento usa ngrok</span>
                      </label>
                      <input
                        type="text"
                        value={publicUrl}
                        onChange={(e) => setPublicUrl(e.target.value)}
                        placeholder="https://meucrm.com"
                        className={inputClass}
                        style={inputStyle}
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Necessária para configurar os webhooks do Twilio. Ao guardar, os números comprados são atualizados automaticamente.
                      </p>
                    </div>
                  </div>

                  {/* Browser calling — auto-configured */}
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-start gap-2.5 p-3 rounded-lg" style={{ background: twilioTwimlAppSid && twilioApiKey ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)' }}>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{ background: twilioTwimlAppSid && twilioApiKey ? '#22c55e' : '#f59e0b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {twilioTwimlAppSid && twilioApiKey ? (
                            <>
                              <span className="font-semibold" style={{ color: '#22c55e' }}>Chamadas pelo browser configuradas.</span>
                              {' '}TwiML App e API Key criadas automaticamente pelo CRM.
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">Chamadas pelo browser não configuradas.</span>
                              {' '}Clica em "Configurar agora" para o CRM criar automaticamente a TwiML App e a API Key no Twilio.
                            </>
                          )}
                        </p>
                        {!(twilioTwimlAppSid && twilioApiKey) && (
                          <button
                            onClick={handleTwilioSetup}
                            disabled={twilioSetupRunning}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                            style={{ background: '#f59e0b', border: 'none', cursor: twilioSetupRunning ? 'not-allowed' : 'pointer' }}
                          >
                            {twilioSetupRunning ? <><Loader2 size={11} className="animate-spin" /> A configurar...</> : '⚡ Configurar agora'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Após guardar, compra um número na secção abaixo para SMS e chamadas.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest('twilio', testTwilio)}
                        disabled={!!testing['twilio']}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)', cursor: testing['twilio'] ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {testing['twilio'] && <Loader2 size={14} className="animate-spin" />}
                        Testar conexão
                      </button>
                      <button
                        onClick={() => handleSave({ twilioAccountSid, twilioAuthToken, twilioPhoneNumber, twilioTwimlAppSid, twilioApiKey, twilioApiSecret, publicUrl })}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                        style={{ background: 'var(--accent)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Guardar
                      </button>
                    </div>
                  </div>
                  {testResult['twilio'] && (
                    <p className={`text-xs font-medium flex items-center gap-1 ${testResult['twilio'].success ? 'text-emerald-600' : 'text-red-500'}`}>
                      {testResult['twilio'].success ? <Check size={12} /> : <X size={12} />}
                      {testResult['twilio'].message}
                    </p>
                  )}
                  {saveMsg && (
                    <p className="text-xs font-medium" style={{ color: saveMsg.includes('✓') ? '#10b981' : '#f87171' }}>{saveMsg}</p>
                  )}
                </div>
              </div>

              {/* Phone Numbers Management */}
              <div className="rounded-xl border shadow-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Números Comprados</h4>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gere os teus números Twilio para SMS e chamadas</p>
                  </div>
                  <button
                    onClick={() => { setShowNumberSearch(true); setNumberError(''); setNumberSearchResults([]) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={14} /> Comprar número
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-0 border-b" style={{ borderColor: 'var(--border)' }}>
                  {[
                    { label: 'Números ativos', value: phoneNumbers.length, icon: Phone, color: 'var(--accent)' },
                    { label: 'Custo mensal', value: `$${(phoneNumbers.length * 1.15).toFixed(2)}`, icon: Globe, color: '#10b981' },
                    { label: 'Com SMS', value: phoneNumbers.filter(n => { try { return JSON.parse(n.capabilities || '{}').sms } catch { return false } }).length, icon: MessageSquare, color: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={s.label} className={`flex items-center gap-3 p-4 ${i < 2 ? 'border-r' : ''}`} style={{ borderColor: 'var(--border)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + '20' }}>
                        <s.icon size={16} style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Numbers list */}
                {phoneNumbersLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : phoneNumbers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Phone size={32} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sem números comprados</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Compra um número para receber SMS e chamadas</p>
                    <button
                      onClick={() => { setShowNumberSearch(true); setNumberError(''); setNumberSearchResults([]) }}
                      className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', border: 'none', cursor: 'pointer' }}
                    >
                      Comprar primeiro número
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        {['Número', 'Nome', 'País', 'Capacidades', 'Custo/mês', 'Ações'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {phoneNumbers.map(n => {
                        let caps: any = {}
                        try { caps = JSON.parse(n.capabilities || '{}') } catch { }
                        return (
                          <tr key={n.id} className="border-b" style={{ borderColor: 'var(--border)' }}
                            onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{n.number}</span>
                            </td>
                            <td className="px-4 py-3">
                              {numberEditId === n.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    value={numberEditName}
                                    onChange={e => setNumberEditName(e.target.value)}
                                    className="rounded-lg px-2 py-1 text-xs focus:outline-none"
                                    style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)', width: 110 }}
                                  />
                                  <button onClick={() => handleNumberEdit(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}><Check size={13} /></button>
                                  <button onClick={() => setNumberEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>
                                </div>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{n.friendlyName || '—'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{n.countryCode}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {caps.voice && (
                                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(46,107,230,0.15)', color: '#60a5fa' }}>
                                    <Mic size={9} /> Voz
                                  </span>
                                )}
                                {caps.sms && (
                                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                                    <MessageSquare size={9} /> SMS
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              ${n.monthlyPrice?.toFixed(2)}/mês
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setNumberEditId(n.id); setNumberEditName(n.friendlyName || '') }}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                                  style={{ border: 'none', cursor: 'pointer', background: 'none', color: 'var(--text-muted)' }}
                                  title="Renomear"
                                ><Edit2 size={13} /></button>
                                <button
                                  onClick={() => handleNumberRelease(n.id)}
                                  className="p-1.5 rounded-lg"
                                  style={{ border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                                  title="Libertar número"
                                ><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Search/Purchase Modal */}
              {showNumberSearch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                      <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Pesquisar números disponíveis</h3>
                      <button
                        onClick={() => { setShowNumberSearch(false); setNumberSearchResults([]); setNumberError('') }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ border: 'none', background: 'var(--surface-3)', cursor: 'pointer', color: 'var(--text-muted)' }}
                      ><X size={15} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      {numberError && (
                        <div className="text-sm rounded-xl px-4 py-3 border" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
                          {numberError}
                          {(numberError.toLowerCase().includes('address') || numberError.toLowerCase().includes('endereço')) && (
                            <div className="mt-2">
                              <a
                                href="https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance/addresses"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#818cf8', textDecoration: 'underline', fontSize: 12 }}
                              >
                                → Registar endereço no Twilio Console
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(46,107,230,0.08)', color: 'var(--accent)', border: '1px solid rgba(46,107,230,0.2)' }}>
                        💡 Para Portugal, o Twilio raramente disponibiliza números. Recomendamos <strong>Reino Unido (GB)</strong> ou <strong>Estados Unidos (US)</strong>.
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>País</label>
                          <select
                            value={numberSearchCountry}
                            onChange={e => setNumberSearchCountry(e.target.value)}
                            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                            style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                          >
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Tipo</label>
                          <select
                            value={numberSearchType}
                            onChange={e => setNumberSearchType(e.target.value)}
                            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                            style={{ border: '1px solid var(--input-border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                          >
                            <option value="">Auto (recomendado)</option>
                            <option value="local">Local</option>
                            <option value="mobile">Mobile</option>
                            <option value="tollFree">Gratuito</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleNumberSearch}
                        disabled={numberSearchLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: '#fff', border: 'none', cursor: numberSearchLoading ? 'not-allowed' : 'pointer' }}
                      >
                        {numberSearchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {numberSearchLoading ? 'A pesquisar...' : 'Pesquisar números disponíveis'}
                      </button>

                      {numberSearchResults.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {numberSearchResults.length} número{numberSearchResults.length !== 1 ? 's' : ''} disponíve{numberSearchResults.length !== 1 ? 'is' : 'l'}
                          </p>
                          {numberSearchResults.map(r => {
                            const caps = r.capabilities || {}
                            return (
                              <div key={r.phoneNumber} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
                                <div>
                                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{r.phoneNumber}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{r.numberType || 'local'}</span>
                                    {caps.SMS && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>SMS</span>}
                                    {caps.voice && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(46,107,230,0.12)', color: 'var(--accent)' }}>Voz</span>}
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>${r.monthlyPrice || '1.15'}/mês</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleNumberPurchase(r)}
                                  disabled={numberPurchasing === r.phoneNumber}
                                  className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
                                  style={{ background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: '#fff', border: 'none', cursor: numberPurchasing === r.phoneNumber ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  {numberPurchasing === r.phoneNumber ? <><Loader2 size={12} className="animate-spin" /> A comprar...</> : 'Comprar'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : !numberSearchLoading && !numberError ? (
                        <div className="flex flex-col items-center py-6 gap-2">
                          <Phone size={28} style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Seleciona um país e clica em pesquisar</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requer credenciais Twilio guardadas</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General */}
          {tab === 'general' && (
            <div className="space-y-5">
              {/* CRM Name */}
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
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
              <div className="rounded-xl border shadow-sm p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: darkMode ? '#1e3a5f' : '#fef9ee' }}>
                    {darkMode ? <Moon size={20} style={{ color: '#93c5fd' }} /> : <Sun size={20} style={{ color: '#f59e0b' }} />}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aparência</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Personaliza o tema da interface</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
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
                      background: darkMode ? 'var(--accent)' : '#d1d5db',
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
                        border: `2px solid ${darkMode === dark ? 'var(--accent)' : 'var(--border)'}`,
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
                        <p style={{ fontSize: 10, color: 'var(--accent)', margin: '2px 0 0', fontWeight: 600 }}>✓ Ativo</p>
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
