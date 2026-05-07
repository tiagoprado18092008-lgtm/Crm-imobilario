# Design: Invite-Only Agency Isolation

**Date:** 2026-04-23  
**Status:** Approved

## Problem

Any Clerk user who logs in is auto-provisioned into the first agency found in the database (`prisma.agency.findFirst()`). This means users from different agencies share data — complete cross-agency contamination.

## Goal

- A user can only enter the CRM if explicitly invited by an agency admin
- Clerk is the only authentication mechanism (no password-based invite accept)
- Agencies are fully isolated — no email can belong to two agencies
- Invitee flow: receive email → create Clerk account → login → land in correct agency team

---

## Architecture

### Invariant
**A `User` row in the DB is the source of truth for CRM access.** Clerk is only an identity provider. The `clerkExchange` service never creates users — it only associates a `clerkUserId` to an existing user.

---

## Changes

### 1. `invitations.service.ts` — create user at invite time

When an admin sends an invite:
1. Check if email already exists in `User` table → if yes, reject with 409 (cross-agency protection)
2. Create `User` with:
   - `email` from invitation
   - `agencyId` from the inviting admin's agency
   - `locationId` from invitation (if present)
   - `role` from invitation
   - `isActive: false`
   - `clerkUserId: null`
   - `name: ''` (placeholder until first login)
   - `passwordHash: ''`
3. Create `Invitation` record as before (token, expiry, etc.)

On invitation revoke (`revoke()`): also delete the associated inactive user (if `clerkUserId` is still null — i.e., never logged in).

### 2. `clerk-exchange.service.ts` — no more auto-provision

Remove `prisma.agency.findFirst()` and user creation entirely.

New logic:
1. Verify Clerk token → get `clerkUserId` + `email`
2. Lookup by `clerkUserId` → if found, proceed
3. Lookup by `email` → if found and `clerkUserId` is null → associate `clerkUserId`, set `isActive: true`, proceed
4. If not found → throw 401 "Sem acesso. Contacte o administrador da agência."

This means: if your email is not in the DB (created by an invitation), you cannot log in.

### 3. `InviteAcceptPage.tsx` — replace form with Clerk SignUp

The `/invite/:token` page:
1. Calls `GET /invitations/verify/:token` to validate the token and get the email
2. Renders Clerk `<SignUp>` component with the email pre-filled (using `initialValues`)
3. After Clerk signup completes, Clerk redirects to `/login` (or dashboard) — the normal `clerkExchange` flow handles the rest
4. Remove the `POST /auth/register` call entirely from this page

The name is collected by Clerk during signup and synced via `clerkUser.firstName + lastName` in `clerkExchange`.

### 4. `clerkExchange` — sync name on first login

When associating `clerkUserId` for the first time (step 3 above), also update `name` from Clerk user data:
```ts
name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0]
```

### 5. `auth.service.ts` `googleAuth` — no change needed

Google auth is a separate flow not used in this product. No action required.

---

## Data Flow

```
Admin clicks "Convidar"
  → POST /invitations { email, role }
  → invitations.service: check no existing user with email
  → create User (isActive=false, agencyId=admin.agencyId)
  → create Invitation (token, 7d expiry)
  → send email with link /invite/:token

Invitee opens link
  → InviteAcceptPage verifies token → gets email
  → Renders Clerk <SignUp initialValues={{ emailAddress: email }} />
  → Invitee creates Clerk account

Clerk redirects to /login (ClerkLoginPage)
  → clerkExchange(clerkToken)
  → lookup by clerkUserId → not found
  → lookup by email → found (isActive=false, clerkUserId=null)
  → update: clerkUserId, isActive=true, name from Clerk
  → mark Invitation.usedAt = now
  → return CRM token + user
  → navigate to /dashboard (correct agency)
```

---

## Isolation Guarantees

| Scenario | Behavior |
|---|---|
| New Clerk user, no invitation | 401 — rejected |
| Existing Clerk user from agency A tries to access agency B | 401 — email belongs to agency A only |
| Admin revokes invitation before invitee logs in | User row deleted, token invalid |
| Invitee already logged in (clerkUserId set) | Normal login, no re-association needed |
| Same email invited twice | 409 — user already exists |

---

## Files to Change

| File | Change |
|---|---|
| `backend/src/modules/invitations/invitations.service.ts` | Create User on invite, delete User on revoke |
| `backend/src/modules/auth/clerk-exchange.service.ts` | Remove auto-provision, add 401 for unknown emails |
| `frontend/src/pages/InviteAcceptPage.tsx` | Replace password form with Clerk `<SignUp>` |
