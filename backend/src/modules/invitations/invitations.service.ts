import prisma from '../../config/database';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from '../../lib/email';
import { inviteOwnerTemplate, inviteConsultantTemplate } from '../../lib/email-templates';

const clientUrl = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .pop()!
    .trim();

async function sendInviteEmail(opts: {
  email: string;
  type: string;
  agencyId?: string | null;
  inviterName: string;
  inviteUrl: string;
}): Promise<void> {
  let agencyName = 'a agência';
  if (opts.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: opts.agencyId }, select: { name: true } });
    if (agency) agencyName = agency.name;
  }

  const tpl =
    opts.type === 'OWNER'
      ? inviteOwnerTemplate({ agencyName, inviteUrl: opts.inviteUrl })
      : inviteConsultantTemplate({ agencyName, inviterName: opts.inviterName, inviteUrl: opts.inviteUrl });

  await EmailService.send({ to: opts.email, ...tpl });
}

export const create = async (
  email: string,
  role: string,
  invitedById: string,
  locationId?: string,
  permissions?: any,
  agencyId?: string,
  type?: string,
) => {
  const invType = type || (role === 'AGENCY_OWNER' ? 'OWNER' : 'CONSULTANT');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.isActive) throw Object.assign(new Error('Email já registado na plataforma'), { status: 409 });

  await prisma.invitation.updateMany({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  if (existing && !existing.isActive) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  let resolvedAgencyId = agencyId;
  let resolvedLocationId = locationId;
  const inviter = await prisma.user.findUnique({ where: { id: invitedById } });
  if (inviter) {
    if (!resolvedAgencyId && inviter.agencyId) resolvedAgencyId = inviter.agencyId;
    if (!resolvedLocationId && inviter.locationId) resolvedLocationId = inviter.locationId;
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // For OWNER invites, skip the placeholder user (they may not have an agency yet)
  const [, invitation] = await prisma.$transaction([
    invType !== 'OWNER'
      ? prisma.user.create({
          data: {
            name: '',
            email,
            passwordHash: '',
            role: role as UserRole,
            isActive: false,
            onboardingCompleted: false,
            ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
            ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
          },
        })
      : prisma.user.findFirst({ where: { id: invitedById } }), // no-op placeholder
    prisma.invitation.create({
      data: {
        email,
        role,
        type: invType,
        token,
        invitedById,
        expiresAt,
        ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        ...(permissions ? { permissions } : {}),
      },
    }),
  ]);

  const inviteUrl = `${clientUrl()}/invite/${token}`;
  try {
    await sendInviteEmail({
      email,
      type: invType,
      agencyId: resolvedAgencyId,
      inviterName: inviter?.name || 'CasaFlow',
      inviteUrl,
    });
  } catch (err: any) {
    console.error(`[invite] Email send failed for ${email}:`, err.message);
  }

  return invitation;
};

export const resend = async (id: string) => {
  const inv = await prisma.invitation.findUnique({ where: { id } });
  if (!inv) throw Object.assign(new Error('Convite não encontrado'), { status: 404 });
  if (inv.usedAt) throw Object.assign(new Error('Convite já utilizado'), { status: 410 });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const updated = await prisma.invitation.update({
    where: { id },
    data: { token, expiresAt },
  });

  const inviter = await prisma.user.findUnique({ where: { id: inv.invitedById } });
  const inviteUrl = `${clientUrl()}/invite/${token}`;
  await sendInviteEmail({
    email: inv.email,
    type: inv.type || 'CONSULTANT',
    agencyId: inv.agencyId,
    inviterName: inviter?.name || 'CasaFlow',
    inviteUrl,
  });

  return updated;
};

export const list = async (user?: any) => {
  const where: any = {};
  if (user) {
    if (user.role === 'SUPER_ADMIN') {
      // sees all
    } else if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
      if (user.agencyId) where.agencyId = user.agencyId;
    } else if (user.role === 'LOCATION_ADMIN') {
      if (user.locationId) where.locationId = user.locationId;
    }
  }
  return prisma.invitation.findMany({ where, orderBy: { createdAt: 'desc' } });
};

export const verify = async (token: string) => {
  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv) throw Object.assign(new Error('Convite inválido'), { status: 404 });
  if (inv.usedAt) throw Object.assign(new Error('Convite já utilizado'), { status: 410 });
  if (inv.expiresAt < new Date()) throw Object.assign(new Error('Convite expirado'), { status: 410 });

  let agencyName: string | undefined;
  if (inv.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: inv.agencyId }, select: { name: true } });
    if (agency) agencyName = agency.name;
  }

  return { ...inv, agencyName };
};

export const revoke = async (id: string) => {
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) throw Object.assign(new Error('Convite não encontrado'), { status: 404 });
  await prisma.user.deleteMany({
    where: { email: invitation.email, clerkUserId: null, isActive: false },
  });
  return prisma.invitation.delete({ where: { id } });
};
