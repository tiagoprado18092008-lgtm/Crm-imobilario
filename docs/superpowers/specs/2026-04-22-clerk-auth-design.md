# Clerk Authentication Integration — Design Spec

**Date:** 2026-04-22  
**Status:** Approved

## Goal

Add Clerk as the authentication gateway for the CRM. The owner controls who accesses the platform via the Clerk dashboard (no public sign-up). The existing CRM backend, roles, permissions, and all business logic remain completely unchanged.

## Architecture

```
User → Clerk UI (login) → Clerk session token
                               ↓
                  POST /auth/clerk-exchange  (new backend endpoint)
                  - verifies Clerk token via @clerk/backend SDK
                  - looks up CRM user by email
                  - saves clerkUserId on first match
                  - returns CRM JWT + user object
                               ↓
               useAuthStore.setAuth(user, crmJwt)  ← unchanged from today
                               ↓
               All existing CRM routes, guards, roles work as before
```

## Frontend Changes

**Stack:** React 19 + Vite + React Router (NOT Next.js)

### 1. `frontend/package.json`
Add dependency: `@clerk/clerk-react`

### 2. `frontend/.env` / Railway env vars
Add: `VITE_CLERK_PUBLISHABLE_KEY`

### 3. `frontend/src/main.tsx`
Wrap the app with `<ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>`. Keep `BrowserRouter`, `GoogleOAuthProvider`, and everything else intact.

### 4. `frontend/src/pages/LoginPage.tsx`
Replace the email/password form and Google button with Clerk's `<SignIn>` component. The existing design tokens and page layout can be kept as the outer wrapper — the `<SignIn>` component renders inside.

### 5. `frontend/src/components/layout/ProtectedRoute.tsx`
Add Clerk session check alongside the existing `token`/`user` check:
- Import `useAuth` from `@clerk/clerk-react`
- If `!isSignedIn && hydrated` → redirect to `/login`
- Existing role/permission logic unchanged

### 6. `frontend/src/store/auth.store.ts`
Add `clerkExchange` action:
- Calls `session.getToken()` to get Clerk token
- POSTs to `/auth/clerk-exchange`
- On success calls existing `setAuth(user, token)`

### 7. Remove
- `frontend/src/pages/RegisterPage.tsx` — registration is now done via Clerk dashboard only
- Google OAuth login button in LoginPage (Clerk handles Google natively if enabled)

### 8. `frontend/src/components/layout/TopBar.tsx` or `Sidebar.tsx`
Replace existing logout button with Clerk's `<UserButton afterSignOutUrl="/login" />` for session management, or call `clerk.signOut()` then `useAuthStore.logout()` in the existing logout handler.

## Backend Changes

**Stack:** Node.js + Express + Prisma

### 1. `backend/package.json`
Add dependency: `@clerk/backend`

### 2. `backend/.env` / Railway env vars
Add: `CLERK_SECRET_KEY`

### 3. `backend/prisma/schema.prisma`
Add field to User model:
```prisma
clerkUserId  String? @unique
```
Run `prisma migrate dev --name add_clerk_user_id`

### 4. `backend/src/modules/auth/auth.controller.ts`
Add new handler `clerkExchange`:
```
POST /auth/clerk-exchange
Authorization: Bearer <clerkToken>
```
- Verifies token with `createClerkClient({ secretKey }).verifyToken(token)`
- Extracts `sub` (clerkUserId) and `email` from payload
- Looks up user: first by `clerkUserId`, then by `email`
- On first email match: saves `clerkUserId` to user record
- If user not found or `isActive === false`: returns 401
- On success: returns `{ token: crmJwt, user }` — identical shape to `/auth/login` response

### 5. `backend/src/modules/auth/auth.routes.ts`
Add route: `POST /auth/clerk-exchange` → `clerkExchange` controller (no auth middleware, public endpoint)

### 6. `backend/src/modules/auth/auth.service.ts`
Add `clerkExchange(clerkUserId, email)` service function mirroring the pattern of `googleAuth()`.

## Clerk Dashboard Configuration

- **Sign-up disabled** — Settings → Restrictions → "Disable sign-ups" ON
- **Allowed identifiers** — email address
- Users created manually by owner (name, email, temporary password)
- To revoke access: disable or delete the user in Clerk dashboard → their Clerk token immediately becomes invalid

## Environment Variables Summary

| Variable | Where | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (Railway) | Clerk frontend key |
| `CLERK_SECRET_KEY` | Backend (Railway) | Clerk backend verification |

## What Does NOT Change

- All CRM routes, pages, and features
- Backend JWT signing and validation (`signToken`, auth middleware)
- `useAuthStore` shape and all consumers
- Roles, permissions, impersonation, locations
- All other API endpoints
- Database structure except adding `clerkUserId` column

## Migration of Existing Users

Existing users are matched by email on first Clerk login. The `clerkUserId` is saved automatically — no manual migration needed.
