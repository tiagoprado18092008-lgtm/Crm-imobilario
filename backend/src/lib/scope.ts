import prisma from '../config/database';

export type ScopeOptions = {
  /** For models that use a custom field name instead of assignedToId */
  assignedField?: string;
  /** For models that use locationId directly (no assignedTo relation) */
  useLocationId?: boolean;
};

export const buildScope = async (user: any, opts: ScopeOptions = {}): Promise<Record<string, any>> => {
  const { useLocationId = false } = opts;

  // AGENCY_OWNER / AGENCY_ADMIN — see entire agency
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) {
      if (useLocationId) {
        // Scope via location's agencyId
        return { location: { agencyId: user.agencyId } };
      }
      return { assignedTo: { agencyId: user.agencyId } };
    }
    return {};
  }

  // LOCATION_ADMIN — see entire location
  if (user.role === 'LOCATION_ADMIN') {
    return user.locationId ? { locationId: user.locationId } : {};
  }

  // TEAM_LEADER — own + direct reports
  if (user.role === 'TEAM_LEADER') {
    const subs = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    const ids = [user.id, ...subs.map((s: any) => s.id)];
    return { assignedToId: { in: ids } };
  }

  // CONSULTANT / USER — own records only
  return { assignedToId: user.id };
};

/** Scope for Property model (uses createdById instead of assignedToId) */
export const buildPropertyScope = async (user: any): Promise<Record<string, any>> => {
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) {
      return { createdBy: { agencyId: user.agencyId } };
    }
    return {};
  }
  if (user.role === 'LOCATION_ADMIN') {
    return user.locationId ? { locationId: user.locationId } : {};
  }
  if (user.role === 'TEAM_LEADER') {
    const subs = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    const ids = [user.id, ...subs.map((s: any) => s.id)];
    return { createdById: { in: ids } };
  }
  return { createdById: user.id };
};
