import React, { useEffect, useRef, useState } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { getMyAgency, updateAgency, uploadAgencyLogo, regenerateApiKey } from '../../api/agency.api'
import { useUIStore } from '../../store/ui.store'
import { PageSpinner } from '../../components/ui/Spinner'
import { CustomSelect } from '../../components/ui/CustomSelect'

const NICHES = [
  'Agência imobiliária', 'Consultoria imobiliária', 'Gestão de propriedades',
  'Investimento imobiliário', 'Arrendamento', 'Outro',
]

const CURRENCIES = [
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'USD', label: 'USD - Dólar ($)' },
  { value: 'GBP', label: 'GBP - Libra (£)' },
  { value: 'BRL', label: 'BRL - Real (R$)' },
]

const input: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid #e5e9f2',
  fontSize: 13.5, color: '#111827', outline: 'none', fontFamily: 'inherit',
  background: '#fff', boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6,
}

export const AgencySettingsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [form, setForm] = useState({
    name: '', legalName: '', email: '', phone: '', website: '',
    niche: '', currency: 'EUR',
  })
  const logoInputRef = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  useEffect(() => {
    getMyAgency().then(res => {
      const d = res.data
      setAgency(d)
      setForm({
        name: d.name || '',
        legalName: d.legalName || '',
        email: d.email || '',
        phone: d.phone || '',
        website: d.website || '',
        niche: d.niche || '',
        currency: d.currency || 'EUR',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !agency) return
    try {
      const res = await uploadAgencyLogo(agency.id, file)
      setAgency((a: any) => ({ ...a, logoUrl: res.data.logoUrl }))
      showToast('Logótipo actualizado.', 'success')
    } catch {
      showToast('Erro ao carregar logótipo.', 'error')
    }
  }

  const handleRemoveLogo = async () => {
    if (!agency) return
    try {
      await updateAgency(agency.id, { logoUrl: '' })
      setAgency((a: any) => ({ ...a, logoUrl: '' }))
      showToast('Logótipo removido.', 'success')
    } catch {
      showToast('Erro ao remover logótipo.', 'error')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agency) return
    setSaving(true)
    try {
      await updateAgency(agency.id, form)
      showToast('Informações actualizadas.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Erro ao guardar.', 'error')
    } finally { setSaving(false) }
  }

  const handleRegenerateKey = async () => {
    if (!agency) return
    if (!window.confirm('Tens a certeza? A chave actual ficará inválida.')) return
    setRegenerating(true)
    try {
      const res = await regenerateApiKey(agency.id)
      setAgency((a: any) => ({ ...a, apiKey: res.data.apiKey }))
      showToast('Nova API Key gerada.', 'success')
    } catch {
      showToast('Erro ao gerar API Key.', 'error')
    } finally { setRegenerating(false) }
  }

  const maskedKey = (key: string) => {
    if (!key) return '—'
    return key.slice(0, 6) + '****-****-****-****-' + key.slice(-6)
  }

  const copyKey = () => {
    if (agency?.apiKey) {
      navigator.clipboard.writeText(agency.apiKey)
      showToast('API Key copiada.', 'success')
    }
  }

  if (loading) return <PageSpinner />

  const logoSrc = agency?.logoUrl
    ? (agency.logoUrl.startsWith('http') ? agency.logoUrl : `${apiBase}${agency.logoUrl}`)
    : null

  return (
    <div style={{ padding: '32px 40px', maxWidth: 760, margin: '0 auto' }}>
      <form onSubmit={handleSave}>

        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 32, padding: '24px 28px', background: '#fff', borderRadius: 14, border: '1px solid #e5e9f2' }}>
          {/* Preview */}
          <div style={{ width: 220, height: 120, borderRadius: 10, border: '1px solid #e5e9f2', background: '#f9fafb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logoSrc
              ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 12, color: '#9ca3af' }}>Sem logótipo</span>
            }
          </div>

          {/* Controls */}
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Logótipo da empresa</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 16px' }}>O tamanho proposto é 350 px * 180 px. Não superior a 2,5 MB</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
              >Carregar</button>
              {logoSrc && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                >Remover</button>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>
        </div>

        {/* ── Campos ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e9f2', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>

          <div>
            <label style={label}>Nome amigável da empresa</label>
            <input style={input} value={form.name} onChange={set('name')} placeholder="House Team" />
          </div>

          <div>
            <label style={label}>Nome <strong>legal</strong> da empresa <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>ⓘ</span></label>
            <input style={input} value={form.legalName} onChange={set('legalName')} placeholder="Xporcento Lda" />
            <p style={{ fontSize: 12, color: '#6366f1', margin: '5px 0 0' }}>Introduza o nome legal exato da empresa, conforme registado no EIN</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={label}>E-mail da empresa</label>
              <input style={input} type="email" value={form.email} onChange={set('email')} placeholder="geral@empresa.pt" />
            </div>
            <div>
              <label style={label}>Telefone da empresa</label>
              <input style={input} type="tel" value={form.phone} onChange={set('phone')} placeholder="+351 210 000 000" />
            </div>
          </div>

          <div>
            <label style={label}>
              Domínio de marca <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>ⓘ</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ ...input, flex: 1 }} value="" readOnly placeholder="Domínio de marca" />
              <button type="button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e9f2', background: '#f9fafb', fontSize: 13, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                + Adicionar domínio
              </button>
            </div>
          </div>

          <div>
            <label style={label}>Sítio Web da empresa</label>
            <input style={input} type="url" value={form.website} onChange={set('website')} placeholder="https://empresa.pt/" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={label}>Nicho de negócio</label>
              <CustomSelect
                value={form.niche}
                onChange={v => setForm(f => ({ ...f, niche: v }))}
                placeholder="Seleccionar..."
                options={NICHES.map(n => ({ value: n, label: n }))}
              />
            </div>
            <div>
              <label style={label}>Moeda da Empresa <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>ⓘ</span></label>
              <CustomSelect
                value={form.currency}
                onChange={v => setForm(f => ({ ...f, currency: v }))}
                options={CURRENCIES.map(c => ({ value: c.value, label: c.label }))}
              />
            </div>
          </div>

          {/* API Key */}
          <div>
            <label style={label}>
              API Key <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>ⓘ</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 8, border: '1px solid #e5e9f2', background: '#f9fafb', fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>
              <span style={{ flex: 1 }}>
                {agency?.apiKey
                  ? (apiKeyVisible ? agency.apiKey : maskedKey(agency.apiKey))
                  : <span style={{ color: '#9ca3af', fontFamily: 'inherit' }}>Nenhuma chave gerada</span>
                }
              </span>
              {agency?.apiKey && (
                <>
                  <button type="button" onClick={() => setApiKeyVisible(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 12, fontFamily: 'sans-serif', padding: '0 4px' }}>
                    {apiKeyVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" onClick={copyKey} title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                    <Copy size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={regenerating}
                title="Regenerar chave"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

        </div>

        {/* ── Guardar ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {saving ? 'A guardar...' : 'Actualizar informações'}
          </button>
        </div>

      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
