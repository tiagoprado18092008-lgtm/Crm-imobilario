import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList
} from 'recharts'
import {
  getReportSummary, getReportPipeline,
  getAgentPerformance, getConversationStats
} from '../api/reports.api'
import type { ReportSummary, PipelineStage, AgentPerformance } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { useUIStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { formatCurrency } from '../utils/formatters'
import { STAGE_LABELS, ROLE_LABELS } from '../utils/constants'
import {
  Users, TrendingUp, DollarSign, CheckSquare,
  Download, MessageSquare, Clock, UserPlus
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { exportContacts, exportOpportunities } from '../api/exports.api'
import { downloadBlob } from '../utils/download'

const FUNNEL_COLORS = ['#3b82f6', '#6366f1', '#f59e0b', '#f97316', '#8b5cf6', '#22c55e', '#ef4444']

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: '#25d366',
  EMAIL: '#3b82f6',
  INSTAGRAM: '#e1306c',
  SMS: '#6b7280',
  INTERNAL: '#8b5cf6',
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  INSTAGRAM: 'Instagram',
  SMS: 'SMS',
  INTERNAL: 'Interno',
}

interface ConversationStats {
  totalConversations: number
  openConversations: number
  resolvedToday: number
  byChannel: { channel: string; count: number }[]
}

export const ReportsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [agents, setAgents] = useState<AgentPerformance[]>([])
  const [convStats, setConvStats] = useState<ConversationStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const isAdmin = user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN'
        const promises: Promise<any>[] = [
          getReportSummary(),
          getReportPipeline(),
          getConversationStats(),
        ]
        if (isAdmin) promises.push(getAgentPerformance())
        const results = await Promise.all(promises)
        setSummary(results[0].data)
        setPipeline(results[1].data || [])
        setConvStats(results[2].data || null)
        if (results[3]) setAgents(results[3].data || [])
      } catch {
        showToast('Erro ao carregar relatórios', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) return <PageSpinner />

  const isAdmin = user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN'

  const closingRate =
    summary && (summary.openOpportunities + summary.closedWonThisMonth) > 0
      ? Math.round((summary.closedWonThisMonth / (summary.openOpportunities + summary.closedWonThisMonth)) * 100)
      : 0

  const pipelineChartData = pipeline.map((p, i) => ({
    stage: STAGE_LABELS[p.stage] || p.stage,
    count: p.count,
    totalValue: p.totalValue,
    fill: FUNNEL_COLORS[i] || '#64748b',
  }))

  const funnelData = pipeline
    .filter((p) => p.stage !== 'CLOSED_LOST')
    .map((p, i) => ({
      name: STAGE_LABELS[p.stage] || p.stage,
      value: p.count,
      fill: FUNNEL_COLORS[i] || '#64748b',
    }))

  const channelData = (convStats?.byChannel || []).map((c) => ({
    name: CHANNEL_LABELS[c.channel] || c.channel,
    count: c.count,
    fill: CHANNEL_COLORS[c.channel] || '#64748b',
  }))

  const sortedAgents = [...agents].sort((a, b) => b.closedWon - a.closedWon)
  const maxClosedWon = sortedAgents.length > 0 ? Math.max(...sortedAgents.map((a) => a.closedWon), 1) : 1

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const res = await exportContacts()
              downloadBlob(res.data, 'contactos.csv')
              showToast('Contactos exportados', 'success')
            } catch { showToast('Erro ao exportar', 'error') }
          }}
        >
          <Download className="w-4 h-4" /> Exportar Contactos
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const res = await exportOpportunities()
              downloadBlob(res.data, 'oportunidades.csv')
              showToast('Oportunidades exportadas', 'success')
            } catch { showToast('Erro ao exportar', 'error') }
          }}
        >
          <Download className="w-4 h-4" /> Exportar Oportunidades
        </Button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe' }}>
              <Users className="w-5 h-5" style={{ color: '#2563eb' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Contactos</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.totalContacts ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {summary?.totalLeads ?? 0} leads • {summary?.totalClients ?? 0} clientes
          </p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <UserPlus className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Novos (30d)</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(summary as any)?.newContactsThisMonth ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>últimos 30 dias</p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#7c3aed' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Oportunidades</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.openOpportunities ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>em aberto</p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pipeline</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary?.pipelineValue ?? 0)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{summary?.closedWonThisMonth ?? 0} fechados/mês</p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <CheckSquare className="w-5 h-5" style={{ color: '#d97706' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Taxa Fecho</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: closingRate >= 20 ? '#16a34a' : 'var(--text-primary)' }}>
            {closingRate}%
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>este mês</p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fce7f3' }}>
              <Clock className="w-5 h-5" style={{ color: '#db2777' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tempo Médio</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(summary as any)?.avgDaysToClose ?? 0}d</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>lead → fecho</p>
        </div>
      </div>

      {/* Row 1: Pipeline bar + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Oportunidades por Fase">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [value + ' oportunidades', 'Quantidade']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sem dados de pipeline
            </div>
          )}
        </Card>

        <Card title="Funil de Conversão">
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [value + ' oportunidades', '']}
                />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                  <LabelList position="right" fill="var(--text-secondary)" stroke="none" dataKey="name" style={{ fontSize: 11 }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sem dados de funil
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Valor por fase + Conversas por canal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Valor por Fase (€)">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valor Total']}
                />
                <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados</div>
          )}
        </Card>

        <Card title="Conversas por Canal">
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={channelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  formatter={(value: any) => [value + ' conversas', 'Total']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {channelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Sem conversas registadas</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Agent Performance */}
      {isAdmin && (
        <Card title="Performance por Agente">
          {sortedAgents.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados de performance</div>
          ) : (
            <div className="space-y-3 py-2">
              {sortedAgents.map((perf, i) => {
                const conversionRate = perf.contacts > 0 ? Math.round((perf.closedWon / perf.contacts) * 100) : 0
                const barWidth = maxClosedWon > 0 ? Math.round((perf.closedWon / maxClosedWon) * 100) : 0
                const initials = perf.agent?.name
                  ? perf.agent.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                  : '?'
                const avatarColors = ['#dbeafe:#1d4ed8', '#ede9fe:#6d28d9', '#dcfce7:#166534', '#fef3c7:#92400e', '#fce7f3:#9d174d']
                const [bg, fg] = (avatarColors[i % avatarColors.length]).split(':')
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg"
                    style={{ background: 'var(--bg-subtle, #f8fafc)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: bg, color: fg }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{perf.agent?.name || 'N/A'}</span>
                        <Badge variant="default" small>{ROLE_LABELS[perf.agent?.role] || perf.agent?.role}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-color)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${barWidth}%`, background: '#22c55e' }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {perf.contacts} contactos · {perf.openOpportunities} abertas · <span style={{ color: '#16a34a', fontWeight: 600 }}>{perf.closedWon} fechos</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: conversionRate >= 20 ? '#16a34a' : 'var(--text-secondary)' }}>
                        {conversionRate}%
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>conv.</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
