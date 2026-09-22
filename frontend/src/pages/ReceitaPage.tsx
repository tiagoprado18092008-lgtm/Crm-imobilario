import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertTriangle, Download, Wallet } from 'lucide-react'
import api from '../api/client'

/**
 * Revenue.
 *
 * MRR is shown as a movement, not a level. "€2,400" says nothing about whether
 * the business is growing — the same figure can mean four new clients and four
 * churned. Where there is no prior month to compare against, the movement says
 * so rather than inventing a delta.
 */

type Overview = {
  mrr: number
  arr: number
  activeClients: number
  movement: {
    newMrr: number
    expansion: number
    contraction: number
    churn: number
    netNew: number
  } | null
  aging: {
    current: number
    days1to30: number
    days31to60: number
    days61to90: number
    over90: number
    total: number
  }
  renewals: Array<{
    id: string
    name: string
    monthlyValue: number
    renewsAt: string | null
    company: { id: string; name: string } | null
  }>
}

const euro = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(v)

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '—'

export function ReceitaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue', 'overview'],
    queryFn: () => api.get('/revenue/overview').then((r) => r.data as Overview),
  })

  if (isLoading) {
    return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>A carregar…</p>
  }

  if (!data) return null

  const { aging, movement, renewals } = data
  const overdue = aging.total - aging.current

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-body)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          Receita
        </h1>
        <a
          href="/api/revenue/invoices/export"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 34,
            padding: '0 13px',
            border: '1px solid var(--border-strong)',
            borderRadius: 7,
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Download size={14} />
          Exportar faturas
        </a>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Stat label="MRR" value={euro(data.mrr)} detail={`${euro(data.arr)} por ano`} accent />
        <Stat label="Clientes com avença" value={String(data.activeClients)} />
        <Stat
          label="Por cobrar"
          value={euro(aging.total)}
          detail={overdue > 0 ? `${euro(overdue)} em atraso` : 'Tudo dentro do prazo'}
          warn={overdue > 0}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        <Panel title="Movimento do mês" icon={<TrendingUp size={14} />}>
          {movement ? (
            <div style={{ padding: '4px 14px 14px' }}>
              <Movement label="Novo" value={movement.newMrr} positive />
              <Movement label="Expansão" value={movement.expansion} positive />
              <Movement label="Contração" value={-movement.contraction} />
              <Movement label="Churn" value={-movement.churn} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 9,
                  marginTop: 5,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Líquido
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color:
                      movement.netNew > 0
                        ? 'var(--success)'
                        : movement.netNew < 0
                        ? 'var(--danger)'
                        : 'var(--text-primary)',
                  }}
                >
                  {movement.netNew >= 0 ? '+' : ''}
                  {euro(movement.netNew)}
                </span>
              </div>
            </div>
          ) : (
            /* No prior month means no honest comparison, so say that rather
               than print a delta that means nothing. */
            <p style={{ margin: 0, padding: '16px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Ainda não há mês anterior para comparar. O movimento aparece a
              partir do próximo fecho de mês.
            </p>
          )}
        </Panel>

        <Panel title="Cobranças" icon={<Wallet size={14} />}>
          <div style={{ padding: '4px 14px 14px' }}>
            <AgingRow label="Dentro do prazo" value={aging.current} />
            <AgingRow label="1 a 30 dias" value={aging.days1to30} late />
            <AgingRow label="31 a 60 dias" value={aging.days31to60} late />
            <AgingRow label="61 a 90 dias" value={aging.days61to90} late />
            <AgingRow label="Mais de 90 dias" value={aging.over90} late />
          </div>
        </Panel>
      </div>

      <Panel title="Avenças a renovar nos próximos 30 dias" icon={<AlertTriangle size={14} />}>
        {renewals.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            Nenhuma renovação nos próximos 30 dias.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {renewals.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {r.company?.name ?? '—'}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 70, textAlign: 'right' }}>
                  {euro(r.monthlyValue)}
                </span>
                <span style={{ color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
                  {shortDate(r.renewsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Stat({
  label,
  value,
  detail,
  accent,
  warn,
}: {
  label: string
  value: string
  detail?: string
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div
      style={{
        padding: '13px 15px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        background: 'var(--surface)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</p>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 25,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {value}
      </p>
      {detail && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 12,
            color: warn ? 'var(--warning)' : 'var(--text-muted)',
          }}
        >
          {detail}
        </p>
      )}
    </div>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius)',
        background: 'var(--surface)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '11px 14px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        {icon}
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

function Movement({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isZero = value === 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isZero
            ? 'var(--text-muted)'
            : positive
            ? 'var(--success)'
            : 'var(--danger)',
        }}
      >
        {value > 0 ? '+' : ''}
        {euro(value)}
      </span>
    </div>
  )
}

function AgingRow({ label, value, late }: { label: string; value: number; late?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: value === 0 ? 'var(--text-muted)' : late ? 'var(--warning)' : 'var(--text-primary)',
        }}
      >
        {euro(value)}
      </span>
    </div>
  )
}

export default ReceitaPage
