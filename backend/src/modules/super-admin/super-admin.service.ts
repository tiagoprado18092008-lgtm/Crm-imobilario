import prisma from '../../config/database';
import crypto from 'crypto';
import { create as createInvitation } from '../invitations/invitations.service';

export const listAgencies = async () => {
  return prisma.agency.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true } },
    },
  });
};

export const getAgencyDetail = async (id: string) => {
  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      },
      locations: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });
  return agency;
};

export const createAgencyWithOwner = async (
  agencyData: { name: string; slug: string; email?: string; phone?: string },
  ownerEmail: string,
  superAdminId: string,
) => {
  const slug = agencyData.slug || agencyData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const agency = await prisma.agency.create({
    data: {
      name: agencyData.name,
      slug,
      email: agencyData.email,
      phone: agencyData.phone,
    },
  });

  // Create default location
  await prisma.location.create({
    data: {
      agencyId: agency.id,
      name: agencyData.name,
      slug,
    },
  });

  // Send OWNER invite
  await createInvitation(ownerEmail, 'AGENCY_OWNER', superAdminId, undefined, undefined, agency.id, 'OWNER');

  return agency;
};

export const updateAgency = async (id: string, data: Partial<{ name: string; email: string; phone: string; isActive: boolean }>) => {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });
  return prisma.agency.update({ where: { id }, data });
};

export const deactivateAgency = async (id: string) => {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw Object.assign(new Error('Agência não encontrada'), { status: 404 });
  return prisma.agency.update({ where: { id }, data: { isActive: false } });
};
