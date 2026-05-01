import prisma from '../../config/database';
import { fireTrigger } from '../../utils/automation.engine';
import { buildScope } from '../../lib/scope';
import { logActivity } from '../../lib/activity-logger';

const calculateLeadScore = (contact: any, interactionCount: number): number => {
  let score = 0;
  if (contact.email) score += 20;
  if (contact.phone || contact.whatsapp) score += 20;
  if (contact.source === 'Indicação') score += 15;
  score += Math.min(interactionCount * 10, 30);
  if (contact.updatedAt) {
    const daysSinceUpdate = (Date.now() - new Date(contact.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
};

const buildWhereClause = async (user: any): Promise<any> => {
  return buildScope(user);
};

export const list = async (
  filters: {
    search?: string;
    type?: string;
    status?: string;
    source?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { opportunities: true, interactions: true, tasks: true } },
      },
    }),
  ]);

  const contactsWithScore = contacts.map((c: any) => ({
    ...c,
    leadScore: calculateLeadScore(c, c._count?.interactions ?? 0),
  }));

  return { data: contactsWithScore, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (
  dto: {
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    status?: string;
    source?: string;
    notes?: string;
    preferences?: string;
    assignedToId?: string;
    city?: string;
    postalCode?: string;
    budget_min?: number;
    budget_max?: number;
    interest_type?: string;
    timeline?: string;
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
    // Dynamic fields
    selling_also?: boolean;
    needs_financing?: boolean;
    property_address?: string;
    asking_price?: number;
    sale_reason?: string;
    buying_also?: boolean;
  },
  user: any
) => {
  const userId = typeof user === 'string' ? user : user.id;
  const commission = dto.asking_price ? dto.asking_price * 0.05 : undefined;

  const contact = await prisma.contact.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      type: (dto.type as any) ?? 'BUYER',
      status: (dto.status as any) ?? 'NEW',
      source: dto.source,
      notes: dto.notes,
      preferences: dto.preferences,
      assignedToId: dto.assignedToId || userId,
      locationId: typeof user === 'string' ? null : (user.locationId ?? null),
      city: dto.city,
      postalCode: dto.postalCode,
      budget_min: dto.budget_min,
      budget_max: dto.budget_max,
      interest_type: dto.interest_type,
      timeline: dto.timeline,
      gdprConsent: dto.gdprConsent ?? false,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent ? new Date() : undefined,
      selling_also: dto.selling_also ?? false,
      needs_financing: dto.needs_financing ?? false,
      property_address: dto.property_address,
      asking_price: dto.asking_price,
      sale_reason: dto.sale_reason,
      buying_also: dto.buying_also ?? false,
      commission,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  // Fire NEW_LEAD automation trigger (non-blocking)
  fireTrigger('NEW_LEAD', contact.id).catch(err =>
    console.error('[Automation] NEW_LEAD trigger error:', err)
  );

  logActivity({
    userId,
    agencyId: typeof user === 'string' ? undefined : (user.agencyId ?? undefined),
    locationId: typeof user === 'string' ? undefined : (user.locationId ?? undefined),
    action: 'contact.create',
    entityType: 'Contact',
    entityId: contact.id,
  });

  return contact;
};

export const bulkImport = async (
  rows: Array<{
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    status?: string;
    source?: string;
    notes?: string;
    city?: string;
  }>,
  userId: string,
  user?: any
) => {
  const results = { created: 0, skipped: 0, errors: [] as string[] };
  const BATCH_SIZE = 500;
  const agencyFilter: any = user?.agencyId
    ? { assignedTo: { agencyId: user.agencyId } }
    : user?.locationId
    ? { assignedTo: { locationId: user.locationId } }
    : { assignedToId: userId };

  // Filter rows with valid names
  const validRows = rows.filter(r => r.name && r.name.trim().length >= 2);
  results.skipped += rows.length - validRows.length;

  // Pre-fetch existing emails in bulk to avoid N+1 duplicate checks
  const emailsToCheck = [...new Set(validRows.map(r => r.email).filter(Boolean) as string[])];
  const existingEmails = emailsToCheck.length > 0
    ? await prisma.contact.findMany({ where: { email: { in: emailsToCheck }, ...agencyFilter }, select: { email: true } })
    : [];
  const existingEmailSet = new Set(existingEmails.map((c: any) => c.email?.toLowerCase()));

  // Build records to create, skipping duplicates
  const toCreate: any[] = [];
  for (const row of validRows) {
    if (row.email && existingEmailSet.has(row.email.toLowerCase())) {
      results.skipped++;
      continue;
    }
    toCreate.push({
      name: row.name.trim(),
      email: row.email || undefined,
      phone: row.phone || undefined,
      whatsapp: row.whatsapp || undefined,
      type: (['BUYER','OWNER','PARTNER'].includes(row.type?.toUpperCase() ?? '') ? row.type!.toUpperCase() : 'BUYER') as any,
      status: (['NEW','QUALIFIED','CONTACTED','INACTIVE'].includes(row.status?.toUpperCase() ?? '') ? row.status!.toUpperCase() : 'NEW') as any,
      source: row.source || undefined,
      notes: row.notes || undefined,
      city: row.city || undefined,
      assignedToId: userId,
    });
  }

  // Insert in batches
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    try {
      const res = await prisma.contact.createMany({ data: batch, skipDuplicates: true });
      results.created += res.count;
    } catch (e: any) {
      results.errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${e.message}`);
      results.skipped += batch.length;
    }
  }

  return results;
};

export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const contact = await prisma.contact.findFirst({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      interactions: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      opportunities: {
        include: {
          property: { select: { id: true, title: true, price: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
      appointments: {
        orderBy: { startAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });

  if (!contact) {
    const err: any = new Error('Contact not found');
    err.status = 404;
    throw err;
  }
  return {
    ...contact,
    leadScore: calculateLeadScore(contact, contact.interactions?.length ?? 0),
  };
};

export const update = async (
  id: string,
  dto: {
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    status?: string;
    source?: string;
    notes?: string;
    preferences?: string;
    assignedToId?: string;
    city?: string;
    postalCode?: string;
    budget_min?: number;
    budget_max?: number;
    interest_type?: string;
    timeline?: string;
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
    // Dynamic fields
    selling_also?: boolean;
    needs_financing?: boolean;
    property_address?: string;
    asking_price?: number;
    sale_reason?: string;
    buying_also?: boolean;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.contact.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Contact not found or access denied');
    err.status = 404;
    throw err;
  }

  const commission = dto.asking_price !== undefined ? dto.asking_price * 0.05 : undefined;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      type: dto.type as any,
      status: dto.status as any,
      source: dto.source,
      notes: dto.notes,
      preferences: dto.preferences,
      assignedToId: dto.assignedToId,
      city: dto.city,
      postalCode: dto.postalCode,
      budget_min: dto.budget_min,
      budget_max: dto.budget_max,
      interest_type: dto.interest_type,
      timeline: dto.timeline,
      gdprConsent: dto.gdprConsent,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent === true ? new Date() : undefined,
      selling_also: dto.selling_also,
      needs_financing: dto.needs_financing,
      property_address: dto.property_address,
      asking_price: dto.asking_price,
      sale_reason: dto.sale_reason,
      buying_also: dto.buying_also,
      commission,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  logActivity({
    userId: user.id,
    agencyId: user.agencyId ?? undefined,
    locationId: user.locationId ?? undefined,
    action: 'contact.update',
    entityType: 'Contact',
    entityId: id,
  });

  return updated;
};

export const archive = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.contact.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Contact not found or access denied');
    err.status = 404;
    throw err;
  }
  return prisma.contact.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

export const remove = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;
  const existing = await prisma.contact.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Contact not found or access denied');
    err.status = 404;
    throw err;
  }
  logActivity({
    userId: user.id,
    agencyId: user.agencyId ?? undefined,
    locationId: user.locationId ?? undefined,
    action: 'contact.delete',
    entityType: 'Contact',
    entityId: id,
  });
  return prisma.contact.delete({ where: { id } });
};
