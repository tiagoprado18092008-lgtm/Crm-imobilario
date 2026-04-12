import React, { useEffect, useState, useCallback } from 'react'
import { Phone, Plus, Search, Trash2, Edit2, Check, X, Globe, Mic, MessageSquare, ChevronDown, ChevronRight, ExternalLink, Copy, AlertCircle, CheckCircle2, Info, CreditCard, Lock } from 'lucide-react'
import { listNumbers, searchNumbers, purchaseNumber, releaseNumber, updateNumber, createPaymentIntent } from '../api/phone-numbers.api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

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

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 16,
  border: '1px solid var(--border-color)',
  overflow: 'hidden',
}

// ─── Setup Guide ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: 1,
    title: 'Criar conta Twilio',
    desc: 'Registo gratuito com ~15$ de crédito incluído. Não precisas de cartão de crédito para começar.',
    items: [
      { label: 'Acede a twilio.com e clica em "Sign up"', link: 'https://www.twilio.com/try-twilio' },
      { label: 'Confirma o email e o número de telemóvel' },
      { label: 'No painel, copia o Account SID e Auth Token' },
    ],
    creds: [
      { key: 'TWILIO_ACCOUNT_SID', example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', desc: 'Painel principal → Account Info' },
      { key: 'TWILIO_AUTH_TOKEN', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', desc: 'Painel principal → Account Info (clica no olho)' },
    ],
  },
  {
    num: 2,
    title: 'Configurar credenciais no CRM',
    desc: 'Cola as credenciais Twilio nas Configurações do CRM. São guardadas automaticamente no servidor.',
    items: [
      { label: 'Vai a Configurações → Telefone no menu lateral' },
      { label: 'Cola o Account SID e Auth Token' },
      { label: 'Clica "Guardar" — o CRM liga-se ao Twilio imediatamente' },
    ],
    creds: [],
  },
  {
    num: 3,
    title: 'Comprar número de telefone',
    desc: 'Após configurar as credenciais, compra um número diretamente aqui. Números portugueses custam ~1.15$/mês.',
    items: [
      { label: 'Clica "Comprar número" acima' },
      { label: 'Seleciona Portugal (PT) ou outro país' },
      { label: 'Clica "Pesquisar" e escolhe um número disponível' },
      { label: 'Clica "Comprar" — o número fica ativo de imediato' },
    ],
    creds: [],
  },
  {
    num: 4,
    title: 'Ativar chamadas pelo browser (opcional)',
    desc: 'Para fazer e receber chamadas diretamente no CRM sem instalar nada, precisas de criar uma TwiML App e API Keys no Twilio.',
    items: [
      { label: 'No painel Twilio → Voice → TwiML Apps → criar app' },
      { label: 'Copia o TwiML App SID (começa com AP...)' },
      { label: 'No painel Twilio → Account → API Keys → criar key' },
      { label: 'Copia a API Key SID (SK...) e o API Secret' },
      { label: 'Adiciona tudo em Configurações → Telefone' },
    ],
    creds: [
      { key: 'TWILIO_TWIML_APP_SID', example: 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', desc: 'Voice → TwiML Apps → a tua app' },
      { key: 'TWILIO_API_KEY', example: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', desc: 'Account → API Keys & Tokens' },
      { key: 'TWILIO_API_SECRET', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', desc: 'Mostrado só uma vez ao criar a key' },
    ],
  },
  {
    num: 5,
    title: 'Configurar URL pública (para receber)',
    desc: 'Para receber SMS e chamadas de fora, o Twilio precisa de uma URL pública do teu servidor. Em desenvolvimento usa ngrok.',
    items: [
      { label: 'Se tens domínio próprio: usa https://teu-dominio.com' },
      { label: 'Para testar localmente: instala ngrok e corre "ngrok http 3000"' },
      { label: 'Copia a URL https://xxxx.ngrok.io e adiciona em Configurações → Geral → PUBLIC_URL' },
    ],
    creds: [
      { key: 'PUBLIC_URL', example: 'https://teu-dominio.com', desc: 'URL base do teu servidor backend' },
    ],
  },
]

const FEATURES = [
  { icon: MessageSquare, label: 'Enviar SMS', needs: [1, 2, 3], color: '#10b981' },
  { icon: Phone, label: 'Receber SMS', needs: [1, 2, 3, 5], color: '#6366f1' },
  { icon: Mic, label: 'Chamadas no browser', needs: [1, 2, 3, 4], color: '#f59e0b' },
  { icon: Globe, label: 'Receber chamadas', needs: [1, 2, 3, 4, 5], color: '#ec4899' },
]

const SetupGuide: React.FC<{ completedSteps: number[] }> = ({ completedSteps }) => {
  const [open, setOpen] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [copied, setCopied] = useState<string | null>(null)

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const allDone = completedSteps.length >= 3

  return (
    <div style={{
      borderRadius: 16, border: '1px solid var(--border-color)',
      background: 'var(--bg-card)', marginBottom: 24, overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border-color)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: allDone ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {allDone
              ? <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              : <Info size={16} style={{ color: '#6366f1' }} />
            }
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Guia de configuração Twilio
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {allDone ? 'Configuração completa' : `${completedSteps.length} de 5 passos concluídos`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress bar */}
          <div style={{ width: 120, height: 6, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${(completedSteps.length / 5) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
              transition: 'width 400ms ease',
            }} />
          </div>
          {open ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Feature matrix */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8,
          }}>
            {FEATURES.map(f => {
              const done = f.needs.every(n => completedSteps.includes(n))
              return (
                <div key={f.label} style={{
                  padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${done ? f.color + '30' : 'var(--border-color)'}`,
                  background: done ? f.color + '08' : 'var(--bg-page)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <f.icon size={14} style={{ color: done ? f.color : 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: done ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0 }}>
                      {f.label}
                    </p>
                    <p style={{ fontSize: 10, color: done ? f.color : 'var(--text-muted)', margin: 0 }}>
                      {done ? '✓ Ativo' : `Passos ${f.needs.join(', ')}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Steps */}
          {STEPS.map(step => {
            const done = completedSteps.includes(step.num)
            const isOpen = expandedStep === step.num
            return (
              <div key={step.num} style={{
                borderRadius: 12,
                border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : isOpen ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
                overflow: 'hidden',
                background: done ? 'rgba(16,185,129,0.04)' : 'var(--bg-page)',
              }}>
                <button
                  onClick={() => setExpandedStep(isOpen ? null : step.num)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  {/* Step number / check */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#10b981' : isOpen ? '#6366f1' : 'var(--border-color)',
                    color: done || isOpen ? '#fff' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {done ? <Check size={13} /> : step.num}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {step.title}
                      {done && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981', fontWeight: 500 }}>Concluído</span>}
                    </p>
                    {!isOpen && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>
                        {step.desc}
                      </p>
                    )}
                  </div>
                  {isOpen ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      {step.desc}
                    </p>

                    {/* Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {step.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                            background: 'rgba(99,102,241,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#6366f1',
                          }}>{i + 1}</div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {item.label}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ marginLeft: 6, color: '#6366f1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              >
                                Abrir <ExternalLink size={11} />
                              </a>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Credentials reference */}
                    {step.creds.length > 0 && (
                      <div style={{
                        borderRadius: 10, border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', overflow: 'hidden',
                      }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Variáveis necessárias
                        </div>
                        {step.creds.map(c => (
                          <div key={c.key} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <code style={{
                                  fontSize: 11, fontWeight: 700, color: '#6366f1',
                                  background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 4,
                                }}>
                                  {c.key}
                                </code>
                              </div>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{c.desc}</p>
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'monospace', opacity: 0.6 }}>ex: {c.example}</p>
                            </div>
                            <button
                              onClick={() => copyKey(c.key)}
                              title="Copiar nome da variável"
                              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'var(--bg-page)', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                            >
                              {copied === c.key ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Go to settings CTA */}
                    {(step.num === 2 || step.num === 4 || step.num === 5) && (
                      <a
                        href="../settings?tab=phone"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                          fontSize: 12, fontWeight: 600, textDecoration: 'none',
                          border: '1px solid rgba(99,102,241,0.2)',
                          width: 'fit-content',
                        }}
                      >
                        Ir para Configurações → Telefone <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

interface StripeFormProps {
  selectedNumber: any
  onSuccess: () => void
  onCancel: () => void
}

const StripePaymentForm: React.FC<StripeFormProps> = ({ selectedNumber, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  useEffect(() => {
    setPayError('')
    createPaymentIntent(selectedNumber.phoneNumber, selectedNumber.monthlyPrice || 1.15)
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(e => setPayError(e.response?.data?.error || 'Erro ao preparar pagamento'))
  }, [selectedNumber.phoneNumber])

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return
    setPaying(true)
    setPayError('')
    const card = elements.getElement(CardElement)
    if (!card) { setPaying(false); return }
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })
    if (error) {
      setPayError(error.message || 'Erro no pagamento')
      setPaying(false)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      try {
        await purchaseNumber(selectedNumber.phoneNumber, selectedNumber.friendlyName || selectedNumber.phoneNumber)
        onSuccess()
      } catch (e: any) {
        setPayError(e.response?.data?.error || 'Pagamento OK mas erro ao ativar número. Contacta o suporte.')
        setPaying(false)
      }
    }
  }

  const cardStyle = {
    style: {
      base: {
        fontSize: '14px',
        color: '#e2e8f0',
        '::placeholder': { color: '#64748b' },
        backgroundColor: 'transparent',
      },
      invalid: { color: '#f87171' },
    },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Number summary */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        border: '1px solid var(--border-color)', background: 'var(--bg-page)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>
            {selectedNumber.phoneNumber}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {selectedNumber.locality || selectedNumber.region || selectedNumber.isoCountry} · {selectedNumber.numberType || 'Local'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#c9a84c', margin: 0 }}>
            ${(selectedNumber.monthlyPrice || 1.15).toFixed(2)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>1º mês</p>
        </div>
      </div>

      {payError && (
        <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(239,68,68,0.2)' }}>
          {payError}
        </div>
      )}

      {!clientSecret && !payError && (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: 'var(--text-muted)' }}>
          A preparar pagamento...
        </div>
      )}

      {clientSecret && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Dados do cartão
            </label>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
            }}>
              <CardElement options={cardStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <Lock size={11} />
            Pagamento seguro via Stripe · O número fica ativo imediatamente após o pagamento
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={paying}
              style={{
                flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border-color)',
                background: 'var(--bg-page)', color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handlePay}
              disabled={paying}
              style={{
                flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: paying ? 'var(--bg-page)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
                color: paying ? 'var(--text-muted)' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <CreditCard size={14} />
              {paying ? 'A processar...' : `Pagar $${(selectedNumber.monthlyPrice || 1.15).toFixed(2)} e ativar`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── No-Stripe fallback (buy directly via Twilio balance) ─────────────────────

const DirectPurchaseConfirm: React.FC<{ selectedNumber: any; onConfirm: () => void; onCancel: () => void; loading: boolean; error: string }> = ({ selectedNumber, onConfirm, onCancel, loading, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{selectedNumber.phoneNumber}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{selectedNumber.locality || selectedNumber.region || selectedNumber.isoCountry}</p>
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#c9a84c', margin: 0 }}>${(selectedNumber.monthlyPrice || 1.15).toFixed(2)}/mês</p>
    </div>
    {error && <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
      O número será cobrado diretamente ao saldo Twilio da tua conta.
    </p>
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Cancelar
      </button>
      <button onClick={onConfirm} disabled={loading} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: loading ? 'var(--bg-page)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)', color: loading ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'A comprar...' : 'Confirmar compra'}
      </button>
    </div>
  </div>
)

export const PhoneNumbersPage: React.FC = () => {
  const [numbers, setNumbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [country, setCountry] = useState('PT')
  const [areaCode, setAreaCode] = useState('')
  const [numType, setNumType] = useState('local')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<any>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [twilioStatus, setTwilioStatus] = useState<any>(null)

  const load = async () => {
    try {
      const [numRes, statusRes] = await Promise.all([
        listNumbers(),
        fetch('/api/settings/communications/status', { headers: { Authorization: `Bearer ${localStorage.getItem('crm_token')}` } }).then(r => r.json()).catch(() => ({})),
      ])
      setNumbers(numRes.data)
      setTwilioStatus(statusRes)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = async () => {
    setSearchLoading(true)
    setError('')
    try {
      const res = await searchNumbers(country, areaCode || undefined, numType)
      setResults(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao pesquisar números. Verifica as credenciais Twilio.')
    } finally { setSearchLoading(false) }
  }

  const handleSelectNumber = (num: any) => {
    setSelectedNumber(num)
    setError('')
  }

  const handlePurchaseSuccess = async () => {
    await load()
    setShowSearch(false)
    setSelectedNumber(null)
    setResults([])
    setError('')
  }

  const handleDirectPurchase = async () => {
    if (!selectedNumber) return
    setPurchasing(selectedNumber.phoneNumber)
    try {
      await purchaseNumber(selectedNumber.phoneNumber, selectedNumber.friendlyName || selectedNumber.phoneNumber)
      await handlePurchaseSuccess()
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao comprar número')
    } finally { setPurchasing(null) }
  }

  const handleRelease = async (id: string) => {
    if (!confirm('Tens a certeza que queres libertar este número? Esta ação não pode ser desfeita.')) return
    try {
      await releaseNumber(id)
      setNumbers(n => n.filter(x => x.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao libertar número')
    }
  }

  const handleEdit = async (id: string) => {
    try {
      await updateNumber(id, editName)
      setNumbers(n => n.map(x => x.id === id ? { ...x, friendlyName: editName } : x))
      setEditId(null)
    } catch { }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)', color: 'var(--text-primary)',
    fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Números de Telefone
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Compra e gere números Twilio para SMS e chamadas
          </p>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Comprar número
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Números ativos', value: numbers.length, icon: Phone, color: '#6366f1' },
          { label: 'Custo mensal', value: `$${(numbers.length * 1.15).toFixed(2)}`, icon: Globe, color: '#10b981' },
          { label: 'Com SMS', value: numbers.filter(n => { try { return JSON.parse(n.capabilities || '{}').sms } catch { return false } }).length, icon: MessageSquare, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: s.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Setup Guide */}
      {!loading && (() => {
        const completed: number[] = []
        // Step 1: Twilio account — can't detect from frontend, mark if phone status configured
        if (twilioStatus?.phone === 'configured') completed.push(1, 2)
        // Step 3: has numbers
        if (numbers.length > 0) completed.push(3)
        // Steps 4 & 5 we can't auto-detect from frontend
        return <SetupGuide completedSteps={completed} />
      })()}

      {/* Numbers list */}
      <div style={card}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>A carregar...</div>
        ) : numbers.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <Phone size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Sem números comprados
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Compra um número para receber SMS e chamadas
            </p>
            <button
              onClick={() => setShowSearch(true)}
              style={{
                padding: '9px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Comprar primeiro número
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Número', 'Nome', 'País', 'Capacidades', 'Custo/mês', 'Ações'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map(n => {
                let caps: any = {}
                try { caps = JSON.parse(n.capabilities || '{}') } catch { }
                return (
                  <tr
                    key={n.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {n.number}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editId === n.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ ...inputStyle, width: 120, padding: '4px 8px' }}
                          />
                          <button
                            onClick={() => handleEdit(n.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {n.friendlyName || '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {n.countryCode}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {caps.voice && (
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}
                          >
                            <Mic size={10} /> Voz
                          </span>
                        )}
                        {caps.sms && (
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}
                          >
                            <MessageSquare size={10} /> SMS
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ${n.monthlyPrice?.toFixed(2)}/mês
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => { setEditId(n.id); setEditName(n.friendlyName || '') }}
                          style={{
                            padding: '5px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'var(--bg-page)', color: 'var(--text-muted)',
                          }}
                          title="Renomear"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleRelease(n.id)}
                          style={{
                            padding: '5px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.1)', color: '#f87171',
                          }}
                          title="Libertar número"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              width: '100%', maxWidth: 520, margin: '0 16px',
              maxHeight: '90vh', overflowY: 'auto',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {selectedNumber ? 'Pagamento seguro' : 'Pesquisar números disponíveis'}
              </h2>
              <button
                onClick={() => { setShowSearch(false); setResults([]); setError(''); setSelectedNumber(null) }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: 'var(--bg-page)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Payment step */}
              {selectedNumber && (
                stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm
                      selectedNumber={selectedNumber}
                      onSuccess={handlePurchaseSuccess}
                      onCancel={() => setSelectedNumber(null)}
                    />
                  </Elements>
                ) : (
                  <DirectPurchaseConfirm
                    selectedNumber={selectedNumber}
                    onConfirm={handleDirectPurchase}
                    onCancel={() => setSelectedNumber(null)}
                    loading={!!purchasing}
                    error={error}
                  />
                )
              )}

              {/* Search step */}
              {!selectedNumber && <>

              {error && (
                <div
                  style={{
                    fontSize: 13, color: '#f87171',
                    background: 'rgba(239,68,68,0.1)',
                    borderRadius: 10, padding: '10px 14px',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    País
                  </label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Tipo
                  </label>
                  <select value={numType} onChange={e => setNumType(e.target.value)} style={inputStyle}>
                    <option value="local">Local</option>
                    <option value="mobile">Mobile</option>
                    <option value="tollFree">Toll-Free</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Indicativo
                  </label>
                  <input
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value)}
                    placeholder="ex: 21"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={searchLoading}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: searchLoading ? 'var(--bg-page)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
                  color: searchLoading ? 'var(--text-muted)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: searchLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Search size={14} />
                {searchLoading ? 'A pesquisar...' : 'Pesquisar números disponíveis'}
              </button>

              {results.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
                    {results.length} número{results.length !== 1 ? 's' : ''} disponíve{results.length !== 1 ? 'is' : 'l'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {results.map(r => (
                      <div
                        key={r.phoneNumber}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: 12,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-page)',
                        }}
                      >
                        <div>
                          <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                            {r.phoneNumber}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            {r.locality || r.region || r.isoCountry} · ${r.monthlyPrice || '1.15'}/mês
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectNumber(r)}
                          style={{
                            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
                            color: '#fff', fontSize: 12, fontWeight: 700,
                          }}
                        >
                          Comprar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!error && results.length === 0 && !searchLoading && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Phone size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Seleciona um país e clica em pesquisar
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Requer credenciais Twilio configuradas no backend
                  </p>
                </div>
              )}

              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
