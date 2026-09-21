/**
 * Tenant scoping.
 *
 * Every model that holds workspace data carries its own `agencyId` column, so a
 * query can be scoped with a single indexed predicate instead of a join through
 * the assigned user. `withWorkspace` is the only sanctioned way to build that
 * predicate: `npm run test:tenant` fails the build if a Prisma read runs outside
 * it without an explicit allowlist entry.
 *
 * The cardinal rule is that every branch NARROWS. A filter that cannot be
 * resolved returns a predicate matching nothing, never `{}` — an empty filter
 * silently returns every tenant's rows.
 */

export type WorkspaceUser = {
  id: string;
  role?: string | null;
  agencyId?: string | null;
};

/** Matches no rows. Used when a tenant cannot be established. */
export const MATCH_NOTHING = { agencyId: '__no_workspace__' } as const;

/**
 * Filter restricting a query to the caller's workspace.
 *
 * SUPER_ADMIN is the single unscoped role and must be opted into explicitly by
 * the caller, so that forgetting to pass it cannot widen a query by accident.
 */
export const withWorkspace = <T extends Record<string, unknown>>(
  user: WorkspaceUser | null | undefined,
  where: T = {} as T,
): T & { agencyId?: string } => {
  if (!user?.agencyId) {
    return { ...where, ...MATCH_NOTHING };
  }
  return { ...where, agencyId: user.agencyId };
};

/**
 * Same as `withWorkspace`, but lets a SUPER_ADMIN read across workspaces.
 * Only for the super-admin console.
 */
export const withWorkspaceAllowingSuperAdmin = <T extends Record<string, unknown>>(
  user: WorkspaceUser | null | undefined,
  where: T = {} as T,
): T => {
  if (user?.role === 'SUPER_ADMIN') return where;
  return withWorkspace(user, where) as T;
};

/** Narrows a workspace query further to records owned by one user. */
export const withOwner = <T extends Record<string, unknown>>(
  user: WorkspaceUser | null | undefined,
  where: T = {} as T,
  ownerField = 'assignedToId',
) => ({ ...withWorkspace(user, where), [ownerField]: user?.id ?? '__no_user__' });

/** The agencyId to stamp on a record being created. Throws rather than writing an orphan row. */
export const workspaceIdFor = (user: WorkspaceUser | null | undefined): string => {
  if (!user?.agencyId) {
    throw Object.assign(new Error('Utilizador sem workspace associado'), { status: 403 });
  }
  return user.agencyId;
};
