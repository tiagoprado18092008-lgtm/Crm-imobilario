import prisma from '../config/database';
import { sendWhatsAppMessage } from './whatsapp.service';
import { sendEmail } from './email.service';
import { sendSMS } from './twilio.service';
import { eventBus } from './event-bus';

export type TriggerType =
  | 'NEW_LEAD'
  | 'VISIT_SCHEDULED'
  | 'MISSED_CALL'
  | 'NO_RESPONSE_2H'
  | 'LEAD_QUALIFIED'
  | 'PROPOSAL_SENT';

export interface AutomationAction {
  type: 'SEND_WHATSAPP' | 'SEND_EMAIL' | 'SEND_SMS' | 'CREATE_TASK';
  delay: number; // minutes
  message: string;
  subject?: string;
}

interface ContactContext {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  assignedTo?: { name: string; phone?: string | null } | null;
}

// Substitui variáveis no template
function renderTemplate(template: string, contact: ContactContext): string {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name)
    .replace(/\{\{consultor\}\}/gi, contact.assignedTo?.name || 'o consultor')
    .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }))
    .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString('pt-PT'))
}

// Executa uma ação individual
async function executeAction(action: AutomationAction, contact: ContactContext): Promise<void> {
  const message = renderTemplate(action.message, contact)

  switch (action.type) {
    case 'SEND_WHATSAPP': {
      const dest = contact.whatsapp || contact.phone
      if (dest) {
        await sendWhatsAppMessage(dest, message)
      } else {
        console.log(`[Automation] WhatsApp skip — no number for ${contact.name}`)
      }
      break
    }
    case 'SEND_SMS': {
      const dest = contact.phone || contact.whatsapp
      if (dest) {
        await sendSMS(dest, message)
      } else {
        console.log(`[Automation] SMS skip — no number for ${contact.name}`)
      }
      break
    }
    case 'SEND_EMAIL': {
      if (contact.email) {
        await sendEmail({
          to: contact.email,
          subject: action.subject ? renderTemplate(action.subject, contact) : 'Mensagem do seu consultor',
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          text: message,
        })
      } else {
        console.log(`[Automation] Email skip — no email for ${contact.name}`)
      }
      break
    }
    case 'CREATE_TASK': {
      await prisma.task.create({
        data: {
          title: message,
          assignedToId: contact.assignedTo ? (await prisma.user.findFirst({ where: { name: contact.assignedTo.name } }))?.id || '' : '',
          status: 'PENDING',
          priority: 'HIGH',
          contactId: contact.id,
          dueDate: new Date(Date.now() + (action.delay || 0) * 60 * 1000),
        },
      }).catch(err => console.error('[Automation] Task create error:', err))
      break
    }
  }
}

// Executa todas as automações para um trigger
export async function fireTrigger(
  trigger: TriggerType,
  contactId: string
): Promise<void> {
  try {
    // Carrega automações ativas para este trigger
    const rules = await prisma.automationRule.findMany({
      where: { trigger, isActive: true },
    })

    if (rules.length === 0) return

    // Carrega contexto do contacto
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        assignedTo: { select: { name: true, phone: true } },
      },
    })

    if (!contact) return

    const ctx: ContactContext = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      email: contact.email,
      assignedTo: contact.assignedTo,
    }

    // Executa cada regra
    for (const rule of rules) {
      const actions: AutomationAction[] = JSON.parse(rule.actions)

      let status = 'SUCCESS'
      let error: string | undefined

      try {
        for (const action of actions) {
          if (action.delay > 0) {
            // Ações com delay são agendadas
            setTimeout(async () => {
              try {
                await executeAction(action, ctx)
              } catch (err: any) {
                console.error(`[Automation] Delayed action error:`, err.message)
              }
            }, action.delay * 60 * 1000)
          } else {
            // Ações imediatas
            await executeAction(action, ctx)
          }
        }
      } catch (err: any) {
        status = 'FAILED'
        error = err.message
        console.error(`[Automation] Rule "${rule.name}" failed:`, err.message)
      }

      // Regista log
      await prisma.automationLog.create({
        data: {
          ruleId: rule.id,
          contactId,
          trigger,
          status,
          error,
        },
      }).catch(() => {}) // log errors don't break execution
    }
  } catch (err: any) {
    console.error(`[Automation Engine] Error:`, err.message)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V2 AUTOMATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import type {
  AutomationContext,
  Step,
  ActionStep,
  ConditionStep,
  DelayStep,
  WaitEventStep,
  LoopStep,
  Condition,
  ConditionOperator,
} from '../types/automation.types'

// Helper: resolve a dot-notation path from an object
function resolvePath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// Helper: delay unit to milliseconds
function unitToMs(duration: number, unit: string): number {
  const units: Record<string, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  }
  return duration * (units[unit] || 60 * 1000)
}

export class AutomationEngine {
  // ── Template resolution ───────────────────────────────────────────────────
  resolveTemplate(text: string, ctx: AutomationContext): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const val = resolvePath(ctx as any, path.trim())
      if (val === undefined || val === null) return ''
      return String(val)
    })
  }

  // ── Condition evaluation ──────────────────────────────────────────────────
  evaluateCondition(condition: Condition, ctx: AutomationContext): boolean {
    const raw = resolvePath(ctx as any, condition.field)
    const fieldVal = raw === undefined || raw === null ? '' : String(raw)
    const condVal = condition.value !== undefined ? String(condition.value) : ''

    switch (condition.operator as ConditionOperator) {
      case 'equals':        return fieldVal === condVal
      case 'not_equals':    return fieldVal !== condVal
      case 'contains':      return fieldVal.toLowerCase().includes(condVal.toLowerCase())
      case 'not_contains':  return !fieldVal.toLowerCase().includes(condVal.toLowerCase())
      case 'is_empty':      return fieldVal === '' || fieldVal === 'null'
      case 'is_not_empty':  return fieldVal !== '' && fieldVal !== 'null'
      case 'greater_than':  return parseFloat(fieldVal) > parseFloat(condVal)
      case 'less_than':     return parseFloat(fieldVal) < parseFloat(condVal)
      case 'has_tag': {
        try { const tags = JSON.parse(fieldVal); return Array.isArray(tags) && tags.includes(condVal) }
        catch { return fieldVal.includes(condVal) }
      }
      case 'not_has_tag': {
        try { const tags = JSON.parse(fieldVal); return Array.isArray(tags) && !tags.includes(condVal) }
        catch { return !fieldVal.includes(condVal) }
      }
      default: return false
    }
  }

  evaluateConditions(conditions: Condition[], logic: 'AND' | 'OR', ctx: AutomationContext): boolean {
    if (conditions.length === 0) return true
    if (logic === 'AND') return conditions.every(c => this.evaluateCondition(c, ctx))
    return conditions.some(c => this.evaluateCondition(c, ctx))
  }

  // ── Action execution ──────────────────────────────────────────────────────
  async executeActionStep(step: ActionStep, ctx: AutomationContext, enrollmentId: string): Promise<void> {
    const resolve = (s?: string) => s ? this.resolveTemplate(s, ctx) : ''
    let output: any = null
    let error: string | undefined

    try {
      switch (step.actionType) {
        case 'send_email': {
          const to = resolve(step.config.to) || ctx.contact.email || ''
          if (to) {
            await sendEmail({
              to,
              subject: resolve(step.config.subject) || 'Mensagem do seu consultor',
              html: `<p>${resolve(step.config.body).replace(/\n/g, '<br>')}</p>`,
              text: resolve(step.config.body),
            })
            output = { to }
          }
          break
        }
        case 'send_whatsapp': {
          const dest = resolve(step.config.to) || ctx.contact.whatsapp || ctx.contact.phone || ''
          if (dest) {
            await sendWhatsAppMessage(dest, resolve(step.config.message))
            output = { dest }
          }
          break
        }
        case 'send_sms': {
          const dest = resolve(step.config.to) || ctx.contact.phone || ''
          if (dest) {
            await sendSMS(dest, resolve(step.config.message))
            output = { dest }
          }
          break
        }
        case 'create_task': {
          const assignedToId = step.config.assignTo || ctx.contact.assignedTo?.id
          if (assignedToId) {
            const task = await prisma.task.create({
              data: {
                title: resolve(step.config.title) || 'Tarefa automática',
                description: resolve(step.config.description),
                assignedToId,
                status: 'PENDING',
                priority: 'MEDIUM',
                contactId: ctx.contactId,
                dueDate: step.config.dueInDays
                  ? new Date(Date.now() + step.config.dueInDays * 24 * 60 * 60 * 1000)
                  : undefined,
              },
            })
            output = { taskId: task.id }
          }
          break
        }
        case 'change_stage': {
          await prisma.contact.update({
            where: { id: ctx.contactId },
            data: { status: step.config.newStage || '' },
          })
          output = { newStage: step.config.newStage }
          break
        }
        case 'add_tag': {
          const contact = await prisma.contact.findUnique({ where: { id: ctx.contactId } })
          if (contact && step.config.tag) {
            let tags: string[] = []
            try { tags = JSON.parse(contact.preferences || '[]') } catch {}
            if (!tags.includes(step.config.tag)) tags.push(step.config.tag)
            await prisma.contact.update({
              where: { id: ctx.contactId },
              data: { preferences: JSON.stringify(tags) },
            })
          }
          break
        }
        case 'remove_tag': {
          const contact = await prisma.contact.findUnique({ where: { id: ctx.contactId } })
          if (contact && step.config.tag) {
            let tags: string[] = []
            try { tags = JSON.parse(contact.preferences || '[]') } catch {}
            tags = tags.filter(t => t !== step.config.tag)
            await prisma.contact.update({
              where: { id: ctx.contactId },
              data: { preferences: JSON.stringify(tags) },
            })
          }
          break
        }
        case 'update_field': {
          if (step.config.field) {
            await prisma.contact.update({
              where: { id: ctx.contactId },
              data: { [step.config.field]: resolve(step.config.value) },
            })
          }
          break
        }
        case 'send_webhook': {
          if (step.config.url) {
            const res = await fetch(resolve(step.config.url), {
              method: step.config.method || 'POST',
              headers: { 'Content-Type': 'application/json', ...(step.config.headers || {}) },
              body: resolve(step.config.webhookBody) || JSON.stringify(ctx),
            })
            output = { status: res.status }
          }
          break
        }
        case 'notify_user': {
          // SSE notification via in-memory store (no persistent model)
          console.log(`[AutomationEngine] notify_user: userId=${step.config.userId}, message=${resolve(step.config.notifyMessage)}`)
          output = { notified: step.config.userId }
          break
        }
      }
    } catch (err: any) {
      error = err.message
      console.error(`[AutomationEngine] Action ${step.actionType} failed:`, err.message)
    }

    // Log the run
    const automation = await prisma.automationEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { automationId: true },
    })

    await prisma.automationRun.create({
      data: {
        automationId: automation?.automationId || '',
        enrollmentId,
        stepId: step.id,
        status: error ? 'FAILED' : 'SUCCESS',
        input: { stepType: step.actionType, config: step.config } as any,
        output: output as any,
        error,
      },
    }).catch(() => {})
  }

  // ── Step processor ────────────────────────────────────────────────────────
  async processStep(
    step: Step,
    enrollment: any,
    steps: Step[]
  ): Promise<{ result: 'continue' | 'pause' | 'end'; nextStepId?: string }> {
    switch (step.type) {
      case 'action': {
        const ctx = enrollment._ctx as AutomationContext
        await this.executeActionStep(step as ActionStep, ctx, enrollment.id)
        return { result: 'continue' }
      }

      case 'condition': {
        const s = step as ConditionStep
        const ctx = enrollment._ctx as AutomationContext
        const pass = this.evaluateConditions(s.conditions, s.logic, ctx)
        const nextId = pass ? s.trueBranchStepId : s.falseBranchStepId
        if (!nextId) return { result: 'continue' }
        return { result: 'continue', nextStepId: nextId }
      }

      case 'delay': {
        const s = step as DelayStep
        const waitUntil = new Date(Date.now() + unitToMs(s.duration, s.unit))
        const currentIdx = steps.findIndex(x => x.id === step.id)
        const nextStep = steps[currentIdx + 1]
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: {
            waitingUntil: waitUntil,
            currentStepId: nextStep?.id || null,
          },
        })
        return { result: 'pause' }
      }

      case 'wait_event': {
        const s = step as WaitEventStep
        const currentIdx = steps.findIndex(x => x.id === step.id)
        const nextStep = steps[currentIdx + 1]
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: {
            waitingForEvent: s.event,
            currentStepId: nextStep?.id || null,
          },
        })
        return { result: 'pause' }
      }

      case 'loop': {
        const s = step as LoopStep
        const ctx = enrollment._ctx as AutomationContext
        const iteration = (ctx.loopIteration || 0) + 1
        ctx.loopIteration = iteration

        // Check exit condition
        const shouldExit =
          iteration > s.maxIterations ||
          this.evaluateConditions(s.exitCondition, 'AND', ctx)

        if (shouldExit) {
          return { result: 'continue' }
        }

        // Execute loop steps
        const loopSteps = steps.filter(x => s.stepIds.includes(x.id))
        for (const loopStep of loopSteps) {
          const res = await this.processStep(loopStep, enrollment, steps)
          if (res.result === 'pause') return { result: 'pause' }
          if (res.result === 'end') return { result: 'end' }
        }

        // Update context with new iteration count
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: { context: ctx as any },
        })

        return { result: 'continue' }
      }

      default:
        return { result: 'continue' }
    }
  }

  // ── Enrollment processor ──────────────────────────────────────────────────
  async processEnrollment(enrollmentId: string): Promise<void> {
    try {
      const enrollment = await prisma.automationEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          automation: true,
          contact: {
            include: { assignedTo: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
      })

      if (!enrollment || enrollment.status !== 'ACTIVE') return

      const steps = (enrollment.automation.steps as unknown as Step[]) || []
      if (steps.length === 0) {
        await prisma.automationEnrollment.update({
          where: { id: enrollmentId },
          data: { status: 'COMPLETED', finishedAt: new Date() },
        })
        return
      }

      // Build context
      const ctx: AutomationContext = {
        contactId: enrollment.contactId,
        contact: {
          id: enrollment.contact.id,
          name: enrollment.contact.name,
          email: enrollment.contact.email,
          phone: enrollment.contact.phone,
          whatsapp: enrollment.contact.whatsapp,
          status: enrollment.contact.status,
          score: enrollment.contact.score,
          assignedTo: enrollment.contact.assignedTo,
        },
        triggerData: (enrollment.context as any)?.triggerData || {},
        loopIteration: (enrollment.context as any)?.loopIteration || 0,
      }

      // Attach ctx to enrollment for processStep access
      ;(enrollment as any)._ctx = ctx

      // Find starting step
      let currentStepId = enrollment.currentStepId
      let startIdx = currentStepId ? steps.findIndex(s => s.id === currentStepId) : 0
      if (startIdx < 0) startIdx = 0

      // Walk steps
      for (let i = startIdx; i < steps.length; i++) {
        const step = steps[i]

        // Update current step pointer
        await prisma.automationEnrollment.update({
          where: { id: enrollmentId },
          data: { currentStepId: step.id },
        })

        const { result, nextStepId } = await this.processStep(step, enrollment, steps)

        if (result === 'pause') return

        if (result === 'end') {
          await prisma.automationEnrollment.update({
            where: { id: enrollmentId },
            data: { status: 'COMPLETED', finishedAt: new Date() },
          })
          return
        }

        // If condition branched to a specific step
        if (nextStepId) {
          const targetIdx = steps.findIndex(s => s.id === nextStepId)
          if (targetIdx >= 0) { i = targetIdx - 1 } // -1 because loop will increment
        }
      }

      // All steps done
      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED', finishedAt: new Date() },
      })
    } catch (err: any) {
      console.error(`[AutomationEngine] processEnrollment error:`, err.message)
      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'FAILED' },
      }).catch(() => {})
    }
  }

  // ── Enroll contact ────────────────────────────────────────────────────────
  async enrollContact(
    automationId: string,
    contactId: string,
    triggerData?: Record<string, any>
  ): Promise<void> {
    // Avoid duplicate active enrollments
    const existing = await prisma.automationEnrollment.findFirst({
      where: { automationId, contactId, status: 'ACTIVE' },
    })
    if (existing) return

    const enrollment = await prisma.automationEnrollment.create({
      data: {
        automationId,
        contactId,
        status: 'ACTIVE',
        context: { triggerData: triggerData || {} } as any,
      },
    })

    // Process immediately
    await this.processEnrollment(enrollment.id)
  }

  // ── Resume delayed enrollments (cron) ─────────────────────────────────────
  async resumeDelayedEnrollments(): Promise<void> {
    const enrollments = await prisma.automationEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        waitingUntil: { lte: new Date() },
        waitingForEvent: null,
      },
      select: { id: true },
    })

    // Clear waitingUntil and resume
    await Promise.allSettled(
      enrollments.map(async e => {
        await prisma.automationEnrollment.update({
          where: { id: e.id },
          data: { waitingUntil: null },
        })
        await this.processEnrollment(e.id)
      })
    )

    if (enrollments.length > 0) {
      console.log(`[AutomationCron] Resumed ${enrollments.length} delayed enrollment(s)`)
    }
  }

  // ── Resume on event ───────────────────────────────────────────────────────
  async resumeOnEvent(event: string, contactId: string): Promise<void> {
    const enrollments = await prisma.automationEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        waitingForEvent: event,
        contactId,
      },
      select: { id: true },
    })

    await Promise.allSettled(
      enrollments.map(async e => {
        await prisma.automationEnrollment.update({
          where: { id: e.id },
          data: { waitingForEvent: null },
        })
        await this.processEnrollment(e.id)
      })
    )
  }
}

export const automationEngine = new AutomationEngine()

// V2 event listener: maps v1 trigger events to v2 automation enrollments
let _v2ListenersRegistered = false

export function registerV2EventListeners(): void {
  if (_v2ListenersRegistered) return
  _v2ListenersRegistered = true

  const V2_TRIGGER_MAP: Record<string, string> = {
    NEW_LEAD: 'lead_created',
    LEAD_QUALIFIED: 'lead_stage_changed',
  }

  for (const [v1Event, v2Type] of Object.entries(V2_TRIGGER_MAP)) {
    eventBus.on(`trigger:${v1Event}`, async (contactId: string) => {
      try {
        const contact = await prisma.contact.findUnique({
          where: { id: contactId },
          select: { assignedToId: true, assignedTo: { select: { agencyId: true } } },
        })
        const agencyId = contact?.assignedTo?.agencyId
        if (!agencyId) return

        const automations = await prisma.automation.findMany({
          where: { agencyId, isActive: true },
        })

        const matching = automations.filter((a: any) => {
          const trigger = a.trigger as any
          return trigger?.type === v2Type
        })

        await Promise.allSettled(
          matching.map((a: any) => automationEngine.enrollContact(a.id, contactId, { source: v1Event }))
        )
      } catch (err: any) {
        console.error(`[AutomationEngine V2] Event handler error for ${v1Event}:`, err.message)
      }
    })
  }

  console.log('[Automation Engine V2] Event listeners registered')
}

// ═══════════════════════════════════════════════════════════════════════════
// V1 LEGACY CODE (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGER_EVENTS: TriggerType[] = [
  'NEW_LEAD',
  'VISIT_SCHEDULED',
  'MISSED_CALL',
  'NO_RESPONSE_2H',
  'LEAD_QUALIFIED',
  'PROPOSAL_SENT',
]

let _listenersRegistered = false

export function registerEventListeners(): void {
  if (_listenersRegistered) return
  _listenersRegistered = true

  for (const trigger of TRIGGER_EVENTS) {
    eventBus.on(`trigger:${trigger}`, (contactId: string) => {
      fireTrigger(trigger, contactId).catch(err =>
        console.error(`[Automation] Event handler error for ${trigger}:`, err.message)
      )
    })
  }

  console.log('[Automation Engine] Event listeners registered for:', TRIGGER_EVENTS.join(', '))
}
