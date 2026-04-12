import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Users, TrendingUp, DollarSign, CheckSquare, MoreHorizontal, CalendarDays, Clock } from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { getReportSummary, getReportPipeline } from '../api/reports.api'
import { getTasks } from '../api/tasks.api'
import { getUpcoming } from '../api/appointments.api'
import { getContacts } from '../api/contacts.api'
import type { ReportSummary, PipelineStage, Task, Contact } from '../types'
import { STAGE_LABELS } from '../utils/constants'

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

// Smooth SVG sparkline
function generatePath(points: number[], w: number, h: number) {
  if (points.length < 2) return ''
  const xs = w / (points.length - 1)
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const pad = h * 0.15
  const coords = points.map((p, i) => [i * xs, h - pad - ((p - min) / range) * (h - pad * 2)] as [number, number])
  let d = `M ${coords[0][0]} ${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i++) {
    const mx = (coords[i][0] + coords[i + 1][0]) / 2
    d += ` C ${mx},${coords[i][1]} ${mx},${coords[i + 1][1]} ${coords[i + 1][0]},${coords[i + 1][1]}`
  }
  return d
}

interface SparklineProps {
  data: number[]
  color: string
  positive?: boolean
}
const Sparkline: React.FC<SparklineProps> = ({ data, color, positive = true }) => {
  const w = 80
  const h = 36
  const lineRef = useRef<SVGPathElement>(null)
  const linePath = useMemo(() => generatePath(data, w, h), [data])
  const areaPath = linePath ? `${linePath} L ${w} ${h} L 0 ${h} Z` : ''

  useEffect(() => {
    const el = lineRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.transition = 'none'
    el.style.strokeDasharray = `${len} ${len}`
    el.style.strokeDashoffset = `${len}`
    el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 0.9s ease-in-out'
    el.style.strokeDashoffset = '0'
  }, [linePath])

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={positive ? 0.25 : 0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#sg-${color.replace('#', '')})`} />}
      {linePath && (
        <path
          ref={lineRef}
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

interface KpiCardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ReactNode
  iconBg: string
  sparkData?: number[]
  sparkColor?: string
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, icon, iconBg, sparkData, sparkColor = '#6366f1' }) => {
  const positive = trend === undefined || trend >= 0
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: '20px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 6px', borderRadius: 20,
                  background: positive ? '#f0fdf4' : '#fef2f2',
                  color: positive ? '#16a34a' : '#dc2626',
                }}
              >
                {positive ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                {Math.abs(trend)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs 30 dias</span>
            </div>
          )}
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} color={sparkColor} positive={positive} />
        )}
      </div>
    </div>
  )
}

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#f97316', '#10b981', '#f43f5e']

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, pipeRes, taskRes, contRes] = await Promise.all([
          getReportSummary(),
          getReportPipeline(),
          getTasks({ status: 'PENDING', limit: 5, sortBy: 'dueDate', sortOrder: 'asc' }),
          getContacts({ limit: 200 }),
        ])
        setSummary(sumRes.data)
        setPipeline(Array.isArray(pipeRes.data) ? pipeRes.data : pipeRes.data?.stages ?? [])
        setTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data ?? [])
        setContacts(Array.isArray(contRes.data) ? contRes.data : contRes.data?.data ?? [])
      } catch (e) {
        console.error('Dashboard load error', e)
      }
      try {
        const apRes = await getUpcoming()
        setAppointments(Array.isArray(apRes.data) ? apRes.data.slice(0, 5) : [])
      } catch {
        // upcoming endpoint may not exist yet
      }
      setLoading(false)
    }
    load()
  }, [])

  // Fake sparkline seeds derived from summary (deterministic visual)
  const sparkContacts = [30, 38, 35, 45, 42, 55, summary?.totalContacts ? Math.min((summary.totalContacts % 90) + 10, 90) : 60]
  const sparkLeads    = [20, 28, 24, 35, 30, 42, summary?.totalLeads ? Math.min((summary.totalLeads % 80) + 15, 85) : 50]
  const sparkPipe     = [40, 52, 48, 68, 60, 75, 80]
  const sparkClosed   = [10, 18, 14, 22, 20, 28, 32]

  // Funnel
  const funnelData = pipeline
    .filter((s) => s.stage !== 'CLOSED_LOST')
    .map((s, i, arr) => ({
      ...s,
      label: STAGE_LABELS[s.stage] || s.stage,
      conversion: i === 0 ? 100 : arr[0].count > 0 ? Math.round((s.count / arr[0].count) * 100) : 0,
    }))
  const maxCount = Math.max(...funnelData.map((d) => d.count), 1)

  // Source map for mini table
  const sourceMap: Record<string, { total: number; won: number }> = {}
  contacts.forEach((c) => {
    const src = c.source || 'Direto'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0 }
    sourceMap[src].total++
    ;(c.opportunities || []).forEach((o) => {
      if (o.stage === 'CLOSED_WON') sourceMap[src].won++
    })
  })
  const sourceRows = Object.entries(sourceMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid #e5e7eb',
            borderTopColor: '#6366f1',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )

  const cardHeader = (title: string, action?: React.ReactNode) => (
    <div
      style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      {action}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1: 4 KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          title="Contactos"
          value={summary?.totalContacts ?? 0}
          trend={12}
          icon={<Users size={16} style={{ color: '#6366f1' }} />}
          iconBg="#eef2ff"
          sparkData={sparkContacts}
          sparkColor="#6366f1"
        />
        <KpiCard
          title="Leads Ativos"
          value={summary?.totalLeads ?? 0}
          trend={8}
          icon={<TrendingUp size={16} style={{ color: '#8b5cf6' }} />}
          iconBg="#f5f3ff"
          sparkData={sparkLeads}
          sparkColor="#8b5cf6"
        />
        <KpiCard
          title="Pipeline"
          value={summary ? formatCurrency(summary.pipelineValue) : '€0'}
          trend={15}
          icon={<DollarSign size={16} style={{ color: '#f59e0b' }} />}
          iconBg="#fffbeb"
          sparkData={sparkPipe}
          sparkColor="#f59e0b"
        />
        <KpiCard
          title="Fechados (mês)"
          value={summary?.closedWonThisMonth ?? 0}
          trend={22}
          icon={<TrendingUp size={16} style={{ color: '#10b981' }} />}
          iconBg="#f0fdf4"
          sparkData={sparkClosed}
          sparkColor="#10b981"
        />
      </div>

      {/* Row 2: secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <KpiCard
          title="Oportunidades Abertas"
          value={summary?.openOpportunities ?? 0}
          trend={-3}
          icon={<TrendingUp size={16} style={{ color: '#6366f1' }} />}
          iconBg="#eef2ff"
        />
        <KpiCard
          title="Tarefas para Hoje"
          value={summary?.tasksDueToday ?? 0}
          icon={<CheckSquare size={16} style={{ color: '#10b981' }} />}
          iconBg="#f0fdf4"
        />
        <KpiCard
          title="Total Clientes"
          value={summary?.totalClients ?? 0}
          icon={<Users size={16} style={{ color: '#f59e0b' }} />}
          iconBg="#fffbeb"
        />
      </div>

      {/* Row 3: Tasks + Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        {card(
          <>
            {cardHeader(
              'Tarefas Pendentes',
              <a href="/tasks" style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}>
                Ver todas
              </a>
            )}
            {tasks.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                Sem tarefas pendentes
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {tasks.map((task) => {
                  const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false
                  return (
                    <li
                      key={task.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        style={{
                          marginTop: 2, width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                          border: '1.5px solid var(--border-color)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          {task.contact && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.contact.name}</span>
                          )}
                          {task.dueDate && (
                            <span
                              style={{
                                fontSize: 11, fontWeight: 500,
                                padding: '1px 6px', borderRadius: 4,
                                background: overdue ? '#fee2e2' : 'var(--border-color)',
                                color: overdue ? '#dc2626' : 'var(--text-secondary)',
                              }}
                            >
                              {overdue ? 'Vencido' : 'Pendente'} — {format(parseISO(task.dueDate), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {card(
          <>
            {cardHeader('Funil de Vendas')}
            {funnelData.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                Sem dados de pipeline
              </div>
            ) : (
              <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {funnelData.map((stage, i) => (
                  <div key={stage.stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {stage.label}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%', borderRadius: 4,
                          width: `${(stage.count / maxCount) * 100}%`,
                          background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                          minWidth: stage.count > 0 ? 4 : 0,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, width: 20, textAlign: 'right', color: 'var(--text-primary)', flexShrink: 0 }}>
                      {stage.count}
                    </span>
                    <span style={{ fontSize: 11, width: 30, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {stage.conversion}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Row 4: Appointments + Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {card(
          <>
            {cardHeader(
              'Proximos Agendamentos',
              <a href="/appointments" style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}>
                Ver todos
              </a>
            )}
            {appointments.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                Sem agendamentos proximos
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {appointments.map((ap: any) => (
                  <li
                    key={ap.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: '#eef2ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CalendarDays size={16} style={{ color: '#6366f1' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ap.title || ap.type || 'Agendamento'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ap.scheduledAt ? format(parseISO(ap.scheduledAt), 'dd/MM/yyyy HH:mm') : '—'}
                        </span>
                      </div>
                    </div>
                    {ap.contact && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {ap.contact.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {card(
          <>
            {cardHeader('Conversao por Fonte')}
            {sourceRows.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                Sem dados
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Fonte', 'Leads', 'Ganhos', 'Taxa'].map((h) => (
                      <th key={h} style={{ padding: '8px 20px', textAlign: h === 'Fonte' ? 'left' : 'right', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map(([src, data]) => {
                    const rate = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
                    const rateColor = rate >= 30 ? '#22c55e' : rate >= 15 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr
                        key={src}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 20px', fontWeight: 500, color: 'var(--text-primary)' }}>{src}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--text-secondary)' }}>{data.total}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{data.won}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: rateColor }}>{rate}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
