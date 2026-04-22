# Clerk Authentication Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk as the login gateway for the CRM so the owner controls who accesses the platform, while keeping all existing backend logic, roles, and permissions completely unchanged.

**Architecture:** Clerk handles the login UI and session. After Clerk login, the frontend calls a new `/auth/clerk-exchange` endpoint which verifies the Clerk token and returns the existing CRM JWT — from that point the app behaves exactly as today. A `clerkUserId` column is added to the User table and populated on first login via email match.

**Tech Stack:** React 19 + Vite + React Router, `@clerk/clerk-react` (frontend), Node.js + Express + Prisma, `@clerk/backend` (backend)

---

## File Map

**Created:**
- `frontend/src/pages/ClerkLoginPage.tsx` — new login page wrapping Clerk `<SignIn>`
- `backend/src/modules/auth/clerk-exchange.service.ts` — clerkExchange service function
- `backend/prisma/migrations/[timestamp]_add_clerk_user_id/migration.sql` — auto-generated

**Modified:**
- `frontend/package.json` — add `@clerk/clerk-react`
- `frontend/src/main.tsx` — wrap with `<ClerkProvider>`
- `frontend/src/App.tsx` — swap `/login` route to `ClerkLoginPage`
- `frontend/src/store/auth.store.ts` — add `clerkExchange` action
- `frontend/src/components/layout/ProtectedRoute.tsx` — add Clerk session guard
- `frontend/src/components/layout/TopBar.tsx` — call `clerk.signOut()` on logout
- `backend/package.json` — add `@clerk/backend`
- `backend/prisma/schema.prisma` — add `clerkUserId` field to User model
- `backend/src/modules/auth/auth.router.ts` — add `/clerk-exchange` route
- `backend/src/modules/auth/auth.controller.ts` — add `clerkExchange` handler
- `backend/src/modules/auth/auth.service.ts` — re-export or import from clerk-exchange.service.ts

---

## Task 1: Install dependencies

**Files:**
- Modify: `frontend/package.json`
- Modify: `backend/package.json`

- [ ] **Step 1: Install Clerk frontend SDK**

```bash
cd "frontend"
npm install @clerk/clerk-react
```

Expected output: `added X packages`

- [ ] **Step 2: Install Clerk backend SDK**

```bash
cd "../backend"
npm install @clerk/backend
```

Expected output: `added X packages`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json backend/package.json backend/package-lock.json
git commit -m "chore: install @clerk/clerk-react and @clerk/backend"
```

---

## Task 2: Add Clerk prisma migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration (auto-generated)

- [ ] **Step 1: Add `clerkUserId` to User model**

Open `backend/prisma/schema.prisma`. Find the `model User` block and add the field after `googleId`:

```prisma
clerkUserId  String? @unique
```

So the User model has:
```prisma
  googleId     String? @unique
  clerkUserId  String? @unique
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_clerk_user_id
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add clerkUserId to User model"
```

---

## Task 3: Backend — clerk-exchange service

**Files:**
- Create: `backend/src/modules/auth/clerk-exchange.service.ts`

- [ ] **Step 1: Create the service file**

Create `backend/src/modules/auth/clerk-exchange.service.ts`:

```typescript
import { createClerkClient } from '@clerk/backend';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export const clerkExchange = async (clerkToken: string): Promise<{ token: string; user: object }> => {
  let payload: any;
  try {
    payload = await clerkClient.verifyToken(clerkToken);
  } catch {
    const err: any = new Error('Token Clerk inválido');
    err.status = 401;
    throw err;
  }

  const clerkUserId: string = payload.sub;
  const email: string | undefined = payload.email;

  // Try lookup by clerkUserId first, then fall back to email
  let user = await prisma.user.findUnique({ where: { clerkUserId } });

  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // First-time Clerk login: save clerkUserId for future lookups
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkUserId },
      });
    }
  }

  if (!user) {
    const err: any = new Error('Utilizador não encontrado no CRM');
    err.status = 401;
    throw err;
  }

  if (!user.isActive) {
    const err: any = new Error('Conta desativada');
    err.status = 401;
    throw err;
  }

  const crmToken = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _, ...userWithoutHash } = user as any;
  return { token: crmToken, user: userWithoutHash };
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/auth/clerk-exchange.service.ts
git commit -m "feat(auth): add clerkExchange service"
```

---

## Task 4: Backend — controller + router

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.router.ts`

- [ ] **Step 1: Add controller handler**

Open `backend/src/modules/auth/auth.controller.ts`. At the end of the file, add:

```typescript
import { clerkExchange as clerkExchangeService } from './clerk-exchange.service';

export const clerkExchange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(400).json({ error: 'Token Clerk em falta', status: 400 });
      return;
    }
    const clerkToken = authHeader.slice(7);
    const result = await clerkExchangeService(clerkToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Add route**

Open `backend/src/modules/auth/auth.router.ts`. Add the new route after the existing ones (before `export default router`):

```typescript
router.post('/clerk-exchange', authController.clerkExchange);
```

The full router should now look like:
```typescript
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/google', authController.googleAuth);
router.get('/me', authenticate, authController.getMe);
router.post('/clerk-exchange', authController.clerkExchange);
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/auth/auth.controller.ts backend/src/modules/auth/auth.router.ts
git commit -m "feat(auth): add /auth/clerk-exchange endpoint"
```

---

## Task 5: Frontend — ClerkProvider in main.tsx

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Wrap app with ClerkProvider**

Open `frontend/src/main.tsx`. Add the import at the top:

```typescript
import { ClerkProvider } from '@clerk/clerk-react'
```

Wrap the existing render tree with `ClerkProvider`. The `createRoot(...).render(...)` call should become:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
                success: {
                  iconTheme: { primary: '#16A34A', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#DC2626', secondary: '#fff' },
                },
              }}
            />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>
)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat(auth): wrap app with ClerkProvider"
```

---

## Task 6: Frontend — auth store clerkExchange action

**Files:**
- Modify: `frontend/src/store/auth.store.ts`

- [ ] **Step 1: Add clerkExchange action to the store interface**

Open `frontend/src/store/auth.store.ts`. Add `clerkExchange` to the `AuthState` interface:

```typescript
clerkExchange: (clerkToken: string) => Promise<void>
```

- [ ] **Step 2: Add the implementation**

Inside the `create<AuthState>` call, add the action after `setAuth`:

```typescript
clerkExchange: async (clerkToken: string) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/clerk-exchange`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clerkToken}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erro de autenticação');
  }
  const { token, user } = await res.json();
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_user', JSON.stringify(user));
  set({ user, token, hydrated: true, impersonating: null, currentLocation: null });
},
```

- [ ] **Step 3: Check what VITE_API_URL looks like in the existing api client**

```bash
grep -n "VITE_API_URL\|baseURL" frontend/src/api/client.ts | head -5
```

If the existing client uses a different env var or base path, use the same value in the fetch call above. Replace `import.meta.env.VITE_API_URL || ''` with whatever the existing client uses.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/auth.store.ts
git commit -m "feat(auth): add clerkExchange action to auth store"
```

---

## Task 7: Frontend — ClerkLoginPage

**Files:**
- Create: `frontend/src/pages/ClerkLoginPage.tsx`

- [ ] **Step 1: Create the login page**

Create `frontend/src/pages/ClerkLoginPage.tsx`:

```tsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useSession } from '@clerk/clerk-react'
import { useAuthStore } from '../store/auth.store'

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn } = useAuth()
  const { session } = useSession()
  const { clerkExchange, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSignedIn || !session) return
    if (token) { navigate('/dashboard', { replace: true }); return }

    session.getToken().then(async (clerkToken) => {
      if (!clerkToken) return
      try {
        await clerkExchange(clerkToken)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Clerk exchange failed:', err)
      }
    })
  }, [isSignedIn, session, token, clerkExchange, navigate])

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f8' }}>
      <SignIn routing="hash" />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ClerkLoginPage.tsx
git commit -m "feat(auth): add ClerkLoginPage"
```

---

## Task 8: Frontend — swap /login route in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Import ClerkLoginPage**

Open `frontend/src/App.tsx`. Add the import:

```typescript
import { ClerkLoginPage } from './pages/ClerkLoginPage'
```

- [ ] **Step 2: Replace the /login route**

Find:
```tsx
<Route path="/login" element={<LoginPage />} />
```

Replace with:
```tsx
<Route path="/login" element={<ClerkLoginPage />} />
```

Keep the `LoginPage` import temporarily — remove it in Task 10 after confirming login works.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(auth): use ClerkLoginPage for /login route"
```

---

## Task 9: Frontend — ProtectedRoute Clerk guard

**Files:**
- Modify: `frontend/src/components/layout/ProtectedRoute.tsx`

- [ ] **Step 1: Add Clerk session check**

Open `frontend/src/components/layout/ProtectedRoute.tsx`. Add the import:

```typescript
import { useAuth } from '@clerk/clerk-react'
```

Inside the `ProtectedRoute` component, add after the existing hooks:

```typescript
const { isSignedIn, isLoaded: clerkLoaded } = useAuth()
```

Update the loading check to also wait for Clerk:

```typescript
if (!hydrated || !clerkLoaded) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#f0f2f8' }}>
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
    </div>
  )
}
```

Add a Clerk session check before the existing token check:

```typescript
if (!isSignedIn) {
  return <Navigate to="/login" replace />
}
```

The full guard order should be:
1. Loading spinner (while `!hydrated || !clerkLoaded`)
2. Clerk session check (`!isSignedIn` → `/login`)
3. CRM token check (`!token || !user` → `/login`)
4. Role check (existing)
5. Permission check (existing)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/ProtectedRoute.tsx
git commit -m "feat(auth): add Clerk session guard to ProtectedRoute"
```

---

## Task 10: Frontend — logout calls clerk.signOut()

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Add Clerk sign-out to logout handler**

Open `frontend/src/components/layout/TopBar.tsx`. Add the import:

```typescript
import { useClerk } from '@clerk/clerk-react'
```

Inside the `TopBar` component, add:

```typescript
const { signOut } = useClerk()
```

Find the existing `handleLogout` function (line ~78):
```typescript
const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
```

Replace with:
```typescript
const handleLogout = () => {
  logout()
  signOut({ redirectUrl: '/login' })
}
```

Remove the `navigate('/login', { replace: true })` call since Clerk's `signOut` handles the redirect.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.tsx
git commit -m "feat(auth): call clerk.signOut() on logout"
```

---

## Task 11: Environment variables

- [ ] **Step 1: Add local dev env vars**

Create or update `frontend/.env.local` (not committed):

```
VITE_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key from clerk.com dashboard>
```

Create or update `backend/.env` (not committed):

```
CLERK_SECRET_KEY=<your Clerk secret key from clerk.com dashboard>
```

Get these values from [clerk.com](https://clerk.com) → your app → API Keys.

- [ ] **Step 2: Add vars in Railway**

In Railway dashboard:
- Frontend service → Variables → add `VITE_CLERK_PUBLISHABLE_KEY`
- Backend service → Variables → add `CLERK_SECRET_KEY`

- [ ] **Step 3: Disable sign-up in Clerk dashboard**

In Clerk dashboard → Configure → Restrictions → enable **"Block all sign-ups"**. This ensures only you can create accounts.

---

## Task 12: Smoke test + cleanup

- [ ] **Step 1: Start both services locally**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Test login flow**

1. Open `http://localhost:5173`
2. Confirm redirect to `/login` with Clerk sign-in UI
3. Sign in with a Clerk account whose email matches an existing CRM user
4. Confirm redirect to `/dashboard` and CRM works normally
5. Click logout — confirm Clerk session is cleared (opening the app again shows login)

- [ ] **Step 3: Remove old LoginPage import from App.tsx**

Open `frontend/src/App.tsx`. Remove the `LoginPage` import if it's no longer used anywhere.

- [ ] **Step 4: Final commit**

```bash
git add frontend/src/App.tsx
git commit -m "chore: remove unused LoginPage import after Clerk migration"
git push
```
