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

export interface Condition {
  field: string // e.g. 'contact.email', 'contact.status', 'contact.score'
  operator: ConditionOperator
  value?: string | number | boolean
}

// ─── STEP TYPES ─────────────────────────────────────────────────────────────

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

export interface ActionStep {
  id: string
  type: 'action'
  actionType: ActionType
  config: {
    // send_email
    to?: string
    subject?: string
    body?: string
    // send_whatsapp / send_sms
    message?: string
    // create_task
    title?: string
    description?: string
    dueInDays?: number
    assignTo?: string
    // change_stage
    newStage?: string
    // add_tag / remove_tag
    tag?: string
    // update_field
    field?: string
    value?: string
    // send_webhook
    url?: string
    method?: string
    headers?: Record<string, string>
    webhookBody?: string
    // notify_user
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
  trueBranchStepId?: string  // step id to go to if true
  falseBranchStepId?: string // step id to go to if false
}

export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks'

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
  stepIds: string[] // ids of steps inside the loop
}

export type Step = ActionStep | ConditionStep | DelayStep | WaitEventStep | LoopStep

// ─── CONTEXT ────────────────────────────────────────────────────────────────

export interface AutomationContext {
  contactId: string
  contact: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    whatsapp?: string | null
    status?: string
    score?: number
    tags?: string | null
    stage?: string | null
    assignedTo?: {
      id: string
      name: string
      email?: string
      phone?: string | null
    } | null
  }
  triggerData?: Record<string, any>
  loopIteration?: number
  [key: string]: any
}
