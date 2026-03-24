import prisma from '../config/database';
import { sendWhatsAppMessage } from './whatsapp.service';
import { sendEmail } from './email.service';
import { sendSMS } from './twilio.service';

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
