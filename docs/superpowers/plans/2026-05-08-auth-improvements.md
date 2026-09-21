# Auth Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar recuperação de password por email (forgot/reset) e refresh token para sessões persistentes.

**Architecture:** Dois fluxos independentes: (1) forgot-password gera token único guardado em DB, envia email, página de reset valida e altera hash; (2) refresh token gerado no login, guardado em DB, endpoint `/api/auth/refresh` troca por novo access token.

**Tech Stack:** Express, Prisma (PostgreSQL), nodemailer (já configurado), jsonwebtoken, bcryptjs, React, React Router, React Hook Form + Zod.

---

### Task 1: Migração Prisma — PasswordResetToken + RefreshToken

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar modelos ao schema**

Abrir `backend/prisma/schema.prisma` e adicionar no final (antes do último modelo):

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([email])
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

E no modelo `User` adicionar a relação (após `calendarSlots CalendarSlot[]`):
```prisma
  refreshTokens RefreshToken[]
```

- [ ] **Step 2: Criar e aplicar migration**

```bash
cd backend
npx prisma migrate dev --name add_auth_tokens
```

Resultado esperado: `✓ Generated Prisma Client` sem erros.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(auth): add PasswordResetToken and RefreshToken models"
```

---

### Task 2: Backend — Forgot Password endpoint

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.router.ts`

- [ ] **Step 1: Adicionar `forgotPassword` ao service**

Em `backend/src/modules/auth/auth.service.ts`, adicionar no final do ficheiro (antes do último `}`):

```typescript
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const forgotPassword = async (email: string): Promise<void> => {
  // Always resolve (don't leak whether email exists)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // Invalidate previous tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'CasaFlow'}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Recuperação de password — CasaFlow',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0f2553">Recuperar password</h2>
        <p>Clica no botão abaixo para definir uma nova password. O link expira em 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0f2553;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Definir nova password</a>
        <p style="color:#888;font-size:12px;margin-top:24px">Se não pediste a recuperação, ignora este email.</p>
      </div>
    `,
  });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) throw Object.assign(new Error('Token inválido'), { status: 400 });
  if (record.usedAt) throw Object.assign(new Error('Token já utilizado'), { status: 410 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Token expirado'), { status: 410 });
  if (newPassword.length < 6) throw Object.assign(new Error('A password deve ter pelo menos 6 caracteres'), { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { email: record.email }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);
};
```

> Nota: `bcrypt` já está importado no topo do ficheiro. O import de `crypto` e `nodemailer` deve ser adicionado no topo do ficheiro, após os imports existentes.

- [ ] **Step 2: Adicionar rotas ao router**

Em `backend/src/modules/auth/auth.router.ts`, adicionar antes da linha `export default router;`:

```typescript
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email obrigatório' }); return; }
    await authService.forgotPassword(email);
    res.json({ message: 'Se o email existir, receberás instruções em breve.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { res.status(400).json({ error: 'Token e password obrigatórios' }); return; }
    await authService.resetPassword(token, password);
    res.json({ message: 'Password alterada com sucesso.' });
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat(auth): add forgot-password and reset-password endpoints"
```

---

### Task 3: Backend — Refresh Token

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.router.ts`
- Modify: `backend/src/utils/jwt.ts`

- [ ] **Step 1: Verificar `backend/src/utils/jwt.ts`**

Abrir o ficheiro e confirmar que exporta `signToken`. Se não existir `verifyToken`, adicionar:

```typescript
export const verifyToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};
```

- [ ] **Step 2: Adicionar lógica de refresh ao service**

Em `backend/src/modules/auth/auth.service.ts`, adicionar no final:

```typescript
export const issueRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!record) throw Object.assign(new Error('Refresh token inválido'), { status: 401 });
  if (record.revokedAt) throw Object.assign(new Error('Refresh token revogado'), { status: 401 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('Refresh token expirado'), { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw Object.assign(new Error('Utilizador inativo'), { status: 401 });

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({ where: { token: refreshToken }, data: { revokedAt: new Date() } });
  const newRefreshToken = await issueRefreshToken(user.id);
  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });

  return { token: accessToken, refreshToken: newRefreshToken };
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
```

- [ ] **Step 3: Emitir refresh token no login**

No `auth.service.ts`, encontrar a função `login` (ou `loginWithEmail`). Após criar o `token` JWT, adicionar:

```typescript
const refresh = await issueRefreshToken(user.id);
return { token, refreshToken: refresh, user: { id: user.id, name: user.name, email: user.email, role: user.role, ... } };
```

> Adaptar ao return existente — apenas adicionar o campo `refreshToken`.

- [ ] **Step 4: Adicionar rota de refresh**

Em `auth.router.ts`, adicionar:

```typescript
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'refreshToken obrigatório' }); return; }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/logout-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.revokeAllRefreshTokens((req as any).user.id);
    res.json({ message: 'Todas as sessões terminadas.' });
  } catch (err) { next(err); }
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/ backend/src/utils/jwt.ts
git commit -m "feat(auth): add refresh token rotation and logout-all"
```

---

### Task 4: Frontend — Página Forgot Password

**Files:**
- Create: `frontend/src/pages/ForgotPasswordPage.tsx`
- Create: `frontend/src/pages/ResetPasswordPage.tsx`
- Modify: `frontend/src/api/auth.api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Adicionar funções à API**

Em `frontend/src/api/auth.api.ts`, adicionar:

```typescript
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data;
};

export const refreshTokens = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data;
};
```

- [ ] **Step 2: Criar ForgotPasswordPage**

Criar `frontend/src/pages/ForgotPasswordPage.tsx`:

```tsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth.api'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email obrigatório'); return }
    setLoading(true); setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tenta novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 36 }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700 }}>Recuperar password</h2>
        {sent ? (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Se o email existir na plataforma, receberás um link de recuperação em breve.
            </p>
            <Link to="/login" style={{ color: 'var(--accent)', fontSize: 13 }}>← Voltar ao login</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px' }}>
              Indica o teu email e enviamos instruções para recuperares o acesso.
            </p>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="o.teu@email.com" autoFocus
              style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', background: 'var(--surface-2)', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'A enviar…' : 'Enviar link de recuperação'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>← Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar ResetPasswordPage**

Criar `frontend/src/pages/ResetPasswordPage.tsx`:

```tsx
import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword } from '../api/auth.api'

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('A password deve ter pelo menos 6 caracteres'); return }
    if (password !== confirm) { setError('As passwords não coincidem'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Link inválido ou expirado.')
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p>Link inválido.</p>
        <Link to="/login">← Voltar ao login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 36 }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 22, fontWeight: 700 }}>Nova password</h2>
        {done ? (
          <p style={{ color: '#16a34a', fontSize: 14 }}>Password alterada com sucesso! A redirecionar…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {(['password', 'confirm'] as const).map((field) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  {field === 'password' ? 'Nova password' : 'Confirmar password'}
                </label>
                <input
                  type="password"
                  value={field === 'password' ? password : confirm}
                  onChange={e => field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value)}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', background: 'var(--surface-2)', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'A guardar…' : 'Guardar nova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Registar rotas em App.tsx**

Em `frontend/src/App.tsx`, no bloco de rotas públicas (junto a `/login`), adicionar:

```tsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

E adicionar os imports no topo:
```tsx
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
```

- [ ] **Step 5: Adicionar link "Esqueci a password" na LoginPage**

Em `frontend/src/pages/LoginPage.tsx`, localizar o campo de password e adicionar após o input:

```tsx
<div style={{ textAlign: 'right', marginTop: -8, marginBottom: 12 }}>
  <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Esqueci a password</Link>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/ResetPasswordPage.tsx frontend/src/api/auth.api.ts frontend/src/App.tsx frontend/src/pages/LoginPage.tsx
git commit -m "feat(auth): forgot password and reset password UI flow"
```

---

### Task 5: Frontend — Persistência com Refresh Token

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/store/auth.store.ts`

- [ ] **Step 1: Guardar refresh token no login**

Em `frontend/src/store/auth.store.ts`, na action `setAuth` (ou onde se guarda o token), garantir que também guarda o refreshToken:

```typescript
// Adicionar ao setAuth ou ao resultado do login:
if (refreshToken) {
  localStorage.setItem('crm_refresh_token', refreshToken);
}
```

E ao fazer logout, limpar também:
```typescript
localStorage.removeItem('crm_refresh_token');
```

- [ ] **Step 2: Interceptor de renovação automática**

Em `frontend/src/api/client.ts`, adicionar interceptor de resposta após a criação do axios instance:

```typescript
import { refreshTokens } from './auth.api';

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const stored = localStorage.getItem('crm_refresh_token');
        if (!stored) throw new Error('no refresh token');
        const { token, refreshToken } = await refreshTokens(stored);
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_refresh_token', refreshToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        queue.forEach((cb) => cb(token));
        queue = [];
        original.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        queue = [];
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

> Adaptar o nome da instância axios (`apiClient` ou `api`) ao que existir no ficheiro.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/store/auth.store.ts
git commit -m "feat(auth): refresh token interceptor for automatic session renewal"
```

---
