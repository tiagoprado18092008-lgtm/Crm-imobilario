import prisma from '../../config/database'
import { generateTwilioToken, makeOutboundCall, isTwilioConfigured } from '../../utils/twilio.service'

export async function getCallToken(userId: string): Promise<{ token: string; configured: boolean }> {
  if (!isTwilioConfigured()) {
    return { token: '', configured: false }
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const identity = user?.email?.replace(/[^a-zA-Z0-9]/g, '_') || userId
  const token = generateTwilioToken(identity)
  return { token, configured: true }
}

export async function initiateCall(opts: {
  to: string
  contactId?: string
  opportunityId?: string
  userId: string
}): Promise<any> {
  const result = await makeOutboundCall(opts.to)

  // Resolve contactId if not provided
  let contactId = opts.contactId
  if (!contactId) {
    contactId = await getDefaultContact(opts.userId)
  }

  if (!contactId) {
    // Cannot create interaction without a contactId — just return the call result
    return { ...result, interactionId: null }
  }

  const interaction = await prisma.interaction.create({
    data: {
      type: 'CALL',
      body: `Chamada para ${opts.to} | SID: ${result.sid} | Status: ${result.status}`,
      direction: 'OUTBOUND',
      contactId,
      createdById: opts.userId,
      opportunityId: opts.opportunityId,
    },
  })

  return { ...result, interactionId: interaction.id }
}

async function getDefaultContact(userId: string): Promise<string | undefined> {
  const contact = await prisma.contact.findFirst({ where: { assignedToId: userId } })
  return contact?.id
}

export async function listCalls(
  userId: string,
  filters?: { contactId?: string; page?: number; limit?: number }
) {
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const skip = (page - 1) * limit

  const where: any = {
    type: 'CALL',
    createdById: userId,
    ...(filters?.contactId ? { contactId: filters.contactId } : {}),
  }

  const [calls, total] = await Promise.all([
    prisma.interaction.findMany({
      where,
      include: { contact: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.interaction.count({ where }),
  ])

  return { data: calls, total, page, limit }
}

export async function updateCallNotes(id: string, notes: string, _userId: string) {
  return prisma.interaction.update({
    where: { id },
    data: { body: notes },
  })
}
