import api from './client'

export const getReportSummary = () => api.get('/reports/summary')
export const getReportPipeline = () => api.get('/reports/pipeline')
export const getAgentPerformance = () => api.get('/reports/agent-performance')
export const getConversationStats = () => api.get('/reports/conversations')
