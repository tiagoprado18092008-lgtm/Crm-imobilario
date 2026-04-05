import React, { useEffect, useState } from 'react'
import { Phone, Plus, Search, Trash2, Edit2, Check, X, Globe, Mic, MessageSquare } from 'lucide-react'
import { listNumbers, searchNumbers, purchaseNumber, releaseNumber, updateNumber } from '../api/phone-numbers.api'

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

export const PhoneNumbersPage: React.FC = () => {
  const [numbers, setNumbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [country, setCountry] = useState('PT')
  const [areaCode, setAreaCode] = useState('')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await listNumbers()
      setNumbers(res.data)
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = async () => {
    setSearchLoading(true)
    setError('')
    try {
      const res = await searchNumbers(country, areaCode || undefined)
      setResults(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao pesquisar números. Verifica as credenciais Twilio.')
    } finally { setSearchLoading(false) }
  }

  const handlePurchase = async (num: any) => {
    setPurchasing(num.phoneNumber)
    try {
      await purchaseNumber(num.phoneNumber, num.friendlyName || num.phoneNumber)
      await load()
      setShowSearch(false)
      setResults([])
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

      {/* Setup notice if no numbers */}
      {!loading && numbers.length === 0 && (
        <div
          style={{
            ...card,
            padding: 20, marginBottom: 20,
            background: 'rgba(201,168,76,0.06)',
            borderColor: 'rgba(201,168,76,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(201,168,76,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Phone size={16} style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Configurar Twilio para chamadas reais
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Para ligar e receber chamadas diretamente no CRM, precisas de:
                &nbsp;1) Conta Twilio em <strong>twilio.com</strong>&nbsp;·
                &nbsp;2) Adicionar <code style={{ background: 'var(--bg-page)', padding: '1px 5px', borderRadius: 4 }}>TWILIO_ACCOUNT_SID</code>,
                <code style={{ background: 'var(--bg-page)', padding: '1px 5px', borderRadius: 4 }}>TWILIO_AUTH_TOKEN</code> e
                <code style={{ background: 'var(--bg-page)', padding: '1px 5px', borderRadius: 4 }}>TWILIO_TWIML_APP_SID</code> no <code>.env</code> do backend&nbsp;·
                &nbsp;3) Comprar um número aqui
              </p>
            </div>
          </div>
        </div>
      )}

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
                Pesquisar números disponíveis
              </h2>
              <button
                onClick={() => { setShowSearch(false); setResults([]); setError('') }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    País
                  </label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    style={inputStyle}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Indicativo (opcional)
                  </label>
                  <input
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value)}
                    placeholder="ex: 21 (Lisboa)"
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
                          onClick={() => handlePurchase(r)}
                          disabled={purchasing === r.phoneNumber}
                          style={{
                            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: purchasing === r.phoneNumber ? 'var(--bg-card)' : 'linear-gradient(135deg, #1a2e4a, #c9a84c)',
                            color: purchasing === r.phoneNumber ? 'var(--text-muted)' : '#fff',
                            fontSize: 12, fontWeight: 700,
                          }}
                        >
                          {purchasing === r.phoneNumber ? 'A comprar...' : 'Comprar'}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
