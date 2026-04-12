// ─── TRIGGERS ───────────────────────────────────────────────────────────────

export type TriggerType =
  | 'lead_created'
  | 'lead_stage_changed'
  | 'lead_assigned'
  | 'lead_tag_added'
  | 'property_added'
  | 'form_submitted'
  | 'scheduled'

export interface AutomationTriggerConfig {
  type: TriggerType
  config?: Record<string, any>
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  lead_created: 'Lead criado',
  lead_stage_changed: 'Etapa do lead alterada',
  lead_assigned: 'Lead atribuído a consultor',
  lead_tag_added: 'Tag adicionada ao lead',
  property_added: 'Imóvel adicionado',
  form_submitted: 'Formulário submetido',
  scheduled: 'Agendado (cron)',
}

// ─── CONDITIONS ─────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'has_tag'
  | 'not_has_tag'

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'é igual a',
  not_equals: 'não é igual a',
  contains: 'contém',
  not_contains: 'não contém',
  is_empty: 'está vazio',
  is_not_empty: 'não está vazio',
  greater_than: 'maior que',
  less_than: 'menor que',
  has_tag: 'tem tag',
  not_has_tag: 'não tem tag',
}

export interface Condition {
  field: string
  operator: ConditionOperator
  value?: string | number | boolean
}

// ─── STEPS ──────────────────────────────────────────────────────────────────

export type StepType = 'action' | 'condition' | 'delay' | 'wait_event' | 'loop'

export type ActionType =
  | 'send_email'
  | 'send_whatsapp'
  | 'send_sms'
  | 'create_task'
  | 'change_stage'
  | 'add_tag'
  | 'remove_tag'
  | 'update_field'
  | 'send_webhook'
  | 'notify_user'

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'Enviar Email',
  send_whatsapp: 'Enviar WhatsApp',
  send_sms: 'Enviar SMS',
  create_task: 'Criar Tarefa',
  change_stage: 'Alterar Etapa',
  add_tag: 'Adicionar Tag',
  remove_tag: 'Remover Tag',
  update_field: 'Atualizar Campo',
  send_webhook: 'Enviar Webhook',
  notify_user: 'Notificar Utilizador',
}

export interface ActionStep {
  id: string
  type: 'action'
  actionType: ActionType
  config: {
    to?: string
    subject?: string
    body?: string
    message?: string
    title?: string
    description?: string
    dueInDays?: number
    assignTo?: string
    newStage?: string
    tag?: string
    field?: string
    value?: string
    url?: string
    method?: string
    headers?: Record<string, string>
    webhookBody?: string
    userId?: string
    notifyMessage?: string
    [key: string]: any
  }
}

export interface ConditionStep {
  id: string
  type: 'condition'
  label?: string
  conditions: Condition[]
  logic: 'AND' | 'OR'
  trueBranchStepId?: string
  falseBranchStepId?: string
}

export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks'

export const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
  minutes: 'minutos',
  hours: 'horas',
  days: 'dias',
  weeks: 'semanas',
}

export interface DelayStep {
  id: string
  type: 'delay'
  duration: number
  unit: DelayUnit
}

export type WaitEvent =
  | 'email_opened'
  | 'email_clicked'
  | 'lead_replied'
  | 'stage_changed'
  | 'tag_added'
  | 'form_submitted'

export const WAIT_EVENT_LABELS: Record<WaitEvent, string> = {
  email_opened: 'Email aberto',
  email_clicked: 'Link clicado no email',
  lead_replied: 'Lead respondeu',
  stage_changed: 'Etapa alterada',
  tag_added: 'Tag adicionada',
  form_submitted: 'Formulário submetido',
}

export interface WaitEventStep {
  id: string
  type: 'wait_event'
  event: WaitEvent | string
  timeoutDays?: number
  onTimeout: 'continue' | 'stop'
}

export interface LoopStep {
  id: string
  type: 'loop'
  maxIterations: number
  exitCondition: Condition[]
  stepIds: string[]
}

export type Step = ActionStep | ConditionStep | DelayStep | WaitEventStep | LoopStep

// ─── AUTOMATION V2 ──────────────────────────────────────────────────────────

export interface AutomationV2 {
  id: string
  agencyId: string
  name: string
  description?: string
  isActive: boolean
  trigger: AutomationTriggerConfig
  steps: Step[]
  createdAt: string
  updatedAt: string
  _count?: {
    enrollments: number
    runs: number
  }
}

// ─── ENROLLMENT ─────────────────────────────────────────────────────────────

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
  FAILED: 'Falhado',
  CANCELLED: 'Cancelado',
}

export interface AutomationEnrollment {
  id: string
  automationId: string
  contactId: string
  contact?: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  }
  status: EnrollmentStatus
  currentStepId?: string | null
  waitingUntil?: string | null
  waitingForEvent?: string | null
  context: Record<string, any>
  startedAt: string
  finishedAt?: string | null
}
