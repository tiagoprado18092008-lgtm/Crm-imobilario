import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getReportSummary, getReportPipeline, getAgentPerformance } from '../api/reports.api'
import type { ReportSummary, PipelineStage, AgentPerformance } from '../types'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { useUIStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { formatCurrency } from '../utils/formatters'
import { STAGE_LABELS, ROLE_LABELS } from '../utils/constants'
import { Users, TrendingUp, DollarSign, CheckSquare, Download } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { exportContacts, exportOpportunities } from '../api/exports.api'
import { downloadBlob } from '../utils/download'

const FUNNEL_COLORS = [
  '#64748b', '#3b82f6', '#f59e0b', '#f97316', '#8b5cf6', '#22c55e', '#ef4444'
]

export const ReportsPage: React.FC = () => {
  const { showToast } = useUIStore()
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [agents, setAgents] = useState<AgentPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const promises: Promise<any>[] = [getReportSummary(), getReportPipeline()]
        if (user?.role === 'ADMIN') promises.push(getAgentPerformance())
        const results = await Promise.all(promises)
        setSummary(results[0].data)
        setPipeline(results[1].data || [])
        if (results[2]) setAgents(results[2].data || [])
      } catch {
        showToast('Erro ao carregar relatórios', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) return <PageSpinner />

  const pipelineChartData = pipeline.map((p, i) => ({
    stage: STAGE_LABELS[p.stage] || p.stage,
    count: p.count,
    totalValue: p.totalValue,
    fill: FUNNEL_COLORS[i] || '#64748b'
  }))

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe' }}>
              <Users className="w-5 h-5" style={{ color: '#2563eb' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Contactos</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.totalContacts ?? 0}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {summary?.totalLeads ?? 0} leads • {summary?.totalClients ?? 0} clientes
          </p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#7c3aed' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Oportunidades Abertas</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.openOpportunities ?? 0}</p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Valor Pipeline</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary?.pipelineValue ?? 0)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {summary?.closedWonThisMonth ?? 0} fechados este mês
          </p>
        </div>

        <div className="rounded-xl border shadow-sm p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ffedd5' }}>
              <CheckSquare className="w-5 h-5" style={{ color: '#ea580c' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tarefas Hoje</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary?.tasksDueToday ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Bar Chart */}
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
                  formatter={(value: any, name: any) => [
                    name === 'count' ? value + ' oportunidades' : formatCurrency(Number(value)),
                    name === 'count' ? 'Quantidade' : 'Valor'
                  ]}
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

        {/* Value by Stage */}
        <Card title="Valor por Fase">
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
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sem dados
            </div>
          )}
        </Card>
      </div>

      {/* Agent Performance (ADMIN only) */}
      {user?.role === 'ADMIN' && (
        <Card title="Performance por Agente">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados de performance</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Agente</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Função</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Contactos</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Oportunidades</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Fechados (Ganhos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {agents.map((perf, i) => (
                    <tr key={i}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                            {perf.agent?.name ? perf.agent.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{perf.agent?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default" small>
                          {ROLE_LABELS[perf.agent?.role] || perf.agent?.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>{perf.contacts}</td>
                      <td className="py-3 px-4 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>{perf.openOpportunities}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold" style={{ color: '#16a34a' }}>{perf.closedWon}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
