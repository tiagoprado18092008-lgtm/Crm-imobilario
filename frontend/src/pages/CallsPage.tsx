import React, { useEffect, useState } from 'react'
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { getCalls } from '../api/calls.api'
import { useCallStore } from '../store/call.store'

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const openDialer = useCallStore(s => s.openDialer)

  const load = async (p: number) => {
    setLoading(true)
    try {
      const res = await getCalls({ page: p, limit: 20 })
      setCalls(res.data?.data || [])
      setTotal(res.data?.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page])

  const parseMeta = (c: any) => {
    try { return JSON.parse(c.metadata || '{}') } catch { return {} }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
        Histórico de chamadas
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
        {total} chamada{total !== 1 ? 's' : ''} no total
      </p>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border-color)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>A carregar...</div>
        ) : calls.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <Phone size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Sem chamadas ainda</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>As chamadas feitas e recebidas aparecem aqui</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Direção', 'Contacto', 'Número', 'Data', 'Duração', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(c => {
                const meta = parseMeta(c)
                const target = c.direction === 'OUTBOUND' ? meta.toNumber : meta.fromNumber || meta.from
                const voicemail = meta.voicemailUrl
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      {c.direction === 'OUTBOUND'
                        ? <PhoneOutgoing size={14} style={{ color: '#60a5fa' }} />
                        : <PhoneIncoming size={14} style={{ color: '#4ade80' }} />}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                      {c.contact?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {target || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {meta.duration ? `${meta.duration}s` : '—'}
                      {voicemail && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: '#c9a84c', fontWeight: 600 }}>VOICEMAIL</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => target && openDialer(target, c.contactId || undefined)}
                          disabled={!target}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: 'none',
                            cursor: target ? 'pointer' : 'not-allowed',
                            background: target ? 'rgba(99,102,241,0.1)' : 'var(--bg-page)',
                            color: target ? '#6366f1' : 'var(--text-muted)',
                            fontSize: 12, fontWeight: 600,
                          }}
                        >
                          Ligar de volta
                        </button>
                        {voicemail && (
                          <a
                            href={voicemail}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              background: 'rgba(201,168,76,0.1)', color: '#c9a84c',
                              fontSize: 12, fontWeight: 600, textDecoration: 'none',
                            }}
                          >
                            Ouvir
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            Anterior
          </button>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
