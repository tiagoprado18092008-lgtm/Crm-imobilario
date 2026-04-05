import React, { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  ArrowUp, ArrowDown, Users, TrendingUp, DollarSign, CheckSquare,
  MoreHorizontal, CalendarDays, PencilLine,
} from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { getReportSummary, getReportPipeline } from '../api/reports.api'
import { getTasks } from '../api/tasks.api'
import { getContacts } from '../api/contacts.api'
import { getConversationStats } from '../api/conversations.api'
import type { ReportSummary, PipelineStage, Task, Contact } from '../types'

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#f97316', '#10b981', '#f43f5e']

import { STAGE_LABELS } from '../utils/constants'

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
  return `€${v}`
}

interface KpiCardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ReactNode
  iconBg: string
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, icon, iconBg }) => {
  const positive = trend === undefined || trend >= 0
  return (
    <div className="metric-card rounded-2xl p-6 flex flex-col gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="font-bold mt-1" style={{ fontSize: 32, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: positive ? '#f0fdf4' : '#fef2f2',
                color: positive ? '#16a34a' : '#dc2626',
              }}
            >
              {positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(trend)}%
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>vs 30 dias</span>
          </div>
        )}
      </div>
    </div>
  )
}

const PERIODS = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 },
  { label: 'Este ano', value: 365 },
]

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [convStats, setConvStats] = useState<{ open: number; resolved: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const periodRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setShowPeriodMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
        const rawTasks = Array.isArray(taskRes.data) ? taskRes.data : taskRes.data?.data ?? []
        setTasks(rawTasks)
        const rawContacts = Array.isArray(contRes.data) ? contRes.data : contRes.data?.data ?? []
        setContacts(rawContacts)
      } catch (e) {
        console.error('Dashboard load error', e)
      }
      try {
        const csRes = await getConversationStats()
        setConvStats(csRes.data)
      } catch {
        // backend may not support conversations yet
      }
      setLoading(false)
    }
    load()
  }, [])

  // Source table
  const sourceMap: Record<string, { total: number; open: number; won: number; lost: number }> = {}
  contacts.forEach((c) => {
    const src = c.source || 'Direto'
    if (!sourceMap[src]) sourceMap[src] = { total: 0, open: 0, won: 0, lost: 0 }
    sourceMap[src].total++
    ;(c.opportunities || []).forEach((o) => {
      if (o.stage === 'CLOSED_WON') sourceMap[src].won++
      else if (o.stage === 'CLOSED_LOST') sourceMap[src].lost++
      else sourceMap[src].open++
    })
  })
  const sourceRows = Object.entries(sourceMap).sort((a, b) => b[1].total - a[1].total)

  // Opportunity stage donut
  const pipelineForDonut = pipeline.filter((s) => !['CLOSED_WON', 'CLOSED_LOST'].includes(s.stage))
  const wonStage = pipeline.find((s) => s.stage === 'CLOSED_WON')
  const lostStage = pipeline.find((s) => s.stage === 'CLOSED_LOST')
  const donutData = [
    ...(pipelineForDonut.length > 0
      ? [{ name: 'Abertas', value: pipelineForDonut.reduce((acc, s) => acc + s.count, 0), fill: '#6366f1' }]
      : []),
    ...(wonStage ? [{ name: 'Ganhas', value: wonStage.count, fill: '#10b981' }] : []),
    ...(lostStage ? [{ name: 'Perdidas', value: lostStage.count, fill: '#f43f5e' }] : []),
  ].filter((d) => d.value > 0)

  // Funnel data
  const funnelData = pipeline
    .filter((s) => s.stage !== 'CLOSED_LOST')
    .map((s, i, arr) => ({
      ...s,
      label: STAGE_LABELS[s.stage] || s.stage,
      conversion: i === 0 ? 100 : arr[0].count > 0 ? Math.round((s.count / arr[0].count) * 100) : 0,
    }))

  const maxCount = Math.max(...funnelData.map((d) => d.count), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="relative" ref={periodRef}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}
          >
            <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
            {PERIODS.find(p => p.value === period)?.label ?? 'Últimos 30 dias'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', transform: showPeriodMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {showPeriodMenu && (
            <div style={{ position: 'absolute', top: 40, left: 0, zIndex: 50, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 6, minWidth: 190 }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPeriod(p.value); setShowPeriodMenu(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: period === p.value ? '#eef2ff' : 'transparent',
                    color: period === p.value ? '#6366f1' : 'var(--text-secondary)',
                    fontWeight: period === p.value ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <PencilLine size={12} /> Dados em tempo real
        </span>
      </div>

      {/* Row 1: 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Contactos"
          value={summary?.totalContacts ?? 0}
          trend={12}
          icon={<Users size={17} style={{ color: '#6366f1' }} />}
          iconBg="#eef2ff"
        />
        <KpiCard
          title="Leads Ativos"
          value={summary?.totalLeads ?? 0}
          trend={8}
          icon={<TrendingUp size={17} style={{ color: '#8b5cf6' }} />}
          iconBg="#f5f3ff"
        />
        <KpiCard
          title="Oportunidades Abertas"
          value={summary?.openOpportunities ?? 0}
          trend={-3}
          icon={<TrendingUp size={17} style={{ color: '#f59e0b' }} />}
          iconBg="#fffbeb"
        />
        <KpiCard
          title="Tarefas para Hoje"
          value={summary?.tasksDueToday ?? 0}
          icon={<CheckSquare size={17} style={{ color: '#10b981' }} />}
          iconBg="#f0fdf4"
        />
      </div>

      {/* Row 2: 2 bigger KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KpiCard
          title="Valor no Pipeline"
          value={summary ? formatCurrency(summary.pipelineValue) : '€0'}
          trend={15}
          icon={<DollarSign size={17} style={{ color: '#6366f1' }} />}
          iconBg="#eef2ff"
        />
        <KpiCard
          title="Negócios Fechados (mês)"
          value={summary?.closedWonThisMonth ?? 0}
          trend={22}
          icon={<TrendingUp size={17} style={{ color: '#10b981' }} />}
          iconBg="#f0fdf4"
        />
      </div>

      {/* Row 2b: Conversão por fonte */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Taxa de Conversão por Fonte de Lead</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ROI por canal de aquisição</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Fonte</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Leads</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ganhos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Taxa</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Sem dados</td></tr>
              ) : (
                sourceRows.map(([src, data]) => {
                  const rate = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
                  const color = rate >= 30 ? '#22c55e' : rate >= 15 ? '#f59e0b' : '#ef4444'
                  return (
                    <tr
                      key={src}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{src}</td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{data.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{data.won}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color }}>{rate}%</td>
                      <td className="px-4 py-3">
                        <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-color)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(rate * 2, 100)}%`, background: color }} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Tasks + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Tarefas Pendentes</h3>
            <a href="/tasks" className="text-xs font-semibold hover:underline" style={{ color: '#6366f1', textDecoration: 'none' }}>Ver todas →</a>
          </div>
          {tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Sem tarefas pendentes</div>
          ) : (
            <ul>
              {tasks.map((task) => {
                const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 px-6 py-3.5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-md flex-shrink-0 cursor-pointer" style={{ border: '2px solid var(--border-color)', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.contact && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.contact.name}</span>}
                        {task.dueDate && (
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: overdue ? '#fee2e2' : 'var(--border-color)',
                              color: overdue ? '#dc2626' : 'var(--text-secondary)',
                            }}
                          >
                            {overdue
                              ? `Vencido – ${format(parseISO(task.dueDate), 'dd/MM/yyyy')}`
                              : `Pendente – ${format(parseISO(task.dueDate), 'dd/MM/yyyy')}`}
                          </span>
                        )}
                      </div>
                      {task.assignedTo && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.assignedTo.name}</p>}
                    </div>
                    <button className="p-1" style={{ color: 'var(--text-muted)' }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Funil de Vendas</h3>
          </div>
          {funnelData.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados de pipeline</div>
          ) : (
            <div className="px-4 py-4 space-y-2">
              {funnelData.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-2">
                  <span className="text-xs w-20 flex-shrink-0 truncate" style={{ color: 'var(--text-secondary)' }}>{stage.label}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--border-color)' }}>
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${(stage.count / maxCount) * 100}%`,
                        background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                        minWidth: stage.count > 0 ? 8 : 0,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs font-bold w-5 text-right" style={{ color: 'var(--text-primary)' }}>{stage.count}</span>
                    <span className="text-xs w-8" style={{ color: 'var(--text-muted)' }}>{stage.conversion}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Source table + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Contactos por Fonte</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Fonte</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Abertas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ganhas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Perdidas</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Sem dados</td>
                  </tr>
                ) : (
                  sourceRows.map(([src, data]) => (
                    <tr
                      key={src}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{src}</td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{data.total}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{data.open}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{data.won}</td>
                      <td className="px-4 py-3 text-right text-red-500">{data.lost}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Distribuição de Oportunidades</h3>
          </div>
          {donutData.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Sem oportunidades</div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {convStats && (
            <div className="flex items-center gap-4 px-6 pb-4">
              <div className="flex-1 text-center" style={{ borderRight: '1px solid var(--border-subtle)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{convStats.open}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Conversas abertas</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{convStats.resolved}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Resolvidas</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
