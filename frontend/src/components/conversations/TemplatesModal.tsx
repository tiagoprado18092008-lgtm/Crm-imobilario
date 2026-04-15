import React, { useEffect, useState } from 'react'
import { X, Search, FileText } from 'lucide-react'
import { getTemplates } from '../../api/message-templates.api'
import type { Contact, MessageTemplate, User } from '../../types'
import { format } from 'date-fns'

interface Props {
  open: boolean
  onClose: () => void
  channel: string
  contact?: Contact | null
  user?: User | null
  onSelect: (body: string, subject?: string) => void
}

function substituteVars(text: string, contact?: Contact | null, user?: User | null): string {
  const today = format(new Date(), 'dd/MM/yyyy')
  return text
    .replace(/\{\{nome\}\}/g, contact?.name || '')
    .replace(/\{\{email\}\}/g, contact?.email || '')
    .replace(/\{\{telefone\}\}/g, contact?.phone || '')
    .replace(/\{\{consultor\}\}/g, user?.name || '')
    .replace(/\{\{data\}\}/g, today)
    .replace(/\{\{hora\}\}/g, '')
    .replace(/\{\{imovel\}\}/g, '')
    .replace(/\{\{link\}\}/g, '')
}

export const TemplatesModal: React.FC<Props> = ({ open, onClose, channel, contact, user, onSelect }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'WHATSAPP' | 'EMAIL' | 'SMS'>('ALL')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getTemplates()
      .then(r => setTemplates(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const tabs: ('ALL' | 'WHATSAPP' | 'EMAIL' | 'SMS')[] = ['ALL', 'WHATSAPP', 'EMAIL', 'SMS']

  const filtered = templates.filter(t => {
    if (activeTab !== 'ALL' && t.channel !== 'ALL' && t.channel !== activeTab) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleUse = (t: MessageTemplate) => {
    const body = substituteVars(t.body, contact, user)
    const subject = t.subject ? substituteVars(t.subject, contact, user) : undefined
    onSelect(body, subject)
    onClose()
  }

  const tabLabel = { ALL: 'Todos', WHATSAPP: 'WhatsApp', EMAIL: 'Email', SMS: 'SMS' }
  const tabColor = { ALL: 'var(--text-primary)', WHATSAPP: '#25d366', EMAIL: '#3b82f6', SMS: '#f59e0b' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Templates de Mensagem</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={17} /></button>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 16px 0', borderBottom: '1px solid var(--border-color)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '6px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === t ? 'var(--bg-page)' : 'transparent',
              color: activeTab === t ? tabColor[t] : 'var(--text-muted)',
              borderBottom: activeTab === t ? `2px solid ${tabColor[t]}` : '2px solid transparent',
              transition: 'all 120ms',
            }}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {/* search */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar templates..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <FileText size={28} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Sem templates disponíveis</p>
            </div>
          ) : filtered.map(t => (
            <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</p>
                {t.subject && (
                  <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Assunto: {t.subject}</p>
                )}
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                  {t.body}
                </p>
                <span style={{ marginTop: 5, display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-page)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                  {t.channel === 'ALL' ? 'Todos os canais' : t.channel}
                </span>
              </div>
              <button onClick={() => handleUse(t)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Usar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
