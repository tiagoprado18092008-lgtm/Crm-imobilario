import api from './client'
import type { AutomationV2, Step, AutomationTriggerConfig } from '../types/automation'

// ─── V1 (legacy) ────────────────────────────────────────────────────────────

export const listAutomations = () => api.get('/automations')
export const getAutomation = (id: string) => api.get(`/automations/${id}`)
export const createAutomation = (data: { name: string; trigger: string; isActive?: boolean; actions: any[] }) =>
  api.post('/automations', data)
export const updateAutomation = (id: string, data: Partial<{ name: string; trigger: string; isActive: boolean; actions: any[] }>) =>
  api.patch(`/automations/${id}`, data)
export const deleteAutomation = (id: string) => api.delete(`/automations/${id}`)
export const getAutomationLogs = (params?: { ruleId?: string; contactId?: string; limit?: number }) =>
  api.get('/automations/logs', { params })

// ─── V2 ─────────────────────────────────────────────────────────────────────

export const listAutomationsV2 = () =>
  api.get<AutomationV2[]>('/automations/v2')

export const getAutomationV2 = (id: string) =>
  api.get<AutomationV2>(`/automations/v2/${id}`)

export const createAutomationV2 = (data: {
  name: string
  description?: string
  trigger: AutomationTriggerConfig
  steps: Step[]
}) => api.post<AutomationV2>('/automations/v2', data)

export const updateAutomationV2 = (
  id: string,
  data: Partial<{
    name: string
    description: string
    isActive: boolean
    trigger: AutomationTriggerConfig
    steps: Step[]
  }>
) => api.put<AutomationV2>(`/automations/v2/${id}`, data)

export const deleteAutomationV2 = (id: string) =>
  api.delete(`/automations/v2/${id}`)

export const toggleAutomationV2 = (id: string) =>
  api.patch<AutomationV2>(`/automations/v2/${id}/toggle`)

export const getEnrollments = (automationId: string) =>
  api.get(`/automations/v2/${automationId}/enrollments`)

export const triggerAutomation = (data: { type: string; contactId: string; data?: Record<string, any> }) =>
  api.post('/automations/trigger', data)

export const fireAutomationEvent = (data: { event: string; contactId: string }) =>
  api.post('/automations/event', data)
