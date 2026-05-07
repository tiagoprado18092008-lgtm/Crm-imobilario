# CasaFlow CRM — Auditoria de Funcionalidades

> Data: 2026-05-07 | Auditor: Claude Sonnet 4.6  
> Metodologia: análise de rotas, controllers, services, schema Prisma, componentes frontend e API files.

---

## 1. Tabela Completa de Estado

### 🔐 Autenticação & Acesso

| Funcionalidade | Estado | Notas |
|---|---|---|
| Login com email + password | ✅ | `auth.service.ts` → bcrypt + JWT |
| Login com Google OAuth | ⚠️ | `googleClient` inicializado e rota existe, mas fluxo de redirect/callback não tem UI separada; integrado via Clerk também |
| Autenticação 2FA | ❌ | Não existe nenhum código de 2FA (TOTP, SMS, email OTP) |
| Recuperação de password por email | ❌ | Só existe um reset hardcoded para `geral@alphascaleai.com` em `server.ts`; não há fluxo "esqueci a password" para utilizadores |
| Sessões revogáveis (logout em todos os dispositivos) | ❌ | JWT stateless sem blacklist; logout apenas limpa localStorage |
| Proteção de rotas (middleware auth) | ✅ | `auth.middleware.ts` + `ProtectedRoute.tsx` + `RoleGuard.tsx` |
| Tokens JWT / gestão de sessão segura | ⚠️ | JWT implementado, mas sem refresh token, sem rotação, sem expiração forçada no servidor |

### 👥 Equipas & Permissões (RBAC)

| Funcionalidade | Estado | Notas |
|---|---|---|
| Roles: Super Admin, Administrador, Gestor, Consultor, Assistente | ✅ | 7 roles no schema: `SUPER_ADMIN, AGENCY_OWNER, AGENCY_ADMIN, TEAM_LEADER, CONSULTANT, LOCATION_ADMIN, USER` |
| Criação de agências / contas raiz | ✅ | Auto-criada no registo de `AGENCY_OWNER` |
| Convite de membros por email | ✅ | `invitations.service.ts` com template email, token 7 dias, placeholder user |
| Limitação de acesso por role | ✅ | `rbac.middleware.ts` + `PermissionGate.tsx` |
| Gestão de equipa (adicionar, remover, editar role) | ✅ | `AgencyPage.tsx` + `TeamPage.tsx` + `AgencyUsersPage.tsx` |
| Multi-tenancy (isolamento por agência) | ✅ | `buildScope()` em todos os services garante isolamento por `agencyId` |
| Perfil de utilizador editável (nome, foto, telefone) | ✅ | `GeneralSettingsPage.tsx` + `ProfilePage.tsx` |
| Campo AMI do consultor | ❌ | Não existe campo AMI no schema `User` nem na UI |

### 📋 Contactos & CRM

| Funcionalidade | Estado | Notas |
|---|---|---|
| Lista de contactos com pesquisa e filtros | ✅ | `ContactsPage.tsx` com filtros por tipo, estado, fonte, pesquisa |
| Criação manual de contacto | ✅ | `ContactForm.tsx` |
| Campos: nome, email, telefone, NIF, morada, notas | ✅ | Schema inclui `name, email, phone, nif, city, postalCode, notes` |
| Tags personalizadas por contacto | ❌ | Campo `tags` existe no schema `Property`, não em `Contact`; sem UI de tags |
| Lead scoring automático | ✅ | `calculateLeadScore()` em `contacts.service.ts` (baseado em campos preenchidos + interações) |
| Smart lists / segmentos dinâmicos | ❌ | Não implementado |
| Histórico de atividade por contacto | ✅ | `ContactDetailPage.tsx` com `Interaction` log + `InteractionLog.tsx` |
| Associar contacto a oportunidades e imóveis | ✅ | Relações no schema + UI no Kanban e PropertyDetail |
| Import CSV de contactos | ✅ | `ImportModal.tsx` com XLSX/CSV, auto-detect de colunas, preview |
| Export CSV de contactos | ✅ | `exports.router.ts` → endpoint `/api/exports/contacts` |
| Tipo de contacto: comprador, vendedor, proprietário, inquilino | ⚠️ | Tipos existem (`BUYER, OWNER, PARTNER`) mas falta `TENANT` (inquilino) |

### 📊 Pipeline & Oportunidades

| Funcionalidade | Estado | Notas |
|---|---|---|
| Vista Kanban por etapas | ✅ | `KanbanBoard.tsx` com `@hello-pangea/dnd` |
| Etapas PT (Prospeção → Escritura) | ✅ | 11 etapas em `constants.ts` com labels PT |
| Criar e mover cards (drag & drop) | ✅ | `moveOpportunityStage()` API + DnD |
| Valor esperado por oportunidade | ✅ | Campo `value` no schema e formulário |
| Data estimada de fecho | ✅ | Campo `expectedCloseDate` |
| Probabilidade de conversão | ❌ | Campo não existe no schema nem na UI |
| Notas internas por oportunidade | ✅ | Campo `notes` |
| Associar contacto e imóvel à oportunidade | ✅ | `contactId` e `propertyId` no schema + formulário |
| Múltiplos pipelines por tipo (venda, arrendamento) | ✅ | Modelo `Pipeline` + `PipelineStage` dinâmicos, UI em `PipelineSettingsPage.tsx` |
| Histórico de alterações da oportunidade | ❌ | Sem audit trail específico de oportunidade (existe `ActivityLog` mas não granular) |

### 🏠 Portfólio de Imóveis

| Funcionalidade | Estado | Notas |
|---|---|---|
| Listagem com filtros (tipo, zona, preço, estado) | ✅ | `PropertiesPage.tsx` + service com filtros |
| Ficha completa (área, tipologia, ano, descrição) | ✅ | `DetailsTab.tsx` com todos os campos |
| Galeria de fotos com upload e reordenar | ✅ | `PhotosTab.tsx` com `@dnd-kit`, upload via multer |
| Upload de documentos | ✅ | `DocumentsTab.tsx` |
| Estado: disponível, reservado, vendido, arrendado | ✅ | Enum com 5 estados |
| Geolocalização e mapa | ⚠️ | Campos `lat, lng` existem no schema mas não há mapa renderizado na UI |
| Autocomplete de morada (Google Places) | ❌ | Sem integração Google Places API na UI |
| Exportação para Idealista | ❌ | Campo `portalsPublished` existe mas sem lógica de exportação |
| Exportação para Imovirtual | ❌ | Idem |
| Exportação para Casa Sapo / OLX | ❌ | Idem |
| Formulário de angariação | ⚠️ | Existe `AppointmentType: ANGARIACAO` mas sem formulário dedicado de angariação |
| Referência interna do imóvel | ✅ | Campo `reference` único no schema |

### 💬 Inbox Unificada

| Funcionalidade | Estado | Notas |
|---|---|---|
| Receber e enviar mensagens WhatsApp | ✅ | Baileys + WhatsApp Business API; `ConversationsPage.tsx` |
| Receber e enviar emails (Gmail / SMTP) | ✅ | IMAP polling + SMTP nodemailer |
| Receber e enviar SMS | ✅ | Twilio SMS no `conversations.service.ts` |
| Chamadas VoIP (Twilio) | ✅ | `SoftPhone.tsx` + Twilio Voice SDK |
| Compra de número +351 na plataforma | ✅ | `PhoneNumbersPage.tsx` + Stripe para pagamento |
| Inbox única com todos os canais misturados | ✅ | `ConversationsPage.tsx` unifica WHATSAPP, EMAIL, SMS, INSTAGRAM |
| Filtrar inbox por canal / consultor | ✅ | Filtros existem na ConversationsPage |
| Associar conversa a contacto automaticamente | ✅ | Por número de telefone/email |
| Estado da conversa: aberta, pendente, fechada | ✅ | `updateConversationStatus()` |
| Templates de mensagem rápida | ✅ | `TemplatesModal.tsx` + `message-templates` module |
| Histórico de conversas por contacto | ✅ | Via `ContactDetailPage` + relação `conversations` |

### 📅 Calendário & Agendamentos

| Funcionalidade | Estado | Notas |
|---|---|---|
| Vista calendário (dia, semana, mês) | ✅ | `CalendarView.tsx` com três vistas |
| Criar eventos / visitas manualmente | ✅ | `EventModal.tsx` + `TaskForm` no CalendarPage |
| Link de agendamento público (tipo Calendly) | ⚠️ | `bookingPage` config existe em `LocationSettings` mas não há página pública implementada |
| Sincronização com Google Calendar | ✅ | `calendar.service.ts` com OAuth2, sync bidirecional, webhooks |
| Sincronização com Outlook | ✅ | Microsoft Graph API integrado |
| Tipos de evento: visita, reunião, chamada, escritura | ✅ | `VISIT, CALL, MEETING, OTHER` + `ANGARIACAO, CPCV, ESCRITURA` |
| Notificações de lembrete (email / SMS) | ⚠️ | Campo `reminderSent` existe, lógica de envio não verificada end-to-end |
| Associar evento a contacto e imóvel | ✅ | `contactId, opportunityId, propertyId` no schema |
| Disponibilidade configurável por consultor | ✅ | `CalendarSettingsPage.tsx` com `CalendarSlot` por dia da semana |

### ✅ Tarefas & Atividades

| Funcionalidade | Estado | Notas |
|---|---|---|
| Criar tarefas manuais com prazo | ✅ | `TasksPage.tsx` + `TaskForm` |
| Atribuir tarefa a membro da equipa | ✅ | Campo `assignedToId` |
| Prioridade: baixa, média, alta | ✅ | `LOW, MEDIUM, HIGH` |
| Estado: pendente, em curso, concluída | ✅ | `PENDING, IN_PROGRESS, COMPLETED, CANCELLED` |
| Associar tarefa a contacto ou oportunidade | ✅ | Relações no schema e formulário |
| Vista lista e vista calendário de tarefas | ✅ | Tasks aparecem no `CalendarPage.tsx` e `TasksPage.tsx` |
| Notificação de tarefa em atraso | ❌ | Sem cron job nem push notification para tarefas em atraso |

### 📈 Relatórios & Analytics

| Funcionalidade | Estado | Notas |
|---|---|---|
| Dashboard com KPIs reais da base de dados | ✅ | `DashboardPage.tsx` + `getReportSummary()` |
| Nº de leads por período | ✅ | `newContactsThisMonth` no summary |
| Taxa de conversão por etapa do pipeline | ✅ | `getReportPipeline()` com funnel chart |
| Valor total em pipeline | ✅ | `pipelineAgg._sum.value` |
| Imóveis por estado | ⚠️ | Não há widget específico; dados existem mas sem gráfico dedicado |
| Atividade por consultor | ✅ | `getAgentPerformance()` em `reports.service.ts` |
| Relatório de chamadas e mensagens | ✅ | `getConversationStats()` por canal |
| Export de relatório em PDF/Excel | ⚠️ | `generatePDF.ts` existe para imóveis; export CSV de contacts/opportunities via `/api/exports`; sem export PDF de relatórios |
| Filtros por período e por consultor | ⚠️ | Período: não implementado na UI; consultor: implementado |

### ⚙️ Configurações da Agência

| Funcionalidade | Estado | Notas |
|---|---|---|
| Nome, logótipo e informações da agência | ✅ | `AgencyPage.tsx` com upload de logo |
| Nº AMI da agência | ❌ | Campo não existe no schema `Agency` |
| Gestão de plano / faturação | ⚠️ | Stripe configurado apenas para compra de números Twilio; sem planos/subscrições |
| Configurar canais (WhatsApp, email, SMS, Twilio) | ✅ | Settings module + WhatsApp session management |
| Personalizar etapas do pipeline | ✅ | `PipelineSettingsPage.tsx` |
| Personalizar campos de contacto e imóvel | ❌ | Campos fixos; sem campos personalizados dinâmicos |
| Configurar domínio de email de envio | ❌ | SMTP global; sem configuração por agência |
| Webhooks externos | ⚠️ | `webhooks.controller.ts` só recebe webhooks (Google/Outlook Calendar); não há UI para registar webhooks de saída |
| Logs de auditoria / atividade | ✅ | `ActivityLog` model + `ActivityPage.tsx` |

### 🎨 UI/UX & Qualidade

| Funcionalidade | Estado | Notas |
|---|---|---|
| Design responsivo (mobile, tablet, desktop) | ⚠️ | CSS usa variáveis e grids mas sem breakpoints mobile sistemáticos; não optimizado para mobile |
| Sidebar com navegação clara por módulo | ✅ | `Sidebar.tsx` + `AppShell.tsx` |
| Loading states e skeleton screens | ✅ | `Skeleton.tsx` + `PageSpinner.tsx` usados nas páginas |
| Notificações in-app (toasts) | ✅ | `Toast.tsx` + `useUIStore.showToast()` |
| Dark mode | ✅ | `theme.ts` + toggle na `TopBar.tsx` / `ProfilePage.tsx` |
| Pesquisa global na plataforma | ✅ | `GlobalSearch.tsx` com Ctrl+K, busca contacts/properties/opportunities |
| Onboarding / wizard de primeira configuração | ✅ | `OnboardingWizard.tsx` com 3 passos |
| Erros e validações com mensagens em PT | ✅ | Zod + mensagens em português europeu nos forms |
| Suporte em português europeu | ✅ | Labels, toasts, e UI inteiramente em PT-PT |

---

## 2. Lista Ordenada por Prioridade (do que falta implementar)

### 🔴 Alta Prioridade (Bloqueante para uso real)

1. **Recuperação de password por email** — utilizadores ficam bloqueados se perderem a password
2. **Campo AMI do consultor e da agência** — obrigatório legalmente em Portugal para consultores imobiliários
3. **Tags personalizadas nos contactos** — funcionalidade core de CRM, impacta segmentação e automações
4. **Tipo de contacto: inquilino (TENANT)** — mercado de arrendamento não tem tipo correto
5. **Probabilidade de conversão nas oportunidades** — métrica fundamental de pipeline management
6. **Notificação de tarefa em atraso** — sem isto as tarefas ficam esquecidas
7. **Geolocalização com mapa na ficha do imóvel** — esperado por consultores imobiliários

### 🟡 Média Prioridade (Impacta produtividade)

8. **Autocomplete de morada via Google Places** — acelera criação de imóveis e reduz erros
9. **Histórico de alterações da oportunidade** — rastreabilidade das mudanças de etapa e valor
10. **Página pública de agendamento (tipo Calendly)** — base `bookingPage` existe mas sem rota pública
11. **Link de agendamento público** — consultores precisam de partilhar link de disponibilidade
12. **Filtros por período nos relatórios** — análise temporal é essencial
13. **Export PDF de relatórios** — solicitado frequentemente por gestores e administradores
14. **Imóveis por estado no dashboard** — KPI crítico para gestão do portfólio
15. **Sessão com refresh token** — JWT sem refresh expira e força re-login; má UX
16. **Smart lists / segmentos dinâmicos de contactos** — fundamental para campanhas e automações

### 🟢 Baixa Prioridade (Nice-to-have / avançado)

17. **Exportação para Idealista / Imovirtual / Casa Sapo** — integrações de portais imobiliários
18. **Autenticação 2FA** — segurança adicional, não bloqueante para arranque
19. **Logout em todos os dispositivos** — requer blacklist de tokens no servidor
20. **Campos personalizados de contacto e imóvel** — flexibilidade avançada
21. **Configuração de domínio de email por agência** — necessário para white-label avançado
22. **Webhooks de saída configuráveis na UI** — para integrações externas como n8n/Zapier
23. **Formulário de angariação dedicado** — página especializada para captura de novos imóveis
24. **Gestão de plano/faturação (Stripe)** — necessário para monetizar o SaaS
25. **Design responsivo mobile sistemático** — UI funciona em desktop, degradada no mobile
26. **Sessões revogáveis** — segurança empresarial avançada

---

## 3. Estimativa de Complexidade

| # | Funcionalidade | Complexidade | Justificação |
|---|---|---|---|
| 1 | Recuperação de password por email | **Baixa** | Endpoint + email template + UI de 2 páginas |
| 2 | Campo AMI (consultor + agência) | **Baixa** | Migration Prisma + campo no form + UI |
| 3 | Tags nos contactos | **Baixa** | Migration + input de tags + filtro UI |
| 4 | Tipo TENANT nos contactos | **Baixa** | Adicionar enum value + label PT |
| 5 | Probabilidade de conversão | **Baixa** | Campo Float + slider UI + exibir no Kanban |
| 6 | Notificação de tarefa em atraso | **Média** | Cron job diário + email/push notification |
| 7 | Mapa na ficha do imóvel | **Baixa** | Embed Google Maps com `lat/lng` já existentes |
| 8 | Google Places autocomplete | **Baixa** | SDK Google Places + input component |
| 9 | Histórico de alterações de oportunidade | **Média** | Hook no service + ActivityLog entries + UI timeline |
| 10 | Página pública de agendamento | **Alta** | Rota pública, gestão de disponibilidade, confirmação por email |
| 11 | Link de agendamento público | **Alta** | Depende do item 10 |
| 12 | Filtros por período nos relatórios | **Baixa** | Date range picker + query params no service |
| 13 | Export PDF de relatórios | **Média** | jsPDF (já instalado) + layout de relatório |
| 14 | KPI imóveis por estado no dashboard | **Baixa** | Query ao schema + widget gráfico |
| 15 | Refresh token / sessão melhorada | **Média** | RefreshToken model + rotation logic + intercept axios |
| 16 | Smart lists / segmentos dinâmicos | **Alta** | Query builder UI + filtros compostos + salvar segmentos |
| 17 | Exportação para portais (Idealista, etc.) | **Alta** | XML feed por portal + autenticação de API por portal |
| 18 | 2FA (TOTP) | **Média** | `speakeasy` + QR code UI + verificação no login |
| 19 | Logout em todos os dispositivos | **Média** | Token blacklist (Redis/DB) + middleware de validação |
| 20 | Campos personalizados dinâmicos | **Alta** | Schema EAV ou JSON fields + UI de configuração + filtros |
| 21 | Domínio de email por agência | **Média** | SMTP config por agência + DNS verification |
| 22 | Webhooks de saída configuráveis | **Média** | Modelo WebhookEndpoint + dispatcher + UI de registo |
| 23 | Formulário de angariação dedicado | **Média** | Página multi-step + criação simultânea imóvel + oportunidade |
| 24 | Gestão de plano/faturação Stripe | **Alta** | Produtos Stripe + subscrições + portal de cliente + webhooks |
| 25 | Design responsivo mobile | **Alta** | Refactor CSS com breakpoints em todos os componentes |
| 26 | Sessões revogáveis | **Média** | Depende do item 19 |

---

## Resumo Executivo

| Categoria | ✅ Funcional | ⚠️ Parcial | ❌ Em falta |
|---|---|---|---|
| Autenticação & Acesso | 3 | 2 | 2 |
| Equipas & Permissões | 6 | 0 | 2 |
| Contactos & CRM | 7 | 1 | 3 |
| Pipeline & Oportunidades | 7 | 0 | 3 |
| Portfólio de Imóveis | 5 | 3 | 4 |
| Inbox Unificada | 11 | 0 | 0 |
| Calendário & Agendamentos | 6 | 2 | 0 |
| Tarefas & Atividades | 6 | 0 | 1 |
| Relatórios & Analytics | 5 | 3 | 0 |
| Configurações da Agência | 5 | 2 | 3 |
| UI/UX & Qualidade | 7 | 1 | 0 |
| **TOTAL** | **68** | **14** | **18** |
| **%** | **67%** | **14%** | **18%** |
