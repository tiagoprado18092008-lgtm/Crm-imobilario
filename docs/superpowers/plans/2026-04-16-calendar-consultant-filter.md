# Calendar: Consultant Filter + Event Origin Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "View by consultant" dropdown to the calendar (visible to admins/managers), and add a visual indicator on each event showing whether it came from Google Calendar, Outlook, or was created in the CRM.

**Architecture:** CalendarPage gets a `selectedUserId` state + dropdown populated from the users API. This `userId` param is passed to `listCalendarEvents` and `listAppointments`. Backend `calendar-events.service.list()` accepts an optional `targetUserId` that admins can use to query other users' events. `CalendarView` event blocks get a small origin badge/icon using the existing `externalProvider` field (already present on `CalendarEvent`).

**Tech Stack:** React + TypeScript frontend, Express/TypeScript backend, existing `CalendarEvent.externalProvider` field ("google" | "outlook" | null)

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/src/modules/calendar/calendar-events.service.ts` — accept optional `targetUserId` param |
| Modify | `backend/src/modules/calendar/calendar-events.router.ts` — pass `userId` query param to service |
| Modify | `backend/src/modules/appointments/appointments.service.ts` — expose `assignedToId` filter |
| Modify | `backend/src/modules/appointments/appointments.router.ts` — pass `assignedToId` param |
| Modify | `frontend/src/pages/CalendarPage.tsx` — add consultant dropdown + pass userId to fetchers |
| Modify | `frontend/src/components/calendar/CalendarView.tsx` — origin badge on event blocks |
| Modify | `frontend/src/components/calendar/EventModal.tsx` — show origin in event detail modal |

---

## Task 1: Backend — calendar-events accepts targetUserId

**Files:**
- Modify: `backend/src/modules/calendar/calendar-events.service.ts`
- Modify: `backend/src/modules/calendar/calendar-events.router.ts`

The current `list()` signature is:
```typescript
export const list = async (userId: string, filters: { start?, end?, eventType?, contactId? })
```
It always queries `where.userId = userId` (the caller's own ID). We need to allow admins to query another user's events.

- [ ] **Step 1: Add targetUserId param to list()**

In `backend/src/modules/calendar/calendar-events.service.ts`, update the `list()` function:

```typescript
export const list = async (
  userId: string,
  filters: {
    start?: string;
    end?: string;
    eventType?: string;
    contactId?: string;
    targetUserId?: string;  // admin can query another user's events
  }
) => {
  // Use targetUserId if provided, otherwise own events
  const queryUserId = filters.targetUserId || userId;

  const where: any = { userId: queryUserId };
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
```

- [ ] **Step 2: Pass userId query param in the router**

In `backend/src/modules/calendar/calendar-events.router.ts`, find the `GET /` handler. It currently calls `svc.list(req.user.id, filters)`. Update to pass `targetUserId` if the requester is an admin:

```typescript
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const { start, end, eventType, contactId, userId: queryUserId } = req.query as any;
    const adminRoles = ['AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER'];
    const canViewOthers = adminRoles.includes(req.user.role);
    const targetUserId = canViewOthers && queryUserId ? queryUserId : undefined;

    const events = await svc.list(req.user.id, { start, end, eventType, contactId, targetUserId });
    res.json(events);
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/calendar/calendar-events.service.ts backend/src/modules/calendar/calendar-events.router.ts
git commit -m "feat(calendar): allow admins to query calendar events by userId"
```

---

## Task 2: Backend — appointments exposes assignedToId filter

**Files:**
- Modify: `backend/src/modules/appointments/appointments.service.ts`
- Modify: `backend/src/modules/appointments/appointments.router.ts`

The `list()` in `appointments.service.ts` already builds a scope-based `where` clause. We just need to allow `assignedToId` to be passed and applied — and allow admins to override the scope.

- [ ] **Step 1: Add assignedToId to list() filter**

In `backend/src/modules/appointments/appointments.service.ts`, find the `list()` function. After the existing filters, add:

```typescript
// Allow admins to filter by a specific consultant
if (filters.assignedToId) {
  where.assignedToId = filters.assignedToId;
}
```

The full updated block:

```typescript
export const list = async (user: any, filters: any = {}) => {
  const where: any = await buildWhereClause(user);
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.from || filters.to) {
    where.startAt = {};
    if (filters.from) where.startAt.gte = new Date(filters.from);
    if (filters.to) where.startAt.lte = new Date(filters.to);
  }
  return prisma.appointment.findMany({ where, select, orderBy: { startAt: 'asc' } });
};
```

- [ ] **Step 2: Pass assignedToId in the router**

In `backend/src/modules/appointments/appointments.router.ts`, find the `GET /` handler and ensure it extracts and passes `assignedToId`:

```typescript
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const { status, type, contactId, assignedToId, from, to } = req.query as any;
    const adminRoles = ['AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER'];
    const canViewOthers = adminRoles.includes(req.user.role);
    const filters: any = { status, type, contactId, from, to };
    if (canViewOthers && assignedToId) filters.assignedToId = assignedToId;
    res.json(await svc.list(req.user, filters));
  } catch (e: any) {
    res.status(e.status || 500).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/appointments/appointments.service.ts backend/src/modules/appointments/appointments.router.ts
git commit -m "feat(appointments): allow admins to filter by assignedToId"
```

---

## Task 3: Frontend — consultant dropdown in CalendarPage

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`

The current CalendarPage header has `SyncStatusBadge`, navigation arrows, view switcher, and a settings link. We add a consultant dropdown before those controls. It's only shown for admin roles.

- [ ] **Step 1: Add selectedUserId state and consultant dropdown**

In `frontend/src/pages/CalendarPage.tsx`:

**Add state** (near the top with other useState declarations):

```typescript
const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
```

**Add consultant dropdown in the header JSX.** Find the header section (around line 226-245). Before the `SyncStatusBadge` or navigation buttons, insert:

```typescript
{/* Consultant filter — admins only */}
{(user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN' || user?.role === 'TEAM_LEADER') && users.length > 0 && (
  <select
    value={selectedUserId || ''}
    onChange={e => setSelectedUserId(e.target.value || null)}
    style={{
      padding: '7px 12px',
      borderRadius: 8,
      border: '1.5px solid #dce3ef',
      fontSize: 13,
      color: '#374151',
      background: '#fff',
      fontFamily: 'inherit',
      cursor: 'pointer',
      outline: 'none',
    }}
  >
    <option value="">Todos os consultores</option>
    {users.map((u: any) => (
      <option key={u.id} value={u.id}>{u.name}</option>
    ))}
  </select>
)}
```

**Update fetchCalendarEvents** to pass the selectedUserId:

```typescript
const fetchCalendarEvents = async () => {
  try {
    const params: any = {}
    if (selectedUserId) params.userId = selectedUserId
    const res = await listCalendarEvents(params)
    setCalendarEvents(res.data || [])
  } catch { /* ignore */ }
}
```

**Update fetchAppointments** (if present, or wherever appointments are fetched in the page) to pass `assignedToId`:

```typescript
const fetchAppointments = async () => {
  try {
    const params: any = {}
    if (selectedUserId) params.assignedToId = selectedUserId
    const res = await listAppointments(params)
    // set appointments state
  } catch { /* ignore */ }
}
```

**Add selectedUserId to the useEffect dependency array** so re-fetching happens when the filter changes:

```typescript
useEffect(() => {
  fetchCalendarEvents()
  fetchAppointments()
}, [selectedUserId, /* existing deps */])
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add consultant filter dropdown for admin roles"
```

---

## Task 4: Frontend — event origin badge in CalendarView

**Files:**
- Modify: `frontend/src/components/calendar/CalendarView.tsx`

Each event block (`EvBlock` component, lines 169-219) currently shows title + time. We add a small origin icon in the top-right corner of each event block.

The Google Calendar icon is an SVG. We inline a compact version (16×16) to avoid adding a dependency.

- [ ] **Step 1: Add origin badge to EvBlock**

In `CalendarView.tsx`, find the `EvBlock` component (around line 169). Inside the event block `div`, after the title/time content, add the origin indicator:

```typescript
{/* Origin indicator */}
{ev.externalProvider === 'google' && (
  <div
    title="Google Calendar"
    style={{
      position: 'absolute',
      top: 3,
      right: 4,
      width: 14,
      height: 14,
      flexShrink: 0,
    }}
  >
    <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="#4285F4"/>
    </svg>
  </div>
)}
{ev.externalProvider === 'outlook' && (
  <div
    title="Outlook"
    style={{
      position: 'absolute',
      top: 3,
      right: 4,
      width: 14,
      height: 14,
      fontSize: 9,
      fontWeight: 700,
      color: '#0078d4',
      lineHeight: '14px',
      textAlign: 'center',
    }}
  >
    O
  </div>
)}
```

Make sure the `EvBlock` container `div` has `position: 'relative'` (it likely already does for the absolute positioning of the block itself — confirm and add if missing).

- [ ] **Step 2: Add origin badge to all-day event chips (EvChip)**

Find the `EvChip` component (around line 351) — the pill shown for all-day events at the top of the calendar. Add the same Google SVG icon inline after the title text:

```typescript
{ev.externalProvider === 'google' && (
  <svg viewBox="0 0 24 24" width="11" height="11" style={{ marginLeft: 3, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="white"/>
  </svg>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/calendar/CalendarView.tsx
git commit -m "feat(calendar): add Google/Outlook origin icon to event blocks"
```

---

## Task 5: Frontend — show origin in EventModal

**Files:**
- Modify: `frontend/src/components/calendar/EventModal.tsx`

When the user clicks an event to open the detail modal, we show a label like "Google Calendar" or "CRM" near the top.

- [ ] **Step 1: Add origin row to event modal**

In `EventModal.tsx`, find the section where event details are displayed (title, date, location, description). Add an origin row:

```typescript
{/* Origin */}
<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
  {event.externalProvider === 'google' && (
    <>
      <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 11v2h2.5c-.1.7-.8 2-2.5 2-1.5 0-2.7-1.2-2.7-2.7S10.5 9.6 12 9.6c.8 0 1.4.4 1.7.7l1.4-1.4C14.2 8 13.2 7.5 12 7.5 9.5 7.5 7.5 9.5 7.5 12s2 4.5 4.5 4.5c2.6 0 4.3-1.8 4.3-4.4 0-.3 0-.5-.1-.7H12z" fill="#4285F4"/>
      </svg>
      <span style={{ fontSize: 12, color: '#6b7a99' }}>Google Calendar</span>
    </>
  )}
  {event.externalProvider === 'outlook' && (
    <>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0078d4' }}>O</span>
      <span style={{ fontSize: 12, color: '#6b7a99' }}>Outlook</span>
    </>
  )}
  {!event.externalProvider && (
    <span style={{ fontSize: 12, color: '#6b7a99' }}>Criado no CRM</span>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/calendar/EventModal.tsx
git commit -m "feat(calendar-modal): show event origin (Google / Outlook / CRM)"
```

---

## Task 6: Deploy and smoke test

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Verify consultant dropdown**

1. Log in as AGENCY_OWNER → open Calendar page
2. Dropdown "Todos os consultores" should appear in the header
3. Select a specific consultant — calendar should reload showing only their events and appointments
4. Log in as a CONSULTANT — dropdown should NOT appear; only own events shown

- [ ] **Step 3: Verify origin icons**

1. As a user with Google Calendar connected, open the calendar
2. Synced events should show a small Google "G" icon in the top-right corner of the event block
3. Click the event — modal should show "Google Calendar" with the icon
4. An event created directly in the CRM should show "Criado no CRM" in the modal, no icon on the block
