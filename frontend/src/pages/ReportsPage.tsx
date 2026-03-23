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
import { Users, TrendingUp, DollarSign, CheckSquare } from 'lucide-react'

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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Total Contactos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalContacts ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {summary?.totalLeads ?? 0} leads • {summary?.totalClients ?? 0} clientes
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Oportunidades Abertas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.openOpportunities ?? 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Valor Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.pipelineValue ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {summary?.closedWonThisMonth ?? 0} fechados este mês
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Tarefas Hoje</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.tasksDueToday ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Bar Chart */}
        <Card title="Oportunidades por Fase">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
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
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sem dados de pipeline
            </div>
          )}
        </Card>

        {/* Value by Stage */}
        <Card title="Valor por Fase">
          {pipelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
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
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Sem dados
            </div>
          )}
        </Card>
      </div>

      {/* Agent Performance (ADMIN only) */}
      {user?.role === 'ADMIN' && (
        <Card title="Performance por Agente">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sem dados de performance</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Agente</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Função</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Contactos</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Oportunidades</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Fechados (Ganhos)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agents.map((perf, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {perf.agent?.name ? perf.agent.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-medium text-gray-900">{perf.agent?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default" small>
                          {ROLE_LABELS[perf.agent?.role] || perf.agent?.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 font-medium">{perf.contacts}</td>
                      <td className="py-3 px-4 text-right text-gray-700 font-medium">{perf.openOpportunities}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-green-700">{perf.closedWon}</span>
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
