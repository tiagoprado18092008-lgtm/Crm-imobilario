import prisma from '../../config/database';
import { workspaceIdFor } from '../../lib/workspace';
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
    tag?: string;
    page?: number;
    limit?: number;
    /** Keyset cursor: the id of the last row of the previous page. */
    cursor?: string;
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
  if (filters.tag) where.tags = { has: filters.tag };

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 200);

  // Keyset pagination. OFFSET makes the database walk every skipped row, so
  // page 94 of the cold-call list costs 94x page 1. Seeking from the last id
  // costs the same at any depth, and the (agencyId, createdAt DESC, id DESC)
  // index serves the sort directly.
  //
  // `page` is still honoured for callers that have not moved over yet.
  const useKeyset = Boolean(filters.cursor) || !filters.page;
  const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  const query = {
    // `where` already carries the workspace filter from buildWhereClause above.
    where: { ...where },
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      type: true,
      status: true,
      source: true,
      tags: true,
      score: true,
      lastContactedAt: true,
      createdAt: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { opportunities: true, interactions: true, tasks: true } },
    },
    ...(useKeyset
      ? filters.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : {}
      : { skip: (page - 1) * limit }),
  };

  const contacts = await prisma.contact.findMany({ ...query, where } as any);

  const contactsWithScore = contacts.map((c: any) => ({
    ...c,
    leadScore: calculateLeadScore(c, c._count?.interactions ?? 0),
  }));

  // A filtered COUNT(*) scans the whole match set on every page, so it is only
  // paid for when the caller actually renders a page count.
  const total = filters.page
    ? await prisma.contact.count({ where })
    : undefined;

  return {
    data: contactsWithScore,
    nextCursor: contacts.length === limit ? contacts[contacts.length - 1].id : null,
    hasMore: contacts.length === limit,
    total,
    page,
    limit,
    totalPages: total !== undefined ? Math.ceil(total / limit) : undefined,
  };
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
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
    // Dynamic fields
    tags?: string[];
  },
  user: any
) => {
  const userId = typeof user === 'string' ? user : user.id;

  const contact = await prisma.contact.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      type: (dto.type as any) ?? 'LEAD',
      status: (dto.status as any) ?? 'NEW',
      source: dto.source,
      notes: dto.notes,
      preferences: dto.preferences,
      assignedToId: dto.assignedToId || userId,
      agencyId: typeof user === 'string' ? undefined : user.agencyId ?? undefined,
      city: dto.city,
      postalCode: dto.postalCode,
      gdprConsent: dto.gdprConsent ?? false,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent ? new Date() : undefined,
      tags: dto.tags ?? [],
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
      agencyId: typeof user === 'string' ? undefined : user.agencyId ?? undefined,
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
    gdprConsent?: boolean;
    gdprConsentOrigin?: string;
    // Dynamic fields
    tags?: string[];
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
      gdprConsent: dto.gdprConsent,
      gdprConsentOrigin: dto.gdprConsentOrigin,
      gdprConsentDate: dto.gdprConsent === true ? new Date() : undefined,
      ...(dto.tags !== undefined && { tags: dto.tags }),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  logActivity({
    userId: user.id,
    agencyId: user.agencyId ?? undefined,
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
    action: 'contact.delete',
    entityType: 'Contact',
    entityId: id,
  });
  return prisma.contact.delete({ where: { id } });
};
