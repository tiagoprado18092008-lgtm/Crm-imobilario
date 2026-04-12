import prisma from '../../config/database';
import { pushEventToGoogle, deleteGoogleEvent, pushEventToOutlook, deleteOutlookEvent } from './sync';

const getActiveProviders = async (userId: string) => {
  const integrations = await prisma.calendarIntegration.findMany({
    where: { userId, isActive: true },
    select: { provider: true },
  });
  return integrations.map(i => i.provider);
};

export const list = async (userId: string, filters: {
  start?: string;
  end?: string;
  eventType?: string;
  contactId?: string;
}) => {
  const where: any = { userId };
  if (filters.start) where.startAt = { gte: new Date(filters.start) };
  if (filters.end) where.endAt = { ...(where.endAt || {}), lte: new Date(filters.end) };
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.contactId) where.contactId = filters.contactId;

  return prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      contact: { select: { id: true, name: true, email: true } },
    },
  });
};

export const getById = async (userId: string, id: string) => {
  const event = await prisma.calendarEvent.findFirst({
    where: { id, userId },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!event) {
    const err: any = new Error('Event not found');
    err.status = 404;
    throw err;
  }
  return event;
};

export const create = async (userId: string, dto: {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringRule?: string;
  eventType?: string;
  color?: string;
  attendees?: any[];
  contactId?: string;
  opportunityId?: string;
  propertyId?: string;
}) => {
  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      isAllDay: dto.isAllDay ?? false,
      isRecurring: dto.isRecurring ?? false,
      recurringRule: dto.recurringRule,
      eventType: dto.eventType ?? 'other',
      color: dto.color,
      attendees: dto.attendees as any,
      contactId: dto.contactId || undefined,
      opportunityId: dto.opportunityId || undefined,
      propertyId: dto.propertyId || undefined,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
    },
  });

  // Push to external providers (non-blocking)
  const providers = await getActiveProviders(userId);
  if (providers.includes('google')) pushEventToGoogle(userId, event.id).catch(() => {});
  if (providers.includes('outlook')) pushEventToOutlook(userId, event.id).catch(() => {});

  return event;
};

export const update = async (userId: string, id: string, dto: {
  title?: string;
  description?: string;
  location?: string;
  startAt?: string;
  endAt?: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringRule?: string;
  eventType?: string;
  color?: string;
  attendees?: any[];
  contactId?: string;
  opportunityId?: string;
  propertyId?: string;
}) => {
  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) {
    const err: any = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      isAllDay: dto.isAllDay,
      isRecurring: dto.isRecurring,
      recurringRule: dto.recurringRule,
      eventType: dto.eventType,
      color: dto.color,
      attendees: dto.attendees as any,
      contactId: dto.contactId || undefined,
      opportunityId: dto.opportunityId || undefined,
      propertyId: dto.propertyId || undefined,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
    },
  });

  const providers = await getActiveProviders(userId);
  if (providers.includes('google')) pushEventToGoogle(userId, id).catch(() => {});
  if (providers.includes('outlook')) pushEventToOutlook(userId, id).catch(() => {});

  return event;
};

export const remove = async (userId: string, id: string) => {
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!event) {
    const err: any = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  // Delete from external providers first
  if (event.externalId && event.externalProvider === 'google') {
    deleteGoogleEvent(userId, event.externalId).catch(() => {});
  }
  if (event.externalId && event.externalProvider === 'outlook') {
    deleteOutlookEvent(userId, event.externalId).catch(() => {});
  }

  return prisma.calendarEvent.delete({ where: { id } });
};

export const duplicate = async (userId: string, id: string) => {
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!event) {
    const err: any = new Error('Event not found');
    err.status = 404;
    throw err;
  }

  const newStart = new Date(event.startAt.getTime() + 24 * 60 * 60 * 1000);
  const newEnd = new Date(event.endAt.getTime() + 24 * 60 * 60 * 1000);

  return prisma.calendarEvent.create({
    data: {
      userId,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: newStart,
      endAt: newEnd,
      isAllDay: event.isAllDay,
      eventType: event.eventType,
      color: event.color,
      contactId: event.contactId,
      opportunityId: event.opportunityId,
      propertyId: event.propertyId,
    },
  });
};
