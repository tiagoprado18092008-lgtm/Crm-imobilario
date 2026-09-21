import prisma from '../config/database';

export type ScopeOptions = {
  /** For models that use a custom field name instead of assignedToId */
  assignedField?: string;
};

/**
 * Builds the tenant-isolation filter for a request.
 *
 * Every branch must return a filter that NARROWS the query. Returning `{}`
 * would disable filtering entirely and expose other tenants' records, so a
 * role we cannot scope falls back to the user's own records rather than to an
 * empty filter.
 */
export const buildScope = async (user: any, _opts: ScopeOptions = {}): Promise<Record<string, any>> => {
  // AGENCY_OWNER / AGENCY_ADMIN — see entire agency
  if (user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN') {
    if (user.agencyId) {
      return { assignedTo: { agencyId: user.agencyId } };
    }
    // No agencyId — restrict to own records only (never expose everything)
    return { assignedToId: user.id };
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

  // CONSULTANT / USER / anything unrecognised — own records only
  return { assignedToId: user.id };
};
