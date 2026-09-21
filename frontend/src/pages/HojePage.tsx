import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Phone, CheckCircle2, Clock, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { getLeads } from '../api/leads.api'
import { getTasks } from '../api/tasks.api'
import { getOpportunities } from '../api/opportunities.api'

/**
 * The day's work, in priority order.
 *
 * This replaces a dashboard of seven KPI cards that reported numbers but
 * offered nothing to do about them. Every row here is an action, and the
 * numbers on the right link to the list that produced them rather than
 * standing alone. Nothing is shown that cannot be acted on.
 */

type QueueItem = {
  id: string
  kind: 'chamada' | 'tarefa'
  title: string
  subtitle: string
  reason: string
  overdue: boolean
  href: string
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function HojePage() {
  const navigate = useNavigate()

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['hoje', 'leads-due'],
    queryFn: () => getLeads({ dueOnly: true, limit: 50 }).then((r) => r.data),
  })

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['hoje', 'tasks'],
    queryFn: () => getTasks({ status: 'PENDING', limit: 50 }).then((r) => r.data),
  })

  const { data: oppsData } = useQuery({
    queryKey: ['hoje', 'opportunities'],
    queryFn: () => getOpportunities({ limit: 200 }).then((r) => r.data),
  })

  const leads = leadsData?.data ?? []
  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.data ?? []
  const opportunities = Array.isArray(oppsData) ? oppsData : oppsData?.data ?? []

  /**
   * One ordered queue, not three lists. Overdue work sorts above today's, and
   * calls above tasks — a BDR's day is answered by "who do I ring now".
   */
  const queue = useMemo<QueueItem[]>(() => {
    const today = startOfToday()
    const items: QueueItem[] = []

    for (const t of tasks) {
      if (!t.dueDate) continue
      const due = new Date(t.dueDate)
      if (due > new Date(today.getTime() + 86_400_000)) continue
      items.push({
        id: `task-${t.id}`,
        kind: 'tarefa',
        title: t.title,
        subtitle: t.contact?.name ?? '',
        reason: due < today ? 'Vencida' : 'Para hoje',
        overdue: due < today,
        href: '/tasks',
      })
    }

    for (const l of leads) {
      if (l.optOutCalls) continue
      const due = l.nextAttemptAt ? new Date(l.nextAttemptAt) : null
      items.push({
        id: `lead-${l.id}`,
        kind: 'chamada',
        title: l.companyName ?? l.contactName ?? 'Lead sem nome',
        subtitle: l.phone ?? '',
        reason:
          l.attempts === 0
            ? 'Por contactar'
            : `${l.attempts} tentativa${l.attempts === 1 ? '' : 's'}`,
        overdue: Boolean(due && due < today),
        href: '/leads',
      })
    }

    return items.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      if (a.kind !== b.kind) return a.kind === 'chamada' ? -1 : 1
      return 0
    })
  }, [leads, tasks])

  /** Deals with no scheduled next activity. Activity-based selling: a deal
   *  without a next step is a deal quietly going cold. */
  const atRisk = useMemo(() => {
    const cutoff = new Date(Date.now() - 3 * 86_400_000)
    return opportunities
      .filter((o: any) => {
        if (o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST') return false
        return new Date(o.updatedAt ?? o.createdAt) < cutoff
      })
      .slice(0, 8)
  }, [opportunities])

  const monthStats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const won = opportunities.filter(
      (o: any) => o.stage === 'CLOSED_WON' && new Date(o.updatedAt) >= monthStart,
    )
    const open = opportunities.filter(
      (o: any) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST',
    )
    return {
      wonCount: won.length,
      wonValue: won.reduce((s: number, o: any) => s + (o.value ?? 0), 0),
      openCount: open.length,
      openValue: open.reduce((s: number, o: any) => s + (o.value ?? 0), 0),
    }
  }, [opportunities])

  const loading = leadsLoading || tasksLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-body)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
          }}>
            Hoje
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('pt-PT', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/leads')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 36, padding: '0 14px',
            border: 'none', borderRadius: 8,
            background: 'var(--primary)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <Phone size={15} />
          Iniciar sessão de chamadas
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 16 }}
           className="hoje-grid">
        {/* A minha fila */}
        <Panel title="A minha fila" count={queue.length}>
          {loading ? (
            <Placeholder>A carregar…</Placeholder>
          ) : queue.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={20} />}
              title="Fila vazia"
              body="Sem chamadas nem tarefas pendentes. Importa uma lista para começar a ligar."
              actionLabel="Ir para Leads"
              onAction={() => navigate('/leads')}
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {queue.slice(0, 25).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      width: '100%', padding: '9px 14px',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      background: 'transparent', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: item.overdue ? 'rgba(200,30,30,0.09)' : 'var(--accent-soft)',
                      color: item.overdue ? 'var(--danger)' : 'var(--accent)',
                    }}>
                      {item.kind === 'chamada' ? <Phone size={13} /> : <Clock size={13} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, flexShrink: 0,
                      color: item.overdue ? 'var(--danger)' : 'var(--text-muted)',
                    }}>
                      {item.reason}
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Em risco */}
          <Panel title="Em risco" count={atRisk.length}>
            {atRisk.length === 0 ? (
              <Placeholder>Nenhum negócio parado.</Placeholder>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {atRisk.map((o: any) => (
                  <li key={o.id}>
                    <button
                      onClick={() => navigate('/pipeline')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                        padding: '8px 14px', border: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <AlertTriangle size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                      <span style={{
                        flex: 1, fontSize: 13, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.title}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                        sem atividade
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* O meu mês — real numbers, each linking to its source list */}
          <Panel title="O meu mês">
            <div style={{ padding: '4px 14px 12px' }}>
              <Stat
                label="Negócios ganhos"
                value={String(monthStats.wonCount)}
                detail={monthStats.wonValue ? `${monthStats.wonValue.toLocaleString('pt-PT')} €` : undefined}
                onClick={() => navigate('/pipeline')}
              />
              <Stat
                label="Pipeline aberto"
                value={String(monthStats.openCount)}
                detail={monthStats.openValue ? `${monthStats.openValue.toLocaleString('pt-PT')} €` : undefined}
                onClick={() => navigate('/pipeline')}
              />
              <Stat
                label="Leads por contactar"
                value={String(leads.filter((l: any) => l.attempts === 0).length)}
                onClick={() => navigate('/leads')}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--card-radius)',
      background: 'var(--surface)',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 14px', borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{
          margin: 0, fontSize: 14, fontWeight: 700,
          fontFamily: 'var(--font-display)', color: 'var(--text-primary)',
        }}>
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
          }}>
            {count}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  detail,
  onClick,
}: {
  label: string
  value: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'baseline', gap: 10, width: '100%',
        padding: '8px 0', border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{
        fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)',
        color: 'var(--text-primary)', minWidth: 34,
      }}>
        {value}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      {detail && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{detail}</span>
      )}
    </button>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: '18px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
      {children}
    </p>
  )
}

function EmptyState({
  icon, title, body, actionLabel, onAction,
}: {
  icon: React.ReactNode
  title: string
  body: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div style={{ padding: '26px 16px', textAlign: 'center' }}>
      <span style={{
        display: 'inline-grid', placeItems: 'center',
        width: 38, height: 38, borderRadius: 10,
        background: 'var(--accent-soft)', color: 'var(--accent)',
      }}>
        {icon}
      </span>
      <p style={{
        margin: '10px 0 3px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
      }}>
        {title}
      </p>
      <p style={{
        margin: '0 auto 12px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320,
      }}>
        {body}
      </p>
      <button
        onClick={onAction}
        style={{
          height: 32, padding: '0 14px', border: '1px solid var(--border-strong)',
          borderRadius: 7, background: 'var(--surface)', color: 'var(--text-primary)',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}

export default HojePage
