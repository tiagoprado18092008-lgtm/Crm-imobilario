# Data Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo AMI (consultor + agência), tags nos contactos, tipo TENANT, e probabilidade de conversão nas oportunidades.

**Architecture:** Cada item é uma migração Prisma + ajuste de service + ajuste de UI. São independentes entre si mas agrupados numa única migration para eficiência.

**Tech Stack:** Prisma, Express, React, React Hook Form + Zod.

---

### Task 1: Migração Prisma — AMI + Tags + TENANT + Probabilidade

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar campos ao schema**

No modelo `User`, após o campo `onboardingCompleted Boolean @default(false)`, adicionar:
```prisma
  amiNumber    String?   // Número AMI do consultor
```

No modelo `Agency`, após o campo `niche String?`, adicionar:
```prisma
  amiNumber    String?   // Número AMI da agência
```

No modelo `Contact`, após o campo `score Int @default(0)`, adicionar:
```prisma
  tags         String[]  @default([])
```

No modelo `Opportunity`, após o campo `value Float?`, adicionar:
```prisma
  probability  Int?      // 0-100, probabilidade de conversão
```

- [ ] **Step 2: Criar e aplicar migration**

```bash
cd backend
npx prisma migrate dev --name add_ami_tags_probability
```

Resultado esperado: `✓ Generated Prisma Client`.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(schema): add AMI number, contact tags, opportunity probability"
```

---

### Task 2: Backend — AMI no User e Agency

**Files:**
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/agency/agency.service.ts`

- [ ] **Step 1: Aceitar amiNumber no update de User**

Em `backend/src/modules/users/users.service.ts`, encontrar a função `update` e adicionar `amiNumber` ao `dto` e ao `data` do `prisma.user.update`:

```typescript
// No tipo do dto:
amiNumber?: string;

// No data do update:
...(dto.amiNumber !== undefined && { amiNumber: dto.amiNumber }),
```

- [ ] **Step 2: Aceitar amiNumber no update de Agency**

Em `backend/src/modules/agency/agency.service.ts`, na função `update`, adicionar `amiNumber` ao `dto` e ao `data` do `prisma.agency.update`:

```typescript
// No tipo do dto:
amiNumber?: string;

// No data do update:
...(dto.amiNumber !== undefined && { amiNumber: dto.amiNumber }),
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/users/ backend/src/modules/agency/
git commit -m "feat(ami): accept amiNumber in user and agency update endpoints"
```

---

### Task 3: Frontend — Campo AMI no perfil do consultor

**Files:**
- Modify: `frontend/src/pages/settings/GeneralSettingsPage.tsx`

- [ ] **Step 1: Adicionar campo AMI ao estado e formulário**

Em `GeneralSettingsPage.tsx`, no estado de `profile`, adicionar:
```tsx
const [profile, setProfile] = useState({
  name: user?.name || '',
  phone: user?.phone || '',
  email: user?.email || '',
  amiNumber: (user as any)?.amiNumber || '',  // adicionar
})
```

No formulário de perfil, após o campo de telefone, adicionar:
```tsx
<div>
  <label style={labelStyle}>Número AMI</label>
  <input
    type="text"
    value={profile.amiNumber}
    onChange={e => setProfile(p => ({ ...p, amiNumber: e.target.value }))}
    placeholder="Ex: AMI12345"
    style={inputStyle}
  />
</div>
```

Na chamada `updateUser`, incluir `amiNumber: profile.amiNumber`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/settings/GeneralSettingsPage.tsx
git commit -m "feat(ami): add AMI number field to consultant profile settings"
```

---

### Task 4: Frontend — Campo AMI nas definições da agência

**Files:**
- Modify: `frontend/src/pages/AgencyPage.tsx`

- [ ] **Step 1: Adicionar campo AMI ao formulário da agência**

Em `AgencyPage.tsx`, no estado da agência (`agencyForm` ou equivalente), adicionar `amiNumber`.

Localizar a interface `Agency` no topo do ficheiro e adicionar:
```tsx
amiNumber?: string;
```

No formulário, após o campo `phone`, adicionar:
```tsx
<div>
  <label style={labelSt}>Número AMI da Agência</label>
  <input
    type="text"
    value={agencyForm.amiNumber || ''}
    onChange={e => setAgencyForm((f: any) => ({ ...f, amiNumber: e.target.value }))}
    placeholder="Ex: AMI12345"
    style={inputSt}
  />
</div>
```

Na chamada `updateAgency`, incluir `amiNumber`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AgencyPage.tsx
git commit -m "feat(ami): add AMI number field to agency settings"
```

---

### Task 5: Backend — Tags nos contactos

**Files:**
- Modify: `backend/src/modules/contacts/contacts.service.ts`

- [ ] **Step 1: Aceitar tags no create e update**

Em `contacts.service.ts`, na função `create`, adicionar `tags` ao dto e ao data:

```typescript
// No tipo dto:
tags?: string[];

// No data do prisma.contact.create:
tags: dto.tags ?? [],
```

Na função `update`, idem:
```typescript
// No tipo dto:
tags?: string[];

// No data do prisma.contact.update:
...(dto.tags !== undefined && { tags: dto.tags }),
```

Na função `list`, adicionar filtro opcional por tag:
```typescript
// No tipo filters:
tag?: string;

// Na construção do where:
if (filters.tag) where.tags = { has: filters.tag };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/contacts/
git commit -m "feat(contacts): support tags array in create, update and list filter"
```

---

### Task 6: Frontend — Tags nos contactos (UI)

**Files:**
- Modify: `frontend/src/components/contacts/ContactForm.tsx`
- Modify: `frontend/src/pages/ContactDetailPage.tsx`

- [ ] **Step 1: Adicionar input de tags ao ContactForm**

Em `ContactForm.tsx`, adicionar estado para tags:

```tsx
const [tagInput, setTagInput] = useState('')
const [tags, setTags] = useState<string[]>(initialData?.tags ?? [])

const addTag = () => {
  const t = tagInput.trim()
  if (t && !tags.includes(t)) setTags(prev => [...prev, t])
  setTagInput('')
}

const removeTag = (tag: string) => setTags(prev => prev.filter(x => x !== tag))
```

No JSX, após o campo de notas:
```tsx
<div>
  <label style={labelStyle}>Tags</label>
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
    {tags.map(t => (
      <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>
        {t}
        <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
      </span>
    ))}
  </div>
  <div style={{ display: 'flex', gap: 6 }}>
    <input
      type="text" value={tagInput}
      onChange={e => setTagInput(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
      placeholder="Adicionar tag…"
      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none' }}
    />
    <button type="button" onClick={addTag} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+</button>
  </div>
</div>
```

No submit do formulário, incluir `tags` nos dados enviados.

- [ ] **Step 2: Mostrar tags na ContactDetailPage**

Em `ContactDetailPage.tsx`, localizar a secção de dados do contacto e adicionar após nome/email:

```tsx
{contact.tags && contact.tags.length > 0 && (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
    {contact.tags.map((t: string) => (
      <span key={t} style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>{t}</span>
    ))}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/contacts/ContactForm.tsx frontend/src/pages/ContactDetailPage.tsx
git commit -m "feat(contacts): add tag input and display in contact form and detail"
```

---

### Task 7: Tipo TENANT nos contactos

**Files:**
- Modify: `frontend/src/utils/constants.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/contacts/ContactForm.tsx`

- [ ] **Step 1: Adicionar TENANT ao tipo e às constantes**

Em `frontend/src/types/index.ts`, localizar:
```typescript
export type ContactType = 'BUYER' | 'OWNER' | 'PARTNER'
```
Alterar para:
```typescript
export type ContactType = 'BUYER' | 'OWNER' | 'PARTNER' | 'TENANT'
```

Em `frontend/src/utils/constants.ts`, no objeto `CONTACT_TYPE_LABELS`, adicionar:
```typescript
TENANT: 'Inquilino',
```

- [ ] **Step 2: Garantir que o select do formulário inclui TENANT**

Em `ContactForm.tsx`, verificar que o select de tipo inclui a opção TENANT. Se usar `CONTACT_TYPE_LABELS`, ficará automaticamente; caso contrário, adicionar manualmente:
```tsx
{ value: 'TENANT', label: 'Inquilino' }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/utils/constants.ts frontend/src/components/contacts/ContactForm.tsx
git commit -m "feat(contacts): add TENANT contact type"
```

---

### Task 8: Probabilidade de conversão nas oportunidades

**Files:**
- Modify: `backend/src/modules/opportunities/opportunities.service.ts`
- Modify: `frontend/src/components/kanban/KanbanBoard.tsx`
- Modify: `frontend/src/components/kanban/KanbanCard.tsx`

- [ ] **Step 1: Aceitar probability no service**

Em `opportunities.service.ts`, na função `create` e `update`, adicionar `probability` ao dto:
```typescript
// No tipo dto:
probability?: number; // 0-100

// No data:
...(dto.probability !== undefined && { probability: dto.probability }),
```

- [ ] **Step 2: Adicionar campo ao formulário de oportunidade**

Em `KanbanBoard.tsx`, no `oppSchema` Zod, adicionar:
```typescript
probability: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
```

No formulário JSX, após o campo `value`, adicionar:
```tsx
<div>
  <label style={labelStyle}>Probabilidade de conversão (%)</label>
  <input
    type="number" min={0} max={100}
    {...register('probability')}
    placeholder="Ex: 70"
    style={inputStyle}
  />
</div>
```

- [ ] **Step 3: Mostrar probabilidade no KanbanCard**

Em `KanbanCard.tsx`, se o card tiver `probability`, mostrar badge:
```tsx
{card.probability != null && (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
    background: card.probability >= 70 ? '#dcfce7' : card.probability >= 40 ? '#fef9c3' : '#fee2e2',
    color: card.probability >= 70 ? '#16a34a' : card.probability >= 40 ? '#854d0e' : '#dc2626',
  }}>
    {card.probability}%
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/opportunities/ frontend/src/components/kanban/
git commit -m "feat(pipeline): add probability of conversion field to opportunities"
```

---
