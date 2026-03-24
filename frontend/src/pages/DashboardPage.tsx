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

const STAGE_LABELS: Record<string, string> = {
  LEAD_IN: 'Entrada',
  QUALIFYING: 'Qualificação',
  VISIT_SCHEDULED: 'Visita',
  PROPOSAL_SENT: 'Proposta',
  NEGOTIATION: 'Negociação',
  CLOSED_WON: 'Ganho',
  CLOSED_LOST: 'Perdido',
}

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
    <div className="metric-card bg-white rounded-2xl p-6 flex flex-col gap-4" style={{ border: '1px solid #eaecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="font-bold text-slate-900 mt-1" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>{value}</div>
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
            <span className="text-xs text-slate-400">vs 30 dias</span>
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700"
            style={{ border: '1px solid #eaecf3', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}
          >
            <CalendarDays size={14} className="text-slate-400" />
            {PERIODS.find(p => p.value === period)?.label ?? 'Últimos 30 dias'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8', transform: showPeriodMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {showPeriodMenu && (
            <div style={{ position: 'absolute', top: 40, left: 0, zIndex: 50, background: '#fff', borderRadius: 12, border: '1px solid #eaecf3', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 6, minWidth: 190 }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPeriod(p.value); setShowPeriodMenu(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: period === p.value ? '#eef2ff' : 'transparent',
                    color: period === p.value ? '#6366f1' : '#374151',
                    fontWeight: period === p.value ? 600 : 400,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #eaecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Taxa de Conversão por Fonte de Lead</h3>
          <span className="text-xs text-slate-400">ROI por canal de aquisição</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fonte</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Leads</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ganhos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Taxa</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Performance</th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Sem dados</td></tr>
              ) : (
                sourceRows.map(([src, data]) => {
                  const rate = data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
                  const color = rate >= 30 ? '#22c55e' : rate >= 15 ? '#f59e0b' : '#ef4444'
                  return (
                    <tr key={src} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700">{src}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{data.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{data.won}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color }}>{rate}%</td>
                      <td className="px-4 py-3">
                        <div className="w-full h-2 rounded-full bg-slate-100">
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
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Tarefas Pendentes</h3>
            <a href="/tasks" className="text-xs font-semibold hover:underline" style={{ color: '#6366f1', textDecoration: 'none' }}>Ver todas →</a>
          </div>
          {tasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Sem tarefas pendentes</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {tasks.map((task) => {
                const overdue = task.dueDate ? isPast(parseISO(task.dueDate)) : false
                return (
                  <li key={task.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50">
                    <div className="mt-0.5 w-4 h-4 rounded-md flex-shrink-0 cursor-pointer" style={{ border: '2px solid #e2e8f0', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.contact && <span className="text-xs text-slate-400">{task.contact.name}</span>}
                        {task.dueDate && (
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: overdue ? '#fee2e2' : '#f1f5f9',
                              color: overdue ? '#dc2626' : '#64748b',
                            }}
                          >
                            {overdue
                              ? `Vencido – ${format(parseISO(task.dueDate), 'dd/MM/yyyy')}`
                              : `Pendente – ${format(parseISO(task.dueDate), 'dd/MM/yyyy')}`}
                          </span>
                        )}
                      </div>
                      {task.assignedTo && <p className="text-xs text-slate-400 mt-0.5">{task.assignedTo.name}</p>}
                    </div>
                    <button className="text-slate-300 hover:text-slate-500 p-1">
                      <MoreHorizontal size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #eaecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Funil de Vendas</h3>
          </div>
          {funnelData.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Sem dados de pipeline</div>
          ) : (
            <div className="px-4 py-4 space-y-2">
              {funnelData.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0 truncate">{stage.label}</span>
                  <div className="flex-1 h-6 rounded bg-slate-100 overflow-hidden">
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
                    <span className="text-xs font-bold text-slate-700 w-5 text-right">{stage.count}</span>
                    <span className="text-xs text-slate-400 w-8">{stage.conversion}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Source table + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #eaecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Contactos por Fonte</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fonte</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abertas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ganhas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perdidas</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Sem dados</td>
                  </tr>
                ) : (
                  sourceRows.map(([src, data]) => (
                    <tr key={src} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-700">{src}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{data.total}</td>
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

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #eaecf3', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Distribuição de Oportunidades</h3>
          </div>
          {donutData.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">Sem oportunidades</div>
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
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {convStats && (
            <div className="flex items-center gap-4 px-6 pb-4">
              <div className="flex-1 text-center border-r border-slate-100">
                <div className="text-2xl font-bold text-slate-800">{convStats.open}</div>
                <div className="text-xs text-slate-400 mt-0.5">Conversas abertas</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-800">{convStats.resolved}</div>
                <div className="text-xs text-slate-400 mt-0.5">Resolvidas</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
