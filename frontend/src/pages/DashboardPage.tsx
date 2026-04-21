import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Users, TrendingUp, DollarSign, CheckSquare, MoreHorizontal, CalendarDays, Clock, Building2, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, isPast, parseISO } from 'date-fns'
import { getReportSummary, getReportPipeline } from '../api/reports.api'
import { getTasks } from '../api/tasks.api'
import { getUpcoming } from '../api/appointments.api'
import { getContacts } from '../api/contacts.api'
import type { ReportSummary, PipelineStage, Task, Contact } from '../types'
import { STAGE_LABELS } from '../utils/constants'
import { PageSpinner } from '../components/ui/Spinner'

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

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

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const w = 72; const h = 36
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

  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      {linePath && (
        <path ref={lineRef} d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  iconColor: string
  sparkData?: number[]
  sparkColor?: string
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, icon, iconBg, iconColor, sparkData, sparkColor }) => {
  const positive = trend === undefined || trend >= 0
  return (
    <div
      className="metric-card"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {value}
          </div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                fontSize: 11, fontWeight: 600,
                padding: '2px 7px', borderRadius: 20,
                background: positive ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                color: positive ? 'var(--success)' : 'var(--danger)',
              }}>
                {positive ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                {Math.abs(trend)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs 30 dias</span>
            </div>
          )}
        </div>
        {sparkData && sparkData.length > 1 && sparkColor && (
          <Sparkline data={sparkData} color={sparkColor} />
        )}
      </div>
    </div>
  )
}

const FUNNEL_COLORS = ['#2E6BE6', '#5B8EF0', '#7BA8F5', '#16A34A', '#D97706', '#DC2626']
const APPOINTMENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  VISIT:    { bg: 'rgba(46,107,230,0.1)',  color: 'var(--accent)' },
  CALL:     { bg: 'rgba(22,163,74,0.1)',   color: 'var(--success)' },
  MEETING:  { bg: 'rgba(217,119,6,0.1)',   color: 'var(--warning)' },
  DEFAULT:  { bg: 'var(--surface-3)',      color: 'var(--text-muted)' },
}

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
      } catch { /* endpoint may not exist */ }
      setLoading(false)
    }
    load()
  }, [])

  const sparkContacts = [30, 38, 35, 45, 42, 55, summary?.totalContacts ? Math.min((summary.totalContacts % 90) + 10, 90) : 60]
  const sparkLeads    = [20, 28, 24, 35, 30, 42, summary?.totalLeads ? Math.min((summary.totalLeads % 80) + 15, 85) : 50]
  const sparkPipe     = [40, 52, 48, 68, 60, 75, 80]
  const sparkClosed   = [10, 18, 14, 22, 20, 28, 32]

  const funnelData = pipeline
    .filter(s => s.stage !== 'CLOSED_LOST')
    .map((s, i, arr) => ({
      ...s,
      label: STAGE_LABELS[s.stage] || s.stage,
      conversion: i === 0 ? 100 : arr[0].count > 0 ? Math.round((s.count / arr[0].count) * 100) : 0,
    }))
  const maxCount = Math.max(...funnelData.map(d => d.count), 1)

  const sourceMap: Record<string, { total: number; won: number }> = {}
  contacts.forEach(c => {
    const src = c.source || 'Direto'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0 }
    sourceMap[src].total++
    ;(c.opportunities || []).forEach(o => { if (o.stage === 'CLOSED_WON') sourceMap[src].won++ })
  })
  const sourceRows = Object.entries(sourceMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5)
  const maxSource = Math.max(...sourceRows.map(([, d]) => d.total), 1)

  if (loading) return <PageSpinner />

  const sectionCard = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      ...style,
    }}>
      {children}
    </div>
  )

  const cardHeader = (title: string, action?: React.ReactNode) => (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </span>
      {action}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1 — 4 primary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          title="Contactos"
          value={summary?.totalContacts ?? 0}
          trend={12}
          icon={<Users size={16} />}
          iconBg="rgba(46,107,230,0.1)"
          iconColor="var(--accent)"
          sparkData={sparkContacts}
          sparkColor="var(--accent)"
        />
        <KpiCard
          title="Leads Ativos"
          value={summary?.totalLeads ?? 0}
          trend={8}
          icon={<TrendingUp size={16} />}
          iconBg="rgba(124,58,237,0.1)"
          iconColor="#7C3AED"
          sparkData={sparkLeads}
          sparkColor="#7C3AED"
        />
        <KpiCard
          title="Pipeline"
          value={summary ? formatCurrency(summary.pipelineValue) : '€0'}
          trend={15}
          icon={<DollarSign size={16} />}
          iconBg="rgba(217,119,6,0.1)"
          iconColor="var(--warning)"
          sparkData={sparkPipe}
          sparkColor="var(--warning)"
        />
        <KpiCard
          title="Fechados (mês)"
          value={summary?.closedWonThisMonth ?? 0}
          trend={22}
          icon={<Target size={16} />}
          iconBg="rgba(22,163,74,0.1)"
          iconColor="var(--success)"
          sparkData={sparkClosed}
          sparkColor="var(--success)"
        />
      </div>

      {/* Row 2 — 3 secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <KpiCard
          title="Oportunidades Abertas"
          value={summary?.openOpportunities ?? 0}
          trend={-3}
          icon={<Building2 size={16} />}
          iconBg="rgba(46,107,230,0.1)"
          iconColor="var(--accent)"
        />
        <KpiCard
          title="Tarefas para Hoje"
          value={summary?.tasksDueToday ?? 0}
          icon={<CheckSquare size={16} />}
          iconBg="rgba(22,163,74,0.1)"
          iconColor="var(--success)"
        />
        <KpiCard
          title="Total Clientes"
          value={summary?.totalClients ?? 0}
          icon={<Users size={16} />}
          iconBg="rgba(217,119,6,0.1)"
          iconColor="var(--warning)"
        />
      </div>

      {/* Row 3 — Tasks + Pipeline funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        {sectionCard(
          <>
            {cardHeader(
              'Tarefas Pendentes',
              <Link to="/tasks" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                Ver todas →
              </Link>
            )}
            {tasks.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem tarefas pendentes
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {tasks.map(task => {
                  const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false
                  return (
                    <li
                      key={task.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 20px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'default',
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        marginTop: 2, width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                        border: '1.5px solid var(--border-strong)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          {task.contact && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.contact.name}</span>
                          )}
                          {task.dueDate && (
                            <span style={{
                              fontSize: 11, fontWeight: 500,
                              padding: '1px 6px', borderRadius: 4,
                              background: overdue ? 'rgba(220,38,38,0.1)' : 'var(--surface-3)',
                              color: overdue ? 'var(--danger)' : 'var(--text-secondary)',
                            }}>
                              {overdue ? 'Vencido' : 'Pendente'} — {format(parseISO(task.dueDate), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {sectionCard(
          <>
            {cardHeader('Funil de Vendas')}
            {funnelData.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem dados de pipeline
              </div>
            ) : (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {funnelData.map((stage, i) => (
                  <div key={stage.stage}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {stage.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {stage.count}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                          {stage.conversion}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${(stage.count / maxCount) * 100}%`,
                        background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                        minWidth: stage.count > 0 ? 4 : 0,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Row 4 — Appointments + Source conversion */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {sectionCard(
          <>
            {cardHeader(
              'Próximos Agendamentos',
              <Link to="/appointments" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                Ver todos →
              </Link>
            )}
            {appointments.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem agendamentos próximos
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {appointments.map((ap: any) => {
                  const tc = APPOINTMENT_TYPE_COLORS[ap.type] || APPOINTMENT_TYPE_COLORS.DEFAULT
                  return (
                    <li
                      key={ap.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 20px',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: tc.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CalendarDays size={16} style={{ color: tc.color }} />
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
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ap.contact.name}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {sectionCard(
          <>
            {cardHeader('Conversão por Fonte')}
            {sourceRows.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem dados de fonte
              </div>
            ) : (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sourceRows.map(([src, data], i) => {
                  const rate = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
                  const barColor = rate >= 30 ? 'var(--success)' : rate >= 15 ? 'var(--warning)' : 'var(--accent)'
                  const barColors = ['var(--accent)', '#7C3AED', 'var(--success)', 'var(--warning)', 'var(--danger)']
                  return (
                    <div key={src}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{src}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.total} leads</span>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                            color: barColor, minWidth: 32, textAlign: 'right',
                          }}>
                            {rate}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${(data.total / maxSource) * 100}%`,
                          background: barColors[i % barColors.length],
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
