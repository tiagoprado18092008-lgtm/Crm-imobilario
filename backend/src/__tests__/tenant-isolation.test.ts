import fs from 'fs';
import path from 'path';

/**
 * Guards tenant isolation at the source level.
 *
 * Every Prisma read on a workspace-owned model must be scoped, either by
 * `withWorkspace(...)` / `buildScope(...)` or by an explicit `agencyId` in its
 * `where`. An unscoped read returns every tenant's rows, which is the failure
 * this suite exists to catch before it ships.
 *
 * A call that genuinely must not be scoped goes in ALLOWLIST with a reason.
 * Anything else is a failure, so the safe path is also the path of least
 * resistance.
 */

const SRC = path.resolve(__dirname, '..');

/** Models holding workspace data. Reads against these must be scoped. */
const TENANT_MODELS = [
  'contact', 'opportunity', 'interaction', 'task', 'conversation', 'message',
  'appointment', 'appointmentCalendar', 'emailCampaign', 'emailCampaignRecipient',
  'form', 'formSubmission', 'automation', 'automationRule', 'automationLog',
  'automationEnrollment', 'automationRun', 'calendarEvent', 'calendarSlot',
  'calendarIntegration', 'phoneNumber', 'pipeline', 'pipelineStage',
  'messageTemplate', 'invitation', 'activityLog', 'whatsAppSession',
];

const READ_OPS = ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'];
const WRITE_OPS = ['create', 'createMany'];

/**
 * Unscoped reads that are correct as written.
 * Key: "<relative file>:<model>.<op>" — value: why it is safe.
 */
const ALLOWLIST: Record<string, string> = {
  // ── Writes still carrying a null agencyId ────────────────────────────────
  // These take a bare userId rather than the user object, so the workspace is
  // not in scope at the call site. The migration backfills them from the owner,
  // and `withWorkspace` treats a null agencyId as matching nothing, so the rows
  // are invisible rather than cross-tenant. Threading the user through these
  // signatures is phase 2 work; each entry must disappear then.
  'lib/activity-logger.ts:activityLog.create': 'takes userId; backfilled from owner',
  'modules/appointments/appointments.service.ts:appointment.create': 'takes userId; backfilled from assignee',
  'modules/calendar/appointment-sync.ts:appointment.create': 'sync worker; backfilled from assignee',
  'modules/calendar/appointment-sync.ts:calendarEvent.create': 'sync worker; backfilled from owner',
  'modules/calendar/booking.router.ts:appointment.create': 'public booking; backfilled from consultant',
  'modules/calendar/booking.router.ts:contact.create': 'public booking; backfilled from consultant',
  'modules/calendar/calendar-events.service.ts:calendarEvent.create': 'takes userId; backfilled from owner',
  'modules/calendar/calendar.service.ts:calendarSlot.create': 'takes userId; backfilled from owner',
  'modules/calls/calls.service.ts:interaction.create': 'takes userId; backfilled from creator',
  'modules/campaigns/campaigns.service.ts:emailCampaign.create': 'takes userId; backfilled from creator',
  'modules/campaigns/campaigns.service.ts:emailCampaignRecipient.create': 'inherits campaign workspace',
  'modules/contacts/contacts.service.ts:contact.create': 'CSV import path; backfilled from assignee',
  'modules/forms/forms.service.ts:contact.create': 'public form submission; backfilled from form owner',
  'modules/forms/forms.service.ts:form.create': 'takes userId; backfilled from owner',
  'modules/forms/forms.service.ts:formSubmission.create': 'public submission; inherits form workspace',
  'modules/opportunities/opportunities.service.ts:opportunity.create': 'CSV import path; backfilled from assignee',
  'modules/phone-numbers/phone-numbers.service.ts:phoneNumber.create': 'takes userId; backfilled from owner',
  'server.ts:interaction.create': 'Twilio webhook; scoped to the phone number owner',
  'utils/automation.engine.ts:automationEnrollment.create': 'engine runs across workspaces',
  'utils/automation.engine.ts:automationLog.create': 'engine runs across workspaces',
  'utils/automation.engine.ts:automationRun.create': 'engine runs across workspaces',
  'utils/automation.engine.ts:task.create': 'engine runs across workspaces',

  // Background jobs deliberately sweep every workspace.
  'lib/overdue-tasks-cron.ts:task.findMany': 'nightly cron notifies across all workspaces',

  // Invitations are looked up by their single-use token or the invited email
  // BEFORE the user has a workspace — establishing the tenant is the point of
  // the call, so it cannot be scoped by one.
  'modules/auth/auth.service.ts:invitation.findFirst': 'resolves tenant from invite token at signup',
  'modules/auth/clerk-exchange.service.ts:invitation.findFirst': 'resolves tenant from invite token at signup',

  // Provider webhooks arrive with only a provider-side id. The row identifies
  // the tenant; each handler must then act within it.
  'modules/webhooks/webhooks.controller.ts:calendarIntegration.findFirst':
    'Google push webhook resolves the integration by channelId, which is unique per workspace',
  'server.ts:phoneNumber.findFirst':
    'Twilio callerId fallback picks any active number when no env default is set',

  // The automation engine runs as a background worker across every workspace.
  'utils/automation.engine.ts:automationRule.findMany': 'engine evaluates rules for all workspaces',
  'utils/automation.engine.ts:automationEnrollment.findMany': 'engine advances enrollments for all workspaces',

};

type Finding = { file: string; model: string; op: string; line: number; key: string };

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Returns the source slice belonging to one Prisma call, from the call site to
 * its balanced closing paren, so we can tell whether that call is scoped.
 */
const callBody = (src: string, startIdx: number): string => {
  const open = src.indexOf('(', startIdx);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open, Math.min(src.length, open + 2000));
};

/**
 * A read counts as scoped when it filters by workspace, by the owning user, or
 * by a parent row that is itself scoped. `userId`/`assignedToId` bind the query
 * to one user, who belongs to exactly one workspace, so those are safe too.
 */
const SCOPE_MARKERS = [
  // explicit workspace scoping
  'withWorkspace', 'withOwner', 'buildScope', 'agencyId', 'MATCH_NOTHING',
  // a prebuilt where clause from a scoping helper, including the `{ where }`
  // shorthand and the `agencyFilter` spread used by the import paths
  'where: where', 'where,', 'where }', 'buildWhereClause', 'baseWhere', 'scope',
  'agencyFilter', 'oppWhere', 'contactWhere', 'userScope', 'contactScope', 'tenantScope',
  // ownership binds the row to a single user, hence a single workspace
  'userId', 'assignedToId', 'createdById', 'invitedById',
  // scoped parent
  'conversationId', 'pipelineId', 'automationId', 'campaignId', 'formId',
];

const isScoped = (body: string): boolean =>
  SCOPE_MARKERS.some((marker) => body.includes(marker));

describe('tenant isolation', () => {
  const findings: Finding[] = [];

  beforeAll(() => {
    const pattern = new RegExp(
      `prisma\\.(${TENANT_MODELS.join('|')})\\.(${READ_OPS.join('|')})`,
      'g',
    );

    for (const file of walk(SRC)) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file).replace(/\\/g, '/');
      for (const m of src.matchAll(pattern)) {
        const [match, model, op] = m;
        const idx = m.index ?? 0;
        if (isScoped(callBody(src, idx + match.length))) continue;
        findings.push({
          file: rel,
          model,
          op,
          line: src.slice(0, idx).split('\n').length,
          key: `${rel}:${model}.${op}`,
        });
      }
    }
  });

  it('scopes every Prisma read on a workspace-owned model', () => {
    const unexplained = findings.filter((f) => !(f.key in ALLOWLIST));

    if (unexplained.length) {
      const report = unexplained
        .map((f) => `  ${f.file}:${f.line}  prisma.${f.model}.${f.op}()`)
        .join('\n');
      throw new Error(
        `${unexplained.length} unscoped Prisma read(s) on workspace-owned models.\n` +
          'Each returns rows from every tenant. Scope it with withWorkspace(user, where),\n' +
          'or add it to ALLOWLIST in this file with the reason it is safe.\n\n' +
          report,
      );
    }
  });

  it('stamps agencyId on every write to a workspace-owned model', () => {
    const pattern = new RegExp(
      `prisma\\.(${TENANT_MODELS.join('|')})\\.(${WRITE_OPS.join('|')})`,
      'g',
    );
    const unstamped: string[] = [];

    for (const file of walk(SRC)) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file).replace(/\\/g, '/');
      for (const m of src.matchAll(pattern)) {
        const [match, model, op] = m;
        const idx = m.index ?? 0;
        const body = callBody(src, idx + match.length);
        // createMany takes a prebuilt array, so the stamping happens where that
        // array is built; look back over the enclosing function for it.
        const scope = op === 'createMany' ? src.slice(Math.max(0, idx - 2500), idx) + body : body;
        if (/agencyId|workspaceIdFor/.test(scope)) continue;
        const key = `${rel}:${model}.${op}`;
        if (key in ALLOWLIST) continue;
        const line = src.slice(0, idx).split('\n').length;
        unstamped.push(`  ${rel}:${line}  prisma.${model}.${op}()`);
      }
    }

    if (unstamped.length) {
      throw new Error(
        `${unstamped.length} write(s) to workspace-owned models without an agencyId.\n` +
          'Rows created without one belong to no workspace and are invisible to every\n' +
          'query. Stamp them with workspaceIdFor(user).\n\n' +
          unstamped.join('\n'),
      );
    }
  });

  it('keeps the allowlist free of stale entries', () => {
    // Collect every call the allowlist could legitimately cover — reads and
    // writes alike — so that fixing a call also forces its entry to be removed.
    const pattern = new RegExp(
      `prisma\\.(${TENANT_MODELS.join('|')})\\.(${[...READ_OPS, ...WRITE_OPS].join('|')})`,
      'g',
    );
    const live = new Set<string>();
    for (const file of walk(SRC)) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file).replace(/\\/g, '/');
      for (const m of src.matchAll(pattern)) {
        live.add(`${rel}:${m[1]}.${m[2]}`);
      }
    }

    const stale = Object.keys(ALLOWLIST).filter((k) => !live.has(k));
    expect(stale).toEqual([]);
  });
});
