---
name: WhatsApp por Consultor + Definições Unificadas
description: Sessões WhatsApp individuais por consultor, sessão partilhada por agência, e reorganização da sidebar para colocar Integrações dentro de Definições
type: project
---

# WhatsApp por Consultor + Definições Unificadas

## Contexto

Atualmente o CRM tem uma única sessão WhatsApp (Baileys) por agência, armazenada no modelo `WhatsAppSession` com `agencyId @unique`. O objetivo é permitir que cada consultor tenha a sua própria sessão WhatsApp pessoal, mantendo a opção de uma sessão partilhada da agência gerida pelo admin. Em paralelo, o separador "Integrações" da sidebar passa para dentro de "Definições".

---

## 1. Schema — Base de Dados

### `WhatsAppSession` — alterações

```prisma
model WhatsAppSession {
  id        String   @id @default(cuid())
  agencyId  String
  agency    Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  userId    String?  // null = sessão partilhada da agência
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  creds     String   @db.Text
  keys      String?  @db.Text
  status    String   @default("DISCONNECTED")
  phone     String?
  updatedAt DateTime @updatedAt

  @@unique([agencyId, userId])
}
```

- A relação na `Agency` muda de `whatsappSession WhatsAppSession?` para `whatsappSessions WhatsAppSession[]`
- O modelo `User` ganha `whatsappSession WhatsAppSession?`

### Chave de sessão interna (`sessionKey`)

- Sessão partilhada da agência: `"<agencyId>"` (sem alteração à lógica existente)
- Sessão pessoal do consultor: `"<agencyId>:<userId>"`

Esta chave é usada como identificador no `Map<string, SessionState>` em memória, nos ficheiros de keys em `/tmp`, e nos eventos do `eventBus`.

---

## 2. Backend — Serviço WhatsApp

### `whatsapp.service.ts`

Todas as funções públicas passam a aceitar `{ agencyId, userId? }` em vez de só `agencyId`. O `sessionKey` é derivado internamente:

```ts
function toKey(agencyId: string, userId?: string | null) {
  return userId ? `${agencyId}:${userId}` : agencyId
}
```

Funções afetadas: `getStatus`, `initWhatsApp`, `sendViaBaileys`, `disconnectWhatsApp`.

### `whatsapp.session.ts`

`usePrismaAuthState` passa a receber `sessionKey` (string opaca) em vez de `agencyId`. O lookup na BD usa `{ agencyId, userId }` derivados do sessionKey. O ficheiro de keys em `/tmp` usa `sessionKey` como nome.

### `restoreAllSessions`

Ao arrancar, restaura todas as sessões com `status: 'CONNECTED'` — tanto as da agência (`userId: null`) como as pessoais (`userId: string`).

---

## 3. Backend — Routing de Mensagens Recebidas

### `handleIncoming` — lógica de atribuição

**Sessão pessoal** (`userId` preenchido):
- A conversa é sempre atribuída ao consultor dono da sessão (`assignedToId = userId`).

**Sessão partilhada** (`userId` null):
- Procura o contacto pelo número de telefone dentro da agência.
- Se encontrado e tem `assignedToId` → atribui ao consultor responsável.
- Se não encontrado → round-robin: consultor ativo da agência com menos conversas abertas de WhatsApp.

A função `receiveInbound` em `conversations.service.ts` já recebe `agencyId`; passa a aceitar também `assignedToId?: string` opcional para forçar a atribuição.

---

## 4. Backend — Router/Controller WhatsApp

O router WhatsApp passa a ter dois contextos de endpoint:

### Sessão pessoal (qualquer utilizador autenticado)
- `GET  /whatsapp/me/status`
- `POST /whatsapp/me/connect`
- `POST /whatsapp/me/disconnect`

### Sessão da agência (apenas admin/gestor)
- `GET  /whatsapp/agency/status`
- `POST /whatsapp/agency/connect`
- `POST /whatsapp/agency/disconnect`

Os endpoints existentes (`/whatsapp/status`, `/whatsapp/connect`, `/whatsapp/disconnect`) são mantidos temporariamente como aliases dos endpoints de agência para não quebrar o frontend até à migração completa.

---

## 5. Frontend — Reorganização da Navegação

### Sidebar

- Remover o item "Números" (`/phone-numbers`) do grupo principal da sidebar.
- O grupo "Sistema" na sidebar passa a ter apenas: `{ to: '/settings', label: 'Definições' }`.
- A rota `/phone-numbers` é redirecionada para `/settings?tab=phone` ou eliminada (ver secção 6).

### Rotas

```
/settings                → SettingsPage (tab: integrações por defeito)
/settings/integrations   → alias ou redirect para /settings?tab=integrations
/settings/team           → TeamPage (já existe)
/settings/general        → GeneralSettingsPage (já existe)
```

---

## 6. Frontend — Página de Definições (`SettingsPage`)

A `SettingsPage` existente já tem tabs (whatsapp, email, general, phone, guide). Passa a incluir duas novas subsecções na tab WhatsApp:

### Tab "WhatsApp" — nova estrutura

**Secção: O meu WhatsApp**
- Card com estado da sessão pessoal: Desligado / A ligar / Ligado (+ número)
- Botão "Ligar" → abre modal com QR code (mesmo componente existente, passa `scope: 'me'`)
- Botão "Desligar" quando conectado

**Secção: WhatsApp da Agência** (visível apenas a `role: ADMIN | MANAGER`)
- Card com estado da sessão partilhada da agência
- Botão "Ligar" → modal QR code com `scope: 'agency'`
- Botão "Desligar" quando conectado
- Nota: "As mensagens são atribuídas ao consultor responsável pelo contacto. Se o contacto não tiver consultor, é distribuído automaticamente."

### Modal QR Code

O componente de QR code existente recebe um `scope: 'me' | 'agency'` e chama o endpoint correto (`/whatsapp/me/connect` ou `/whatsapp/agency/connect`).

---

## 7. Migração

A sessão existente na BD (com `userId: null`) corresponde à sessão partilhada da agência — não requer migração de dados. A migration Prisma adiciona a coluna `userId` nullable e altera a unique constraint.

---

## Fora de Scope

- Múltiplas sessões partilhadas por agência (uma sessão partilhada por agência é suficiente)
- Gestão de keys WhatsApp em base de dados (mantém ficheiro `/tmp`)
- Alterações ao módulo de telefone/Twilio
