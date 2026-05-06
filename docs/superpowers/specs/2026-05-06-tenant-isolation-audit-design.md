# Auditoria de Isolamento Multi-Tenant

**Data:** 2026-05-06
**Estado:** Aprovado pelo utilizador
**Spec dependente:** Pressupõe que `2026-05-06-clerk-auth-and-invite-system-design.md` está implementado (helpers `requireAgencyScope`, role `SUPER_ADMIN`).

---

## 1. Contexto e motivação

O CRM é multi-tenant: cada `User` pertence a uma `Agency`. Toda a entidade de negócio (`Contact`, `Property`, `Opportunity`, etc.) deve ser visível apenas a users da mesma agência.

Hoje, o filtro por `agencyId` é aplicado de forma **inconsistente** entre módulos:
- `lib/scope.ts` existe mas o seu uso varia.
- Vários services fazem `findMany()` sem filtro de agência.
- O risco é cross-tenant: user da Agência A consegue ler/modificar registo da Agência B trocando um ID na URL.

Esta spec define a auditoria sistemática e a estratégia de remediação.

---

## 2. Princípios de isolamento

### 2.1 Regra geral
Toda a query Prisma de leitura, criação, actualização ou eliminação a partir de um endpoint autenticado **tem de** ter um filtro que garanta que o registo pertence à agência do user, **excepto** quando o user é `SUPER_ADMIN`.

### 2.2 Como filtrar
Para entidades que têm `agencyId` directo (ex: `Opportunity`, `Automation`, `WhatsAppSession`):
```typescript
where: { agencyId: scope.agencyId, ...resto }
```

Para entidades que não têm `agencyId` directo mas têm `locationId` ou pertencem por relação (ex: `Contact`, `Property`, `Task`, `Conversation`, `Appointment`):
```typescript
where: {
  location: { agencyId: scope.agencyId },
  ...resto
}
```

### 2.3 Resposta a tentativas de acesso cross-tenant
Devolver **404 Not Found** (não 403). Razão: 403 confirma a existência do registo, o que é uma fuga de informação. 404 é o comportamento correcto para "este registo não existe **para ti**".

### 2.4 SUPER_ADMIN bypass
Helper `requireAgencyScope` retorna `agencyId = null` para SUPER_ADMIN, e os services têm de tratar `null` como "sem filtro" (vê tudo). Padrão:

```typescript
const agencyFilter = scope.agencyId
  ? { agencyId: scope.agencyId }
  : {};
```

### 2.5 Excepções legítimas
- `SystemSettings` — global, sem agência.
- `User` listing pelo SUPER_ADMIN — vê todos.
- Endpoints públicos (`/forms/:id/submit`, webhooks Twilio/Meta, `/invitations/verify`) — não autenticados, lógica própria.

Estas excepções devem estar documentadas com comentário no código.

---

## 3. Estratégia: middleware + auditoria por módulo

### 3.1 Middleware `agencyScope`
Aplicado globalmente após `authenticate`:
```typescript
app.use('/api', authenticate, agencyScope, ...)
```

`agencyScope` injecta `req.scope = { agencyId: string | null, userId, role }`. Disponível em todo o controller sem ter de chamar `getCurrentUser` repetidamente.

### 3.2 Auditoria módulo-a-módulo
Para cada módulo abaixo, fazer uma passagem que:
1. Lê todos os controllers e services.
2. Identifica todas as chamadas Prisma (`findMany`, `findUnique`, `findFirst`, `create`, `update`, `delete`, `updateMany`, `deleteMany`, `count`, `aggregate`).
3. Confirma que cada uma tem filtro de agência (directo ou por relação).
4. Adiciona o filtro onde falta.
5. Adiciona um teste E2E que cria 2 agências, 2 users (um por agência), e verifica que user da Agência A não vê dados da Agência B (devolve 404 ou lista vazia).

### 3.3 Módulos a auditar (ordem sugerida pela criticidade)

| Prioridade | Módulo | Ficheiros principais |
|-----------|--------|----------------------|
| 🔴 Alta | contacts | `modules/contacts/` |
| 🔴 Alta | properties | `modules/properties/` |
| 🔴 Alta | opportunities | `modules/opportunities/` |
| 🔴 Alta | conversations + messages | `modules/conversations/` |
| 🔴 Alta | calendar-events + appointments | `modules/calendar/`, `modules/appointments/` |
| 🟡 Média | tasks | `modules/tasks/` |
| 🟡 Média | interactions | `modules/interactions/` |
| 🟡 Média | campaigns + recipients | `modules/campaigns/` |
| 🟡 Média | forms + submissions | `modules/forms/` |
| 🟡 Média | automations + enrollments + runs | `modules/automations/` |
| 🟡 Média | pipelines + stages | `modules/pipelines/` |
| 🟢 Baixa | phone-numbers | `modules/phone-numbers/` |
| 🟢 Baixa | reports | `modules/reports/` |
| 🟢 Baixa | activity | `modules/activity/` |
| 🟢 Baixa | search | `modules/search/` |
| 🟢 Baixa | exports | `modules/exports/` |
| 🟢 Baixa | locations | `modules/locations/` |
| 🟢 Baixa | message-templates | `modules/message-templates/` |
| 🟢 Baixa | settings | `modules/settings/` |
| 🟢 Baixa | appointment-calendars | `modules/appointment-calendars/` |
| 🟢 Baixa | users | `modules/users/` |

### 3.4 Endpoints públicos que não passam por `agencyScope`
Identificar e isolar num router separado (ou flag no middleware) para que o middleware não os bloqueie:
- `POST /api/forms/:id/submit`
- `GET /api/invitations/verify/:token`
- `POST /api/webhooks/*` (Twilio, WhatsApp, Meta)
- `GET /api/calendar/google/callback`, `/api/calendar/outlook/callback`
- `POST /api/auth/clerk-exchange`

---

## 4. Padrão de teste de isolamento

Por cada módulo crítico, adicionar um teste do tipo:

```typescript
describe('contacts isolation', () => {
  it('user from agency A cannot read contact from agency B', async () => {
    const agencyA = await createAgency()
    const agencyB = await createAgency()
    const userA = await createUser({ agencyId: agencyA.id })
    const userB = await createUser({ agencyId: agencyB.id })
    const contactB = await createContact({ assignedToId: userB.id, locationId: ..., agencyId: agencyB.id })

    const res = await api(userA).get(`/contacts/${contactB.id}`)
    expect(res.status).toBe(404)
  })

  it('user from agency A only sees own agency contacts in list', async () => {
    // ...
    const res = await api(userA).get('/contacts')
    expect(res.body.find(c => c.id === contactB.id)).toBeUndefined()
  })
})
```

Helpers de teste em `backend/src/__tests__/helpers/multi-tenant.ts`.

---

## 5. Critérios de aceitação

1. **Middleware `agencyScope` em produção**, aplicado a todas as rotas autenticadas excepto a lista de excepções públicas.
2. **Cada um dos módulos da tabela 3.3** auditado, com filtro adicionado onde faltava.
3. **Cada um dos módulos críticos (🔴)** com pelo menos 2 testes de isolamento (read e write).
4. **Cross-tenant access devolve 404**, nunca 200 com dados de outra agência.
5. **SUPER_ADMIN passa por todos os endpoints** sem restrição de agência (verificado por teste).
6. **Documentação inline** das excepções (endpoints públicos) num único sítio (`backend/src/lib/public-endpoints.ts`).

---

## 6. Risco e mitigação

**Risco principal:** quebrar funcionalidade existente ao adicionar filtros restritivos onde antes a query passava sem filtro (ex: dashboards globais, jobs cron).

**Mitigação:**
- Antes de cada alteração, ler todos os call-sites da função tocada.
- Jobs cron e workers internos usam um "system context" próprio que não passa por `agencyScope`.
- Smoke test manual após cada módulo: login como AGENCY_OWNER, navegar à secção correspondente, confirmar que vê os seus dados normalmente.

---

## 7. Ordem de implementação

1. Implementar middleware `agencyScope` + `req.scope`.
2. Aplicar middleware globalmente, definir lista de excepções públicas.
3. Criar helpers de teste multi-tenant.
4. Auditoria módulo-a-módulo, na ordem de prioridade da tabela 3.3 — um commit (ou PR pequeno) por módulo, com testes incluídos.
5. Smoke test manual completo no fim.
