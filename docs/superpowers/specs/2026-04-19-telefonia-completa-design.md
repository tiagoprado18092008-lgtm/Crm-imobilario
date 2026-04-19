# Telefonia completa no CRM — Fase 1

**Data:** 2026-04-19
**Estado:** Aprovado pelo utilizador
**Escopo:** Fase 1 (funcionalidade mínima viável completa)

## 1. Objetivo

Tornar possível **fazer e receber chamadas diretamente no CRM**, comprar números portugueses sem sair da plataforma, usar números pessoais (MEO/NOS/Vodafone/outros) como caller ID outbound, com setup do Twilio praticamente em um clique.

## 2. Escopo

### Dentro da Fase 1

- Widget flutuante global de chamadas (inbound + outbound) acessível em todas as páginas autenticadas
- **Setup automático do Twilio**: user cola SID + Auth Token → backend cria automaticamente a TwiML App e as API Keys
- Verificação e uso de **número pessoal como caller ID** outbound (Twilio Verified Caller IDs)
- Botões "Ligar" contextuais em contactos e oportunidades → abrem o widget global
- Página `/calls` com histórico: duração, direção, contacto, data, status
- Roteamento inbound: número → utilizador owner + opção de ring-all da agência
- Missed-call SMS automático (já existe, mantém-se) + voicemail básico (sem transcrição)

### Fora da Fase 1

- Gravação configurável + transcrição (fase 2)
- Roteamento avançado por número (horários, fallbacks complexos)
- Analytics avançado de chamadas
- Filas / round-robin
- SIP Trunking / BYOC

## 3. Arquitetura

### 3.1 Backend

**Alterações em módulos existentes:**

- `backend/src/modules/phone-numbers/phone-numbers.service.ts`
  - `autoProvisionTwilio(userId)` — cria TwiML App (voiceUrl=`${PUBLIC_URL}/webhook/twilio/client`) e API Keys; persiste em `SystemSettings` (chaves: `TWILIO_TWIML_APP_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`). Idempotente: se já existirem com o friendlyName `CRM Voice`, reutiliza.
  - `verifyPersonalNumber(userId, phone, channel: 'sms' | 'call')` — chama `client.validationRequests.create({ phoneNumber, friendlyName, callDelay })` e devolve `validationCode` para o frontend mostrar.
  - `confirmPersonalNumber(userId, phone, friendlyName)` — chamado após o user atender e introduzir o código; quando o Twilio valida, cria `PhoneNumber` com `source: 'EXTERNAL_VERIFIED'`, sem `twilioSid`.
  - `listPurchasable` e `purchase` já existem e ficam como estão.

- `backend/src/modules/calls/calls.service.ts`
  - `initiateCall` aceita novo parâmetro opcional `fromNumberId` — se fornecido, procura `PhoneNumber` do user e usa o `number` como `callerId` (tanto para Twilio owned como external verified).
  - `listCalls` expande resposta com `duration`, `status`, `fromNumber`, `toNumber` (lidos de `Interaction.metadata` JSON).

- `backend/src/server.ts`
  - Webhook `/webhook/twilio/inbound-call`:
    - Consulta `PhoneNumber` pelo campo `To` (número chamado) para descobrir owner.
    - Se `ringAll=true`, faz `<Dial>` com múltiplos `<Client>` (todos os users `isActive=true` da agência).
    - Se `voicemailEnabled=true` e ninguém atender em 30s, TwiML faz `<Record>` seguido de `<Hangup/>`.
  - Novo webhook `/webhook/twilio/voicemail-complete` recebe RecordingUrl, cria `Interaction(type=CALL, body='Voicemail: <url>')`.
  - Webhook `/webhook/twilio/client` passa a aceitar parâmetro `From` (o número a mostrar como callerId) validando que pertence ao user autenticado via token JWT.

**Migração Prisma** (`PhoneNumber`):
- `twilioSid String?` — passa a nullable (números externos não têm)
- `source String @default("TWILIO")` — `TWILIO | EXTERNAL_VERIFIED`
- `ringAll Boolean @default(false)`
- `voicemailEnabled Boolean @default(true)`

### 3.2 Frontend

**Componentes novos:**

- `frontend/src/components/CallWidget/CallWidget.tsx` — fab no canto inferior-direito; ao clicar expande mini-dialer com teclado, campo de número, botão "Ligar", acesso rápido ao histórico recente.
- `frontend/src/components/CallWidget/IncomingCallModal.tsx` — modal grande centrado quando chega chamada, com "Atender" / "Recusar" e nome do contacto se reconhecido (match por `number` em `Contact.phone`).
- `frontend/src/components/CallWidget/ActiveCallPanel.tsx` — durante chamada ativa: timer, mute, teclado DTMF, hangup, mostra nome do contacto e botão para abrir o contacto.
- `frontend/src/components/CallWidget/useTwilioDevice.ts` — hook:
  - Inicializa `Device` de `@twilio/voice-sdk` com token de `/api/calls/token`
  - Gere refresh do token (3600s TTL) 5min antes de expirar
  - Subscreve eventos `incoming`, `cancel`, `error`, `ready`
  - Chama destroy on unmount

- `frontend/src/pages/CallsPage.tsx` — tabela de histórico com:
  - Filtros: contacto, direção (inbound/outbound), intervalo de datas, status
  - Colunas: data, direção (ícone), contacto, número, duração, status, ações (ligar de volta, abrir contacto)
  - Paginação servidor-side

**Componentes alterados:**

- `frontend/src/App.tsx` — monta `<CallWidget />` dentro do layout autenticado (nível global).
- `frontend/src/pages/PhoneNumbersPage.tsx`:
  - Adiciona aba "Números externos" com botão "Adicionar número pessoal" que lança fluxo de verificação em 2 passos (envia código → confirma código).
  - Toggle `ringAll` e `voicemailEnabled` por número.
- `frontend/src/pages/settings/PhoneSettingsPage.tsx` (ou equivalente existente) — depois de guardar SID+Token, mostra botão "Setup automático" que chama `POST /api/phone-numbers/auto-provision` e atualiza estado.
- `frontend/src/pages/ContactDetailPage.tsx` e páginas similares — botão "Ligar" passa a chamar `callStore.startCall(number, contactId)` em vez de lógica ad-hoc.

**Store global** (`frontend/src/store/callStore.ts`, Zustand consistente com o resto do projeto):
```ts
interface CallState {
  device: Device | null
  status: 'idle' | 'connecting' | 'active' | 'incoming'
  activeCall: Call | null
  incomingCall: Call | null
  dialerOpen: boolean
  prefillNumber: string | null
  prefillContactId: string | null
  fromNumberId: string | null   // número do CRM a usar como caller ID
  startCall: (to: string, opts?: { contactId?: string; fromNumberId?: string }) => Promise<void>
  acceptIncoming: () => void
  rejectIncoming: () => void
  hangup: () => void
  openDialer: (number?: string) => void
  closeDialer: () => void
}
```

**Dependência nova:** `@twilio/voice-sdk` (~2.10.x) no frontend.

### 3.3 Fluxos de dados

**Outbound:**
1. User clica "Ligar" num contacto ou no widget → `callStore.startCall(number, { contactId, fromNumberId })`
2. Se `device` não existe, hook pede token em `GET /api/calls/token` e inicializa `Device`
3. `device.connect({ params: { To: number, From: fromNumber } })` → Twilio chama `/webhook/twilio/client`
4. TwiML: `<Dial callerId="{from}"><Number>{to}</Number></Dial>`
5. Áudio no browser, `ActiveCallPanel` visível
6. Ao terminar, `/webhook/twilio/status` cria `Interaction(type=CALL, direction=OUTBOUND, metadata: { sid, duration, status })`

**Inbound:**
1. Chamada chega a número Twilio → `/webhook/twilio/inbound-call`
2. Lookup `PhoneNumber` por `To`; descobrir `userId` (e `ringAll`)
3. TwiML: `<Dial timeout=30><Client>{identity}</Client></Dial>` (ou múltiplos clients se ring-all)
4. Device do browser do owner dispara `incoming` → `IncomingCallModal`
5. Aceita → conecta; recusa ou timeout → voicemail + SMS missed-call
6. `/webhook/twilio/status` regista Interaction com direção INBOUND

### 3.4 Setup automático do Twilio (fluxo)

1. User abre Definições → Telefone, cola SID + Auth Token, clica "Guardar"
2. Backend valida credenciais com `client.api.accounts(sid).fetch()`
3. UI mostra botão "Setup automático" (ou dispara automaticamente)
4. `autoProvisionTwilio`:
   - Lista existing applications com `friendlyName='CRM Voice'`; se existir, usa; senão cria nova
   - Lista existing keys pelo friendlyName; se existir, assume OK (não podemos ler secret de key antiga — nesse caso criamos nova com sufixo timestamp)
   - Guarda tudo em `SystemSettings` (tabela chave-valor existente)
5. UI reflete os passos 4 do guia como done; features "Chamadas no browser" e "Receber chamadas" passam a estar ativas

## 4. Modelo de dados

Ver Secção 3.1 para a migração. Interações existentes (`Interaction`) já cobrem o histórico via `type=CALL`. Nova metadata JSON guarda: `{ sid, duration, status, fromNumber, toNumber, recordingUrl? }`.

## 5. Tratamento de erros

- **Token inválido** no frontend: hook captura `device.on('error')`, limpa store, toast pede re-login Twilio.
- **PUBLIC_URL ausente**: `autoProvisionTwilio` falha com 400 "Define PUBLIC_URL nas Definições antes de continuar."
- **Número externo não verificado** tenta outbound: Twilio devolve código 21210. Backend devolve 400 com "Este número ainda não foi verificado. Vai a Números externos e completa a verificação."
- **Device não inicializado** quando `startCall` é invocado: store re-tenta uma vez inicializar; se falhar, toast de erro.
- **Chamada inbound sem `PhoneNumber` correspondente**: TwiML fallback `<Say>Serviço indisponível</Say>`.

## 6. Testes

### 6.1 Unitários (Jest, padrão do projeto)

- `phone-numbers.service.test.ts`:
  - `autoProvisionTwilio` é idempotente (chamar 2x não cria apps duplicadas)
  - `verifyPersonalNumber` rejeita números inválidos (E.164)
  - `confirmPersonalNumber` só cria `PhoneNumber` quando Twilio confirma
- `calls.service.test.ts`:
  - `initiateCall` usa `fromNumber` correto quando `fromNumberId` é fornecido
  - `listCalls` pagina e filtra por contacto

### 6.2 Checklist E2E manual

1. Colar SID+Token inválido → mensagem de erro clara
2. Colar SID+Token válido → Setup automático cria TwiML App e API Keys
3. Comprar número PT → aparece na lista com `source=TWILIO`
4. Verificar número pessoal português → recebe chamada/SMS com código, confirma, aparece na aba "Externos"
5. Ligar de contacto escolhendo número CRM → áudio bidirecional, Interaction criada
6. Ligar de contacto escolhendo número externo como callerId → áudio OK, chamada aparece no telemóvel do recetor com número pessoal
7. Receber chamada num número Twilio → popup aparece, aceita, áudio OK
8. Não atender → SMS missed-call enviado, voicemail gravado e anexado ao Interaction
9. Ativar `ringAll` num número → chamada recebida toca em múltiplos browsers simultaneamente
10. Página `/calls` mostra todas as chamadas acima com filtros funcionais

## 7. Critérios de sucesso

- User consegue fazer setup completo do Twilio em < 3 minutos sem abrir o painel do Twilio (exceto para copiar SID+Token iniciais).
- Fazer uma chamada outbound do widget demora ≤ 3 cliques.
- Chamada inbound aparece no browser com popup dentro de 1-2 segundos após tocar.
- Número pessoal verificado pode ser usado como caller ID outbound sem erros.
- Zero regressões nas features existentes: compra de números, SMS, WhatsApp.
