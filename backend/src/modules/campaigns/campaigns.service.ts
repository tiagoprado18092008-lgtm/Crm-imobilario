import prisma from '../../config/database';
import nodemailer from 'nodemailer';

const select = {
  id: true, name: true, subject: true, status: true, type: true,
  scheduledAt: true, sentAt: true, sentCount: true, openCount: true, clickCount: true,
  targetFilter: true, createdById: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { recipients: true } },
  createdAt: true, updatedAt: true,
};

const buildWhereClause = async (user: any): Promise<any> => {
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) return { createdBy: { agencyId: user.agencyId } };
    return { createdById: user.id };
  }
  if (user.role === 'TEAM_LEADER') {
    const subAgents = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    return { createdById: { in: [user.id, ...subAgents.map((a: any) => a.id)] } };
  }
  return { createdById: user.id };
};

export const list = async (user: any) => {
  const where = await buildWhereClause(user);
  return prisma.emailCampaign.findMany({ where, select, orderBy: { createdAt: 'desc' } });
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const c = await prisma.emailCampaign.findFirst({
    where,
    include: { createdBy: { select: { id: true, name: true } }, recipients: { take: 100 } },
  });
  if (!c) throw Object.assign(new Error('Campanha não encontrada'), { status: 404 });
  return c;
};

export const create = async (userId: string, dto: any) => {
  return prisma.emailCampaign.create({
    data: {
      name: dto.name,
      subject: dto.subject,
      body: dto.body,
      type: dto.type || 'BROADCAST',
      targetFilter: JSON.stringify(dto.targetFilter || {}),
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdById: userId,
    },
    select,
  });
};

export const update = async (id: string, dto: any, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.emailCampaign.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Campanha não encontrada ou acesso negado'), { status: 404 });

  const data: any = {};
  if (dto.name) data.name = dto.name;
  if (dto.subject) data.subject = dto.subject;
  if (dto.body) data.body = dto.body;
  if (dto.status) data.status = dto.status;
  if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
  if (dto.targetFilter) data.targetFilter = JSON.stringify(dto.targetFilter);
  return prisma.emailCampaign.update({ where: { id }, data, select });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.emailCampaign.findFirst({ where });
  if (!existing) throw Object.assign(new Error('Campanha não encontrada ou acesso negado'), { status: 404 });

  await prisma.emailCampaignRecipient.deleteMany({ where: { campaignId: id } });
  await prisma.emailCampaign.delete({ where: { id } });
};

export const send = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const campaign = await prisma.emailCampaign.findFirst({ where });
  if (!campaign) throw Object.assign(new Error('Campanha não encontrada'), { status: 404 });
  if (campaign.status === 'SENT') throw Object.assign(new Error('Campanha já enviada'), { status: 400 });

  // Build recipient list from target filter
  const filter = JSON.parse(campaign.targetFilter || '{}');
  const contactWhere: any = {};
  if (filter.type) contactWhere.type = filter.type;
  if (filter.status) contactWhere.status = filter.status;
  const contacts = await prisma.contact.findMany({ where: contactWhere, select: { id: true, email: true, name: true } });
  const withEmail = contacts.filter(c => c.email);

  await prisma.emailCampaign.update({ where: { id }, data: { status: 'SENDING' } });

  // Create recipient records
  await prisma.emailCampaignRecipient.createMany({
    data: withEmail.map(c => ({ campaignId: id, contactId: c.id, email: c.email! })),
    skipDuplicates: true,
  });

  // Send via SMTP if configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  let sentCount = 0;
  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: smtpUser, pass: smtpPass },
    });

    for (const contact of withEmail) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || smtpUser,
          to: contact.email!,
          subject: campaign.subject,
          html: campaign.body,
        });
        await prisma.emailCampaignRecipient.updateMany({
          where: { campaignId: id, contactId: contact.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        sentCount++;
      } catch (_) {}
    }
  } else {
    sentCount = withEmail.length; // demo mode
  }

  return prisma.emailCampaign.update({
    where: { id },
    data: { status: 'SENT', sentAt: new Date(), sentCount },
    select,
  });
};

export const getStats = async (id: string) => {
  const recipients = await prisma.emailCampaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId: id },
    _count: true,
  });
  return recipients;
};
