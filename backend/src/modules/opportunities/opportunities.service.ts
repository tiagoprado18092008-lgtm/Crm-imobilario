import prisma from '../../config/database';
import { fireTrigger } from '../../utils/automation.engine';
import { buildScope } from '../../lib/scope';
import { logActivity } from '../../lib/activity-logger';

const buildWhereClause = async (user: any): Promise<any> => {
  if ((user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') && user.agencyId) {
    return { agencyId: user.agencyId };
  }
  if (user.role === 'LOCATION_ADMIN' && user.locationId) {
    // locationId OR agencyId (covers opps created before locationId was set)
    return { OR: [{ locationId: user.locationId }, { agencyId: user.agencyId ?? '__none__' }] };
  }
  if (user.role === 'TEAM_LEADER') {
    const subs = await prisma.user.findMany({ where: { supervisorId: user.id }, select: { id: true } });
    const ids = [user.id, ...subs.map((s: any) => s.id)];
    return { assignedToId: { in: ids } };
  }
  return { assignedToId: user.id };
};

export const list = async (
  filters: {
    stage?: string;
    stageId?: string;
    pipelineId?: string;
    assignedToId?: string;
    contactId?: string;
    page?: number;
    limit?: number;
  },
  user: any
) => {
  const where: any = await buildWhereClause(user);
  if (filters.stage) where.stage = filters.stage;
  if (filters.stageId) where.stageId = filters.stageId;
  if (filters.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.contactId) where.contactId = filters.contactId;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const skip = (page - 1) * limit;

  const [total, opportunities] = await Promise.all([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ stage: 'asc' }, { position: 'asc' }],
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, title: true, price: true, type: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { interactions: true, tasks: true } },
      },
    }),
  ]);

  return { data: opportunities, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const create = async (
  dto: {
    title: string;
    stage?: string;
    stageId?: string;
    pipelineId?: string;
    value?: number;
    source?: string;
    expectedCloseDate?: string;
    lostReason?: string;
    notes?: string;
    position?: number;
    contactId: string;
    propertyId?: string;
    assignedToId?: string;
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
  const targetStage = (dto.stage as any) ?? 'LEAD_IN';
  // Auto-assign position to end of the target stage
  const lastInStage = await prisma.opportunity.findFirst({
    where: { stage: targetStage },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = lastInStage ? lastInStage.position + 1 : 0;
  const opp_commission = dto.asking_price ? dto.asking_price * 0.05 : undefined;

  const opp = await prisma.opportunity.create({
    data: {
      title: dto.title,
      stage: targetStage,
      stageId: dto.stageId || null,
      pipelineId: dto.pipelineId || null,
      value: dto.value,
      source: dto.source,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      lostReason: dto.lostReason,
      notes: dto.notes,
      position,
      contactId: dto.contactId,
      propertyId: dto.propertyId || undefined,
      assignedToId: (user.role === 'CONSULTANT' ? user.id : dto.assignedToId) || user.id,
      agencyId: user.agencyId ?? null,
      locationId: user.locationId ?? null,
      selling_also: dto.selling_also ?? false,
      needs_financing: dto.needs_financing ?? false,
      property_address: dto.property_address,
      asking_price: dto.asking_price,
      sale_reason: dto.sale_reason,
      buying_also: dto.buying_also ?? false,
      opp_commission,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, price: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  logActivity({
    userId: user.id,
    agencyId: user.agencyId ?? undefined,
    locationId: user.locationId ?? undefined,
    action: 'opportunity.create',
    entityType: 'Opportunity',
    entityId: opp.id,
  });

  return opp;
};

export const bulkImport = async (
  rows: Array<{
    title: string;
    contactName?: string;
    contactEmail?: string;
    stage?: string;
    value?: number;
    source?: string;
    notes?: string;
  }>,
  user: any
) => {
  const results = { created: 0, skipped: 0, errors: [] as string[] };
  const VALID_STAGES = ['LEAD_IN','QUALIFYING','VISIT_SCHEDULED','VISIT_DONE','PROPOSAL_SENT','NEGOTIATION','CPCV_SIGNED','FINANCING','ESCRITURA_SCHEDULED','CLOSED_WON','CLOSED_LOST'];
  const BATCH_SIZE = 500;

  // Filter valid rows upfront
  const validRows = rows.filter(r => r.title && r.title.trim().length >= 2);
  results.skipped += rows.length - validRows.length;

  // Build contact lookup maps to avoid N+1 queries
  const emailsToLookup = [...new Set(validRows.map(r => r.contactEmail).filter(Boolean) as string[])];
  const namesToLookup = [...new Set(validRows.map(r => r.contactName).filter(Boolean) as string[])];

  const agencyFilter: any = user.agencyId
    ? { assignedTo: { agencyId: user.agencyId } }
    : user.locationId
    ? { assignedTo: { locationId: user.locationId } }
    : { assignedToId: user.id };

  const [existingByEmail, existingByName] = await Promise.all([
    emailsToLookup.length > 0
      ? prisma.contact.findMany({ where: { email: { in: emailsToLookup }, ...agencyFilter }, select: { id: true, email: true, name: true } })
      : [],
    namesToLookup.length > 0
      ? prisma.contact.findMany({ where: { name: { in: namesToLookup }, ...agencyFilter }, select: { id: true, email: true, name: true } })
      : [],
  ]);

  const emailMap = new Map(existingByEmail.map((c: any) => [c.email?.toLowerCase(), c.id]));
  const nameMap = new Map(existingByName.map((c: any) => [c.name?.toLowerCase(), c.id]));

  // Collect contacts that need to be created
  const contactsToCreate: Array<{ name: string; email?: string; rowIndices: number[] }> = [];
  const contactKeyMap = new Map<string, string>(); // key -> contactId (filled after batch create)

  const rowContactKeys: Array<string | null> = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const emailKey = row.contactEmail?.toLowerCase();
    const nameKey = row.contactName?.toLowerCase();

    if (emailKey && emailMap.has(emailKey)) {
      rowContactKeys.push(`email:${emailKey}`);
      contactKeyMap.set(`email:${emailKey}`, emailMap.get(emailKey)!);
    } else if (nameKey && nameMap.has(nameKey)) {
      rowContactKeys.push(`name:${nameKey}`);
      contactKeyMap.set(`name:${nameKey}`, nameMap.get(nameKey)!);
    } else if (row.contactName || row.contactEmail) {
      const key = emailKey ? `email:${emailKey}` : `name:${nameKey}`;
      rowContactKeys.push(key);
      if (!contactKeyMap.has(key)) {
        contactKeyMap.set(key, '__pending__');
        contactsToCreate.push({ name: row.contactName || row.contactEmail!, email: row.contactEmail, rowIndices: [] });
      }
    } else {
      rowContactKeys.push(null);
    }
  }

  // Batch create missing contacts
  if (contactsToCreate.length > 0) {
    for (let i = 0; i < contactsToCreate.length; i += BATCH_SIZE) {
      const batch = contactsToCreate.slice(i, i + BATCH_SIZE);
      const created = await Promise.all(batch.map(c =>
        prisma.contact.create({
          data: { name: c.name, email: c.email || undefined, type: 'BUYER', status: 'NEW', assignedToId: user.id },
          select: { id: true, email: true, name: true },
        })
      ));
      created.forEach((c: any, idx: number) => {
        const orig = batch[idx];
        const key = orig.email ? `email:${orig.email.toLowerCase()}` : `name:${orig.name.toLowerCase()}`;
        contactKeyMap.set(key, c.id);
      });
    }
  }

  // Stage position counters (avoid per-row DB query)
  const stagePositions = new Map<string, number>();
  const stageMaxes = await prisma.opportunity.groupBy({
    by: ['stage'],
    _max: { position: true },
  });
  for (const s of stageMaxes) {
    stagePositions.set(s.stage, (s._max.position ?? -1) + 1);
  }

  // Build opportunity records and batch insert
  const oppsToCreate: any[] = [];
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const key = rowContactKeys[i];
    const contactId = key ? contactKeyMap.get(key) : null;

    if (!contactId || contactId === '__pending__') {
      results.skipped++;
      continue;
    }

    const stage = VALID_STAGES.includes(row.stage?.toUpperCase() ?? '') ? row.stage!.toUpperCase() : 'LEAD_IN';
    const pos = stagePositions.get(stage) ?? 0;
    stagePositions.set(stage, pos + 1);

    oppsToCreate.push({
      title: row.title.trim(),
      stage: stage as any,
      value: row.value || undefined,
      source: row.source || undefined,
      notes: row.notes || undefined,
      position: pos,
      contactId,
      assignedToId: user.id,
    });
  }

  // Insert in batches of 500
  for (let i = 0; i < oppsToCreate.length; i += BATCH_SIZE) {
    const batch = oppsToCreate.slice(i, i + BATCH_SIZE);
    try {
      await prisma.opportunity.createMany({ data: batch, skipDuplicates: false });
      results.created += batch.length;
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

  const opportunity = await prisma.opportunity.findFirst({
    where,
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
      property: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      interactions: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });

  if (!opportunity) {
    const err: any = new Error('Opportunity not found');
    err.status = 404;
    throw err;
  }
  return opportunity;
};

export const update = async (
  id: string,
  dto: {
    title?: string;
    stage?: string;
    value?: number;
    source?: string;
    expectedCloseDate?: string;
    lostReason?: string;
    notes?: string;
    position?: number;
    contactId?: string;
    propertyId?: string;
    assignedToId?: string;
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

  const existing = await prisma.opportunity.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Opportunity not found or access denied');
    err.status = 404;
    throw err;
  }

  const opp_commission = dto.asking_price !== undefined ? dto.asking_price * 0.05 : undefined;

  const updated = await prisma.opportunity.update({
    where: { id },
    data: {
      title: dto.title,
      stage: dto.stage as any,
      value: dto.value,
      source: dto.source,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      lostReason: dto.lostReason,
      notes: dto.notes,
      // Never overwrite position via update — use moveStage for that
      contactId: dto.contactId || undefined,
      propertyId: dto.propertyId || undefined,
      assignedToId: dto.assignedToId || undefined,
      selling_also: dto.selling_also,
      needs_financing: dto.needs_financing,
      property_address: dto.property_address,
      asking_price: dto.asking_price,
      sale_reason: dto.sale_reason,
      buying_also: dto.buying_also,
      opp_commission,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, price: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // Fire automation triggers based on stage change
  if (dto.stage && dto.stage !== existing.stage) {
    const contactId = updated.contactId;
    if (dto.stage === 'VISIT_SCHEDULED') {
      fireTrigger('VISIT_SCHEDULED', contactId).catch(() => {});
    } else if (dto.stage === 'PROPOSAL_SENT') {
      fireTrigger('PROPOSAL_SENT', contactId).catch(() => {});
    } else if (dto.stage === 'QUALIFIED') {
      fireTrigger('LEAD_QUALIFIED', contactId).catch(() => {});
    }
  }

  return updated;
};

export const moveStage = async (
  id: string,
  newStage: string,
  newPosition: number,
  user: any,
  newStageId?: string
) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const existing = await prisma.opportunity.findFirst({ where });
  if (!existing) {
    const err: any = new Error('Opportunity not found or access denied');
    err.status = 404;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const oldStage = existing.stage as string;
    const oldPosition = existing.position;
    // Scope reorder to user's agency/location so we never touch other tenants' data
    const tenantScope: any = user.agencyId ? { assignedTo: { agencyId: user.agencyId } } : user.locationId ? { assignedTo: { locationId: user.locationId } } : { assignedToId: user.id };

    // Close the gap in the source stage
    await tx.opportunity.updateMany({
      where: {
        ...tenantScope,
        stage: oldStage as any,
        position: { gt: oldPosition },
        id: { not: id },
      },
      data: { position: { decrement: 1 } },
    });

    // Adjust newPosition if moving within the same stage and forward
    const adjustedPosition =
      oldStage === newStage && newPosition > oldPosition
        ? newPosition - 1
        : newPosition;

    // Open slot in the target stage
    await tx.opportunity.updateMany({
      where: {
        ...tenantScope,
        stage: newStage as any,
        position: { gte: adjustedPosition },
        id: { not: id },
      },
      data: { position: { increment: 1 } },
    });

    // Move the opportunity
    const updated = await tx.opportunity.update({
      where: { id },
      data: { stage: newStage as any, position: adjustedPosition, stageId: newStageId || null },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, price: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return updated;
  });

  // Fire automation triggers on stage change
  if (newStage !== existing.stage) {
    if (newStage === 'VISIT_SCHEDULED') {
      fireTrigger('VISIT_SCHEDULED', result.contactId).catch(() => {});
    } else if (newStage === 'PROPOSAL_SENT') {
      fireTrigger('PROPOSAL_SENT', result.contactId).catch(() => {});
    } else if (newStage === 'QUALIFIED') {
      fireTrigger('LEAD_QUALIFIED', result.contactId).catch(() => {});
    }
  }

  return result;
};

export const remove = async (id: string, user?: any) => {
  if (user) {
    logActivity({
      userId: user.id,
      agencyId: user.agencyId ?? undefined,
      locationId: user.locationId ?? undefined,
      action: 'opportunity.delete',
      entityType: 'Opportunity',
      entityId: id,
    });
  }
  return prisma.opportunity.delete({ where: { id } });
};
