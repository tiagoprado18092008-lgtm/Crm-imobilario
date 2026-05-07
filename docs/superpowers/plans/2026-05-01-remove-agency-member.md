# Remove Agency Member Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the AGENCY_OWNER to remove (kick) members from their agency, and show the "Convidar" button on the Members tab.

**Architecture:** Add a `DELETE /agencies/:id/members/:userId` backend endpoint that nullifies the target user's `agencyId` and deactivates them. On the frontend, add a "Expulsar" button per member row (hidden for own row and for owner), a confirmation dialog, and move the "Convidar" button to the Members tab header.

**Tech Stack:** Node.js/Express/Prisma (backend), React/TypeScript (frontend)

---

### Task 1: Backend — remove member endpoint

**Files:**
- Modify: `backend/src/modules/agency/agency.service.ts`
- Modify: `backend/src/modules/agency/agency.controller.ts`
- Modify: `backend/src/modules/agency/agency.router.ts`

- [ ] **Step 1: Add `removeMember` to agency.service.ts**

Open `backend/src/modules/agency/agency.service.ts` and add after the `assignUserToAgency` function:

```typescript
export const removeMember = async (agencyId: string, userId: string, requesterId: string) => {
  if (userId === requesterId) {
    throw Object.assign(new Error('Não pode remover-se a si próprio'), { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.agencyId !== agencyId) {
    throw Object.assign(new Error('Utilizador não encontrado nesta agência'), { status: 404 });
  }
  if (target.role === 'AGENCY_OWNER') {
    throw Object.assign(new Error('Não é possível remover o proprietário da agência'), { status: 403 });
  }
  return prisma.user.update({
    where: { id: userId },
    data: { agencyId: null, isActive: false },
    select: { id: true, name: true, email: true },
  });
};
```

- [ ] **Step 2: Add `removeMember` controller handler to agency.controller.ts**

Open `backend/src/modules/agency/agency.controller.ts` and add at the end:

```typescript
export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agencyId = req.params.id;
    const userId = req.params.userId;
    if (req.user?.agencyId !== agencyId) {
      res.status(403).json({ error: 'Access denied', status: 403 });
      return;
    }
    const result = await agencyService.removeMember(agencyId, userId, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 3: Register the route in agency.router.ts**

Open `backend/src/modules/agency/agency.router.ts` and add after the `POST /:id/members` route (around line 53):

```typescript
// Remove a member from agency — owner only
router.delete('/:id/members/:userId', requireRole('AGENCY_OWNER'), agencyController.removeMember);
```

- [ ] **Step 4: Verify the server compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/agency/agency.service.ts backend/src/modules/agency/agency.controller.ts backend/src/modules/agency/agency.router.ts
git commit -m "feat(agency): add remove member endpoint (owner only)"
```

---

### Task 2: Frontend — API call and Members tab UI

**Files:**
- Modify: `frontend/src/api/agency.api.ts`
- Modify: `frontend/src/pages/AgencyPage.tsx`

- [ ] **Step 1: Add `removeAgencyMember` to agency.api.ts**

Open `frontend/src/api/agency.api.ts`. Find the existing exports and add:

```typescript
export const removeAgencyMember = (agencyId: string, userId: string) =>
  api.delete(`/agencies/${agencyId}/members/${userId}`);
```

- [ ] **Step 2: Import `removeAgencyMember` in AgencyPage.tsx**

Open `frontend/src/pages/AgencyPage.tsx`. Find the import line:

```typescript
import { listAgencyMembers, getMyAgency, updateAgency } from '../api/agency.api'
```

Replace with:

```typescript
import { listAgencyMembers, getMyAgency, updateAgency, removeAgencyMember } from '../api/agency.api'
```

- [ ] **Step 3: Add remove state and handler in AgencyPage**

In `AgencyPage` component, after the `inviteSending` state declaration, add:

```typescript
const [removingId, setRemovingId] = useState<string | null>(null)
const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

const handleRemoveMember = async (memberId: string) => {
  if (!user?.agencyId) return
  setRemovingId(memberId)
  try {
    await removeAgencyMember(user.agencyId, memberId)
    showToast('Membro removido da agência.', 'success')
    setMembers(prev => prev.filter(m => m.id !== memberId))
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Erro ao remover membro.', 'error')
  } finally {
    setRemovingId(null)
    setConfirmRemoveId(null)
  }
}
```

- [ ] **Step 4: Move "Convidar" button to Members tab header and add "Expulsar" column**

In `AgencyPage.tsx`, find the header section that currently shows the invite button only on `tab === 'invites'`:

```typescript
{tab === 'invites' && (
  <button
    onClick={() => setInviteOpen(true)}
    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
  >
    <UserPlus size={14} /> Convidar membro
  </button>
)}
```

Replace with:

```typescript
{(tab === 'members' || tab === 'invites') && (
  <button
    onClick={() => setInviteOpen(true)}
    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
  >
    <UserPlus size={14} /> Convidar membro
  </button>
)}
```

- [ ] **Step 5: Add "Ações" column header to members table**

Find the members table `<thead>` section:

```typescript
<th style={thStyle}>Desde</th>
```

Replace with:

```typescript
<th style={thStyle}>Desde</th>
{user?.role === 'AGENCY_OWNER' && <th style={{ ...thStyle, textAlign: 'right' }}></th>}
```

- [ ] **Step 6: Add "Expulsar" button to each member row**

Find the closing `</tr>` after the "Desde" `<td>` in the members table body:

```typescript
<td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(member.createdAt)}</td>
      </tr>
```

Replace with:

```typescript
<td style={{ ...tdStyle, color: '#6b7a99' }}>{formatDate(member.createdAt)}</td>
{user?.role === 'AGENCY_OWNER' && (
  <td style={{ ...tdStyle, textAlign: 'right' }}>
    {member.id !== user.id && member.role !== 'AGENCY_OWNER' && (
      confirmRemoveId === member.id ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Tem a certeza?</span>
          <button
            onClick={() => handleRemoveMember(member.id)}
            disabled={removingId === member.id}
            style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {removingId === member.id ? '...' : 'Sim'}
          </button>
          <button
            onClick={() => setConfirmRemoveId(null)}
            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e9f2', background: '#fff', color: '#6b7a99', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Não
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirmRemoveId(member.id)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Trash2 size={11} /> Expulsar
        </button>
      )
    )}
  </td>
)}
      </tr>
```

- [ ] **Step 7: Remove the duplicate "Convidar" button from the empty-state on invites tab**

Find in the INVITES TAB empty-state section the standalone invite button and remove it (the header button is sufficient):

```typescript
<button
  onClick={() => setInviteOpen(true)}
  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
>
  <UserPlus size={14} /> Convidar membro
</button>
```

Remove those lines (keep the `<p>` and icon above them).

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/agency.api.ts frontend/src/pages/AgencyPage.tsx
git commit -m "feat(agency): add expulsar member button and move convidar to members tab"
```

---

### Task 3: Final push

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

Expected: branch pushed successfully.
