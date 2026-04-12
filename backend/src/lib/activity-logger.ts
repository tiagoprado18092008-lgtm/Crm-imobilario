import prisma from '../config/database';

interface ActivityParams {
  userId?: string;
  agencyId?: string;
  locationId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ip?: string;
}

export const logActivity = (params: ActivityParams): void => {
  // Fire-and-forget: never await this
  prisma.activityLog.create({ data: params }).catch((err: Error) => {
    console.error('[ActivityLog] Failed to log activity:', err.message);
  });
};
