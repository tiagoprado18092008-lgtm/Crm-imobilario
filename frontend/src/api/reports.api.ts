import api from './client'

interface ReportFilters {
  from?: string
  to?: string
  assignedToId?: string
}

export const getReportSummary = (params?: ReportFilters) => api.get('/reports/summary', { params })
export const getReportPipeline = (params?: ReportFilters) => api.get('/reports/pipeline', { params })
export const getAgentPerformance = () => api.get('/reports/agent-performance')
export const getConversationStats = () => api.get('/reports/conversations')
