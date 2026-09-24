import fs from 'fs';
import path from 'path';
import { canSeeEveryone } from '../modules/goals/goals.service';
import { buildScope } from '../lib/scope';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Role-based access.
 *
 * Section 9 requires that a signed-in BDR cannot see another BDR's deals. The
 * rule is enforced in the query, not in the interface: a list that returns
 * everything and hides rows on screen leaves the data one request away.
 */

const asUser = (over: Record<string, unknown> = {}) => ({
  id: 'user-1',
  role: 'CONSULTANT',
  agencyId: 'agency-1',
  ...over,
});

describe('canSeeEveryone', () => {
  it('lets owners and admins see the whole workspace', () => {
    for (const role of ['SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN']) {
      expect(canSeeEveryone(asUser({ role }))).toBe(true);
    }
  });

  it('does not let a BDR see the whole workspace', () => {
    for (const role of ['CONSULTANT', 'USER', 'TEAM_LEADER']) {
      expect(canSeeEveryone(asUser({ role }))).toBe(false);
    }
  });

  it('refuses a missing or unknown role rather than assuming access', () => {
    expect(canSeeEveryone(asUser({ role: undefined }))).toBe(false);
    expect(canSeeEveryone(asUser({ role: 'ALGO_NOVO' }))).toBe(false);
    expect(canSeeEveryone(null)).toBe(false);
  });
});

describe('buildScope', () => {
  it('scopes a BDR to their own records', async () => {
    const scope = await buildScope(asUser({ role: 'CONSULTANT' }));
    expect(scope).toEqual({ assignedToId: 'user-1' });
  });

  it('scopes a plain user to their own records', async () => {
    expect(await buildScope(asUser({ role: 'USER' }))).toEqual({ assignedToId: 'user-1' });
  });

  it('gives an owner the whole workspace', async () => {
    const scope = await buildScope(asUser({ role: 'AGENCY_OWNER' }));
    expect(scope).toEqual({ assignedTo: { agencyId: 'agency-1' } });
  });

  it('never returns an empty filter, whatever the role', async () => {
    // An empty where clause drops the filter and returns every tenant's rows.
    // This is the failure mode that shipped once already.
    for (const role of [
      'CONSULTANT', 'USER', 'TEAM_LEADER', 'AGENCY_OWNER', 'AGENCY_ADMIN',
      'SUPER_ADMIN', 'PAPEL_DESCONHECIDO', undefined,
    ]) {
      const scope = await buildScope(asUser({ role }));
      expect(Object.keys(scope).length).toBeGreaterThan(0);
    }
  });

  it('falls back to own records for an owner with no workspace', async () => {
    const scope = await buildScope(asUser({ role: 'AGENCY_OWNER', agencyId: null }));
    expect(scope).toEqual({ assignedToId: 'user-1' });
  });

  it('gives two BDRs filters that cannot match each other', async () => {
    // The concrete requirement: one rep's list cannot contain another's deals.
    const a = await buildScope(asUser({ id: 'bdr-a', role: 'CONSULTANT' }));
    const b = await buildScope(asUser({ id: 'bdr-b', role: 'CONSULTANT' }));
    expect(a).toEqual({ assignedToId: 'bdr-a' });
    expect(b).toEqual({ assignedToId: 'bdr-b' });
    expect(a).not.toEqual(b);
  });
});

/**
 * The routes that must not be reachable without a session.
 *
 * Checked in the source rather than over HTTP, so the suite needs no running
 * server or database: every router mounted under /api has to call authenticate
 * before its handlers.
 */
describe('authentication on API routers', () => {
  const MODULES = path.resolve(__dirname, '..', 'modules');

  /** Routers that are public by design, with the reason. */
  const PUBLIC = new Map([
    ['calendar/booking.router.ts', 'página pública de marcação — não há sessão'],
    ['telephony/webhooks.router.ts', 'webhook do operador — verificado por token e IP'],
    ['webhooks/webhooks.router.ts', 'webhooks de calendário Google e Outlook — sem sessão possível'],
  ]);

  const routers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.router.ts')) routers.push(full);
    }
  };
  walk(MODULES);

  it('finds the routers to check', () => {
    expect(routers.length).toBeGreaterThan(10);
  });

  it('requires a session on every router that is not deliberately public', () => {
    const unprotected: string[] = [];

    for (const file of routers) {
      const rel = path.relative(MODULES, file).replace(/\\/g, '/');
      if (PUBLIC.has(rel)) continue;

      const src = fs.readFileSync(file, 'utf8');
      // Either the whole router sits behind the middleware, or every route
      // names it. Some routers alias it as requireAuth, which is the same
      // function — matching only the literal name would flag those falsely.
      const guarded =
        /router\.use\(\s*(authenticate|requireAuth)\s*\)/.test(src) ||
        /(authenticate|requireAuth),/.test(src);
      if (!guarded) unprotected.push(rel);
    }

    if (unprotected.length) {
      throw new Error(
        `${unprotected.length} router(s) sem autenticação:\n  ${unprotected.join('\n  ')}\n\n` +
          'Adiciona router.use(authenticate) ou, se for público de propósito, ' +
          'declara-o em PUBLIC neste teste com a razão.',
      );
    }
  });

  it('keeps the public list free of stale entries', () => {
    const live = new Set(
      routers.map((f) => path.relative(MODULES, f).replace(/\\/g, '/')),
    );
    const stale = [...PUBLIC.keys()].filter((k) => !live.has(k));
    expect(stale).toEqual([]);
  });
});

describe('requireRole', () => {
  const run = (role: string | undefined, allowed: string[]) => {
    const req: any = role === undefined ? {} : { user: { id: 'u', role } };
    const res: any = {
      statusCode: 0,
      body: null as any,
      status(code: number) { this.statusCode = code; return this; },
      json(payload: any) { this.body = payload; return this; },
    };
    let passed = false;
    requireRole(...allowed)(req, res, () => { passed = true; });
    return { passed, status: res.statusCode };
  };

  it('lets a listed role through', () => {
    expect(run('AGENCY_OWNER', ['AGENCY_OWNER', 'AGENCY_ADMIN']).passed).toBe(true);
  });

  it('refuses a role that is not listed', () => {
    const { passed, status } = run('CONSULTANT', ['AGENCY_OWNER', 'AGENCY_ADMIN']);
    expect(passed).toBe(false);
    expect(status).toBe(403);
  });

  /**
   * SUPER_ADMIN sits above the agency hierarchy, so no route lists it. Before
   * this it was denied settings, user management and reports — the account
   * with the most authority could do the least.
   */
  it('lets SUPER_ADMIN through a route that does not list it', () => {
    expect(run('SUPER_ADMIN', ['AGENCY_OWNER', 'AGENCY_ADMIN']).passed).toBe(true);
  });

  it('still demands authentication before any role check', () => {
    const { passed, status } = run(undefined, ['SUPER_ADMIN']);
    expect(passed).toBe(false);
    expect(status).toBe(401);
  });
});
