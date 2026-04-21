import prisma from '../../config/database';
import { sendMockEmail, sendMockWhatsApp } from '../../utils/mock-comms';
import { buildScope } from '../../lib/scope';

export const create = async (
  dto: {
    type: string;
    subject?: string;
    body: string;
    direction?: string;
    contactId: string;
    opportunityId?: string;
  },
  userId: string
) => {
  const interaction = await prisma.interaction.create({
    data: {
      type: dto.type as any,
      subject: dto.subject,
      body: dto.body,
      direction: dto.direction ?? 'OUTBOUND',
      contactId: dto.contactId,
      opportunityId: dto.opportunityId,
      createdById: userId,
    },
    include: {
      contact: { select: { id: true, name: true, email: true, whatsapp: true, phone: true } },
      opportunity: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Trigger mock communications
  if (dto.type === 'EMAIL' && interaction.contact.email) {
    await sendMockEmail(
      interaction.contact.email,
      dto.subject ?? '(sem assunto)',
      dto.body
    );
  } else if (dto.type === 'WHATSAPP') {
    const phone = interaction.contact.whatsapp ?? interaction.contact.phone ?? 'unknown';
    await sendMockWhatsApp(phone, dto.body);
  }

  return interaction;
};

export const list = async (filters: {
  contactId?: string;
  opportunityId?: string;
  type?: string;
  page?: number;
  limit?: number;
  user?: any;
}) => {
  let scope: any = {};
  if (filters.user) {
    const u = filters.user;
    if (u.role === 'AGENCY_OWNER' || u.role === 'AGENCY_ADMIN') {
      if (u.agencyId) scope = { createdBy: { agencyId: u.agencyId } };
      else scope = { createdById: u.id };
    } else if (u.role === 'LOCATION_ADMIN') {
      scope = u.locationId ? { createdBy: { locationId: u.locationId } } : { createdById: u.id };
    } else if (u.role === 'TEAM_LEADER') {
      const subs = await prisma.user.findMany({ where: { supervisorId: u.id }, select: { id: true } });
      scope = { createdById: { in: [u.id, ...subs.map((s: any) => s.id)] } };
    } else {
      scope = { createdById: u.id };
    }
  }
  const where: any = { ...scope };
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.opportunityId) where.opportunityId = filters.opportunityId;
  if (filters.type) where.type = filters.type;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, interactions] = await Promise.all([
    prisma.interaction.count({ where }),
    prisma.interaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true } },
        opportunity: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { data: interactions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getById = async (id: string) => {
  const interaction = await prisma.interaction.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      opportunity: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!interaction) {
    const err: any = new Error('Interaction not found');
    err.status = 404;
    throw err;
  }
  return interaction;
};
