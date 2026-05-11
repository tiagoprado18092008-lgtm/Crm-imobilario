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

  // Auto-match contact by name for opportunities without a contactId
  const unlinked = opportunities.filter(o => !o.contactId && o.title);
  if (unlinked.length > 0) {
    const agencyFilter = where.agencyId ? { agencyId: where.agencyId } : {};
    const names = unlinked.map(o => o.title);
    const matchedContacts = await prisma.contact.findMany({
      where: { name: { in: names }, ...agencyFilter },
      select: { id: true, name: true, email: true, phone: true },
    });
    const contactByName = new Map(matchedContacts.map(c => [c.name, c]));
    for (const opp of opportunities as any[]) {
      if (!opp.contactId && opp.title && contactByName.has(opp.title)) {
        opp.contact = contactByName.get(opp.title);
      }
    }
  }

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
      contact: { select: { id: true, name: true, email: true, phone: true } },
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
    contactPhone?: string;
    stage?: string;
    value?: number;
    source?: string;
    notes?: string;
  }>,
  user: any,
  importPipelineId?: string
) => {
  const results = { created: 0, skipped: 0, errors: [] as string[] };
  const VALID_STAGES = ['LEAD_IN','QUALIFYING','VISIT_SCHEDULED','VISIT_DONE','PROPOSAL_SENT','NEGOTIATION','CPCV_SIGNED','FINANCING','ESCRITURA_SCHEDULED','CLOSED_WON','CLOSED_LOST'];
  const BATCH_SIZE = 500;

  // Filter rows with a title
  const validRows = rows.filter(r => r.title && r.title.trim().length >= 2);
  results.skipped += rows.length - validRows.length;

  if (validRows.length === 0) return results;

  const agencyFilter: any = user.agencyId
    ? { assignedTo: { agencyId: user.agencyId } }
    : user.locationId
    ? { assignedTo: { locationId: user.locationId } }
    : { assignedToId: user.id };

  // Pre-fetch existing contacts by email and name to avoid duplicates
  const emailsToLookup = [...new Set(validRows.map(r => r.contactEmail).filter(Boolean) as string[])];
  const namesToLookup = [...new Set(
    validRows.map(r => r.contactName || r.contactEmail || r.title.trim()).filter(Boolean) as string[]
  )];

  const [existingByEmail, existingByName] = await Promise.all([
    emailsToLookup.length > 0
      ? prisma.contact.findMany({ where: { email: { in: emailsToLookup }, ...agencyFilter }, select: { id: true, email: true, name: true } })
      : [],
    namesToLookup.length > 0
      ? prisma.contact.findMany({ where: { name: { in: namesToLookup }, ...agencyFilter }, select: { id: true, email: true, name: true } })
      : [],
  ]);

  // contactId lookup: email takes priority, then name
  const emailToId = new Map(existingByEmail.map((c: any) => [c.email?.toLowerCase(), c.id]));
  const nameToId = new Map(existingByName.map((c: any) => [c.name?.toLowerCase(), c.id]));

  // Resolve or queue contact creation for each row
  const resolvedContactIds: Array<string | '__create__'> = [];
  const toCreate = new Map<string, { name: string; email?: string; phone?: string }>(); // dedup key -> data

  for (const row of validRows) {
    const emailKey = row.contactEmail?.toLowerCase();
    const contactName = row.contactName || row.title.trim();
    const nameKey = contactName.toLowerCase();

    if (emailKey && emailToId.has(emailKey)) {
      resolvedContactIds.push(emailToId.get(emailKey)!);
    } else if (nameToId.has(nameKey)) {
      resolvedContactIds.push(nameToId.get(nameKey)!);
    } else {
      // Will create — deduplicate by key
      const createKey = emailKey || nameKey;
      if (!toCreate.has(createKey)) {
        toCreate.set(createKey, { name: contactName, email: row.contactEmail, phone: row.contactPhone });
      }
      resolvedContactIds.push('__create__:' + createKey);
    }
  }

  // Batch-create missing contacts
  const createdMap = new Map<string, string>(); // createKey -> contactId
  const toCreateEntries = [...toCreate.entries()];
  for (let i = 0; i < toCreateEntries.length; i += BATCH_SIZE) {
    const batch = toCreateEntries.slice(i, i + BATCH_SIZE);
    const created = await Promise.all(batch.map(([, data]) =>
      prisma.contact.create({
        data: { name: data.name, email: data.email || undefined, phone: data.phone || undefined, type: 'BUYER', status: 'NEW', assignedToId: user.id },
        select: { id: true },
      })
    ));
    batch.forEach(([key], idx) => createdMap.set(key, created[idx].id));
  }

  // Stage position counters
  const stagePositions = new Map<string, number>();
  const stageMaxes = await prisma.opportunity.groupBy({ by: ['stage'], _max: { position: true } });
  for (const s of stageMaxes) {
    stagePositions.set(s.stage, (s._max.position ?? -1) + 1);
  }

  // Find pipeline + first stage so imported opps appear in the correct kanban
  let defaultPipelineId: string | undefined;
  let firstStageId: string | undefined;
  if (importPipelineId) {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: importPipelineId },
      include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
    });
    if (pipeline) {
      defaultPipelineId = pipeline.id;
      firstStageId = pipeline.stages[0]?.id;
    }
  } else if (user.agencyId) {
    const pipeline = await prisma.pipeline.findFirst({
      where: { agencyId: user.agencyId },
      orderBy: { position: 'asc' },
      include: { stages: { orderBy: { position: 'asc' }, take: 1 } },
    });
    if (pipeline) {
      defaultPipelineId = pipeline.id;
      firstStageId = pipeline.stages[0]?.id;
    }
  }

  // Build opportunity records
  const oppsToCreate: any[] = [];
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    let contactId: string | undefined;

    const ref = resolvedContactIds[i];
    if (ref.startsWith('__create__:')) {
      contactId = createdMap.get(ref.replace('__create__:', ''));
    } else {
      contactId = ref;
    }

    if (!contactId) { results.skipped++; continue; }

    const stage = VALID_STAGES.includes(row.stage?.toUpperCase() ?? '') ? row.stage!.toUpperCase() : 'LEAD_IN';
    const pos = stagePositions.get(stage) ?? 0;
    stagePositions.set(stage, pos + 1);

    oppsToCreate.push({
      title: row.title.trim(),
      stage: stage as any,
      stageId: firstStageId || undefined,
      pipelineId: defaultPipelineId || undefined,
      value: row.value || undefined,
      source: row.source || undefined,
      notes: row.notes || undefined,
      position: pos,
      contactId,
      assignedToId: user.id,
      agencyId: user.agencyId || undefined,
      locationId: user.locationId || undefined,
    });
  }

  console.log(`[bulkImport] validRows=${validRows.length} oppsToCreate=${oppsToCreate.length} toCreate=${toCreateEntries.length} createdMap=${createdMap.size}`);

  // Insert in batches of 500
  for (let i = 0; i < oppsToCreate.length; i += BATCH_SIZE) {
    const batch = oppsToCreate.slice(i, i + BATCH_SIZE);
    try {
      await prisma.opportunity.createMany({ data: batch, skipDuplicates: false });
      results.created += batch.length;
    } catch (e: any) {
      console.error(`[bulkImport] createMany error:`, e.message);
      // Fallback: try one by one to identify the bad row
      for (const opp of batch) {
        try {
          await prisma.opportunity.create({ data: opp });
          results.created++;
        } catch (e2: any) {
          results.errors.push(`"${opp.title}": ${e2.message}`);
          results.skipped++;
        }
      }
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

  // Build change diff before update
  const changes: Record<string, { from: any; to: any }> = {};
  if (dto.stage !== undefined && dto.stage !== existing.stage) changes.stage = { from: existing.stage, to: dto.stage };
  if (dto.value !== undefined && dto.value !== existing.value) changes.value = { from: existing.value, to: dto.value };
  if (dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId) changes.assignedToId = { from: existing.assignedToId, to: dto.assignedToId };
  if (dto.title !== undefined && dto.title !== existing.title) changes.title = { from: existing.title, to: dto.title };

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
      contact: { select: { id: true, name: true, email: true, phone: true } },
      property: { select: { id: true, title: true, price: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // Log changes to ActivityLog
  if (Object.keys(changes).length > 0) {
    logActivity({
      agencyId: user?.agencyId,
      locationId: user?.locationId,
      userId: user?.id,
      action: 'OPPORTUNITY_UPDATED',
      entityType: 'Opportunity',
      entityId: id,
      metadata: { changes, title: existing.title },
    });
  }

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
        contact: { select: { id: true, name: true, email: true, phone: true } },
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
