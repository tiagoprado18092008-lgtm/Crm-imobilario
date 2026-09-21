# PLANO — CasaFlow → AlphaCRM

> Data: 2026-09-21 · Fase 0 · Autor: Claude Opus 5
> Base: [`docs/AUDITORIA.md`](AUDITORIA.md). Prompt mestre nas secções 1–15 (as §5 e §11 foram substituídas pela §5 da auditoria).
> **Estado: Fases 0 a 3 concluídas. Fase 4 em curso — falta o que depende da conta Zadarma.**

---

## 0. Decisões que moldam este plano

| # | Decisão (Tiago, 21/09/2026) | Efeito |
|---|---|---|
| **D1** | **Opção A** — manter Vite + React Router SPA; não migrar para Next.js | Elimina uma reescrita completa do frontend antes de entregar valor. §5 e §11 do prompt reescritas na auditoria |
| **D2** | **Todos os dados de CRM são descartáveis**; existe o **CSV original** da lista de clínicas | Remove o maior risco do projeto (R5). Ver §1 abaixo |
| **D3** | **Fase 1.5 (`workspaceId`) antes das Fundações** | Índices compostos e keyset pagination passam a ser possíveis na Fase 2 |
| **D4** | **Contactos e oportunidades saem do âmbito.** Não se migram, não se reimportam, não se comparam | A Fase 1 deixa de ter trabalho de dados. O importador CSV move-se para a **Fase 3**, quando o modelo `Lead` existir |

### 0.1 O que a D2 elimina do prompt original

A regra #3 do prompt ("nunca apagues dados") existia para proteger 3.442 oportunidades e 1.677 contactos. Sendo descartáveis e reimportáveis do CSV, desaparece trabalho pesado:

| Trabalho previsto no prompt | Estado | Porquê |
|---|---|---|
| Dedupe com pré-visualização, merge e rollback (§8.2, R5) | ❌ **Cancelado** | Não se deduplica o que se vai truncar. O dedupe passa a ser **na entrada** do importador |
| Script idempotente de correção de mojibake + relatório (Fase 1) | ❌ **Cancelado** | Corrige-se a **deteção de codificação do importador**, uma vez — agora na Fase 3 (D4) |
| Migração nullable → backfill → `NOT NULL` do `workspaceId` (R16) | ❌ **Cancelado** | Tabelas vazias aceitam `NOT NULL` diretamente |
| Limpeza de fases de pipeline duplicadas (problema #5) | ❌ **Cancelado** | Fases novas criadas por seed, já como enum |
| `@@map("_deprecated_")` antes de remover Property/Location (R17) | ❌ **Cancelado** | `DROP` direto |

**Ganho estimado: Fases 1 + 1.5 passam de ~3–4 semanas para ~1 semana** — e, com a D4, para **~5 dias** (2–3 dias de limpeza + 2 de `workspaceId`).

**A regra #3 mantém-se para tudo o resto** — utilizadores, agência, integrações e, a partir da Fase 1, todos os dados novos. A licença de destruição aplica-se **uma vez só**, na Fase 1.

---

## 1. Estratégia de dados (Fase 1)

Ordem obrigatória:

1. **`pg_dump` completo, guardado fora do Railway** (ex.: OneDrive). Nunca restaurado — é rede de segurança, não plano.
2. **Preservar:** `User`, `Agency`, `AgencySettings`, `SystemSettings`, `PhoneNumber`, `WhatsAppSession`, `CalendarIntegration`, `Invitation`, tokens de auth. O Tiago não reconfigura integrações.
3. **Truncar:** `Contact`, `Opportunity`, `Interaction`, `Task`, `Conversation`, `Message`, `Appointment`, `CalendarEvent`, `CalendarSlot`, `Form*`, `EmailCampaign*`, `Automation*`, `ActivityLog`.
4. **Remover (schema + código):** `Property`, `PropertyPhoto`, `PropertyDocument`, `PropertyVisit`, `Location`, `LocationSettings`.
5. **Schema novo** com `workspaceId NOT NULL` em todos os modelos (Fase 1.5).

Por **D4**, a Fase 1 termina aqui. Não há reimportação: a base de dados fica vazia de CRM e assim permanece até à Fase 3. O CRM continua utilizável para configuração, equipa e integrações, mas **não há trabalho comercial no sistema entre a Fase 1 e a Fase 3** — é o custo aceite desta decisão, e a razão para a Fase 2 ser curta.

### 1.1 Importador CSV — **Fase 3**, não Fase 1

Construído quando o modelo `Lead` existir, e é aí que toda a higiene de dados passa a viver. Requisitos:

- **Deteção de codificação** (`chardet`/`jschardet`): resolve o mojibake na origem. Teste obrigatório com ficheiro latin1 duplamente codificado, a verificar que "GonÃ§alves" entra como "Gonçalves".
- **Normalização E.164** com `libphonenumber-js`, região `PT` por defeito. Linhas sem telefone válido vão para relatório de rejeitados, não para a base de dados.
- **Dedupe na entrada**, por esta ordem: telefone E.164 → email → domínio → NIF.
- **Mapeamento de colunas** com pré-visualização antes de gravar.
- **Destino: `Lead`**, não `Opportunity`. É isto que resolve o problema #1 de raiz — a lista de cold call nunca chega a entrar no pipeline.

**Critério de aceitação (Fase 3):** a importação produz 0 registos com `Ã`, 100% dos telefones em E.164, 0 duplicados por telefone, e todos os registos como `Lead` (0 negócios no pipeline).

---

## 2. Fases

Cada fase: branch próprio, PR com checklist, `tsc --noEmit` limpo, `eslint` limpo, build a passar, screenshot/gif. Uma fase não avança sem os critérios cumpridos.

| Fase | Objetivo | Critérios de aceitação | Est. |
|---|---|---|---|
| **0 — Baseline** ✅ | `AUDITORIA.md`, `PLANO.md`, `pg_dump`, Sentry (front+back), Vitest + Playwright instalados, feature flags, staging | Auditoria aprovada; staging a correr; Sentry a receber eventos | **em curso** |
| **1 — Limpeza e reset** ✅ | Remover Property e Location; consolidar os 3 ecrãs de equipa; renomear CasaFlow→AlphaCRM; remover terminologia imobiliária; corrigir `buildScope` (R21) | ✅ 0 referências a `Property`/`Location`; ✅ 3 grupos de navegação; ✅ backend `tsc` limpo; ✅ build do frontend passa (erros 61→56, todos herdados) | **concluída** |
| **1.5 — `workspaceId`** ✅ | Desnormalizar `agencyId` em 17 modelos; `lib/workspace.ts`; índices compostos + pg_trgm; **teste anti-fuga** (leituras, escritas e allowlist obsoleta) | ✅ 3 testes a passar; ✅ 0 leituras não scoped; ✅ 4 fugas reais corrigidas; ✅ teste validado com fuga injetada | **concluída** |
| **2 — Fundações** ✅ | Design system (tokens OKLCH, navy/cyan, Plus Jakarta + Inter); `DataTable` virtualizada; `Board` (migrar `@hello-pangea/dnd` → dnd-kit); `RecordPanel`; `CommandPalette`; atalhos; keyset pagination; índices compostos; pg_trgm; SSE; `next-intl`-equivalente + `pt-PT.json`; unificar Zod | ✅ `Cmd+K`; ✅ contraste AA 15/15 por script; ✅ bundle 3.1MB→824KB; ✅ keyset + índices + pg_trgm; ✅ DataTable ligada aos Contactos; ✅ SSE isolado por workspace; ✅ glossário pt-PT com verificação | **concluída** |
| **3 — Núcleo de vendas** ✅ | `Lead`/`Company`/`Person`/`Deal`; Caixa de Leads + conversão; 2 pipelines com campos obrigatórios e rotting; `Activity`; **`/hoje`**; Vistas Guardadas + ações em massa; **importador CSV** (§1.1) | ✅ `Lead`/`Company`/`SavedView` + migração; ✅ conversão transacional; ✅ dispositions com backoff; ✅ importador com pré-visualização (37 testes); ✅ `/hoje` é a rota inicial; ✅ 6 vistas de leads; ✅ campos obrigatórios por fase; ✅ rotting nos cards; ✅ seleção e atribuição em massa; 51 testes | **concluída** |
| **4 — Telefonia Zadarma** 🟡 | `ITelephonyProvider`; `ZadarmaProvider`; HMAC testado; extensões SIP; softphone SIP.js; webhooks; gravações em storage próprio; dispositions; power dialer; compliance | ✅ `ITelephonyProvider` + `ZadarmaProvider`; ✅ HMAC testado contra o cliente PHP; ✅ modelo `Call`/`CallEvent`/`Recording`/`AgentExtension`; ✅ webhooks com mitigações R2; ✅ dispositions + opt-out testado; ✅ horário validado no servidor; ✅ jobs de offload e retenção; ✅ `docs/RGPD.md`; ⬜ softphone SIP.js (precisa de conta); ⬜ power dialer | **em curso** |
| **5 — Comunicação** | Inbox com atribuição e templates; sequências multicanal com paragem à resposta; links de marcação; lembretes | Sequência de 5 passos para sozinha à resposta; link de marcação cria evento + atividade | 2 sem |
| **6 — Fecho** | Produtos, line items, propostas com link público e PDF, DocuSign, webhook → Ganho | Proposta €700 gerada, enviada, assinada, negócio fecha sozinho | 2 sem |
| **7 — Entrega** | Clientes, Projetos, templates (Website/Ads), entregáveis, briefing, automação Ganho→Projeto | Ganhar negócio cria projeto + checklist + email automaticamente | 2 sem |
| **8 — Receita** | Avenças, MRR decomposto, faturas, cobranças, saúde do cliente, export CSV | MRR correto face aos contratos ativos; aging funcional | 2 sem |
| **9 — Gestão** | Metas, leaderboard, relatórios com drill-down, permissões por papel | BDR autenticado não vê negócios de outro (teste automatizado) | 1–2 sem |
| **10 — Automações** | Motor de workflows + os 7 templates da §8.9 | 7 workflows ativos com `WorkflowRun` registado | 2 sem |
| **11 — Polimento** | Acessibilidade, estados vazios, onboarding, E2E dos 5 fluxos, manual pt-PT | Lighthouse ≥90 Perf+A11y nas 5 rotas; E2E verde no CI | 2 sem |

**Total estimado: ~21–24 semanas** (~5–6 meses) a um desenvolvedor a tempo inteiro.

A Fase 1 encolheu para 2–3 dias com a D4; o importador não desapareceu, mudou para a Fase 3 (já contabilizado nas suas 3 semanas).

---

## 3. Sequenciamento crítico

```
0 → 1 → 1.5 → 2 → 3 → 4 ─┬→ 5 → 6 → 7 → 8
                          └→ 9, 10 (paralelizáveis após 3)
                                              11 (fim)
```

- **1.5 bloqueia a 2**: sem `workspaceId` não há índices compostos nem keyset pagination.
- **2 bloqueia a 3**: `/hoje`, Leads e Pipeline assentam em `DataTable`, `Board` e Vistas Guardadas.
- **4 é independente da 3** no backend, mas o power dialer precisa das Vistas Guardadas (§8.6) — por isso vem depois.
- **A Fase 4 é a de maior valor comercial imediato** (problema #6: número americano). Se houver pressão de negócio, é a única candidata a antecipação — mas precisa da 3 para as filas de chamada.

---

## 4. Riscos (revistos após D2)

| # | Risco | Estado | Mitigação |
|---|---|---|---|
| R5 | Migração de 3.442 oportunidades | ✅ **Eliminado** | D2 + D4 — truncar; sem migração nem reimportação |
| R16 | Backfill de `workspaceId` | ✅ **Eliminado** | D2 — tabelas vazias |
| R17 | 71 ficheiros com Property | 🟡 Reduzido | `DROP` direto; remoção por camadas UI→rotas→serviços→schema |
| R1 | Número Zadarma atribuído aleatoriamente | 🔴 **Ativo** | **Contactar vendas Zadarma AGORA** (Fase 0) — não esperar pela Fase 4 |
| R2 | Webhooks Zadarma sem HMAC | 🔴 Ativo | Token no path + allowlist de IP + rate limit + dedupe |
| R3 | Quota de gravação pequena | 🔴 Ativo | Job de offload no dia 1 da Fase 4 |
| R4 | Widget WebRTC insuficiente | 🔴 Ativo | **PoC SIP.js antes de comprometer a Fase 4** |
| R6 | Enquadramento legal do cold calling B2B | 🔴 Ativo | Validar com advogado português antes de escalar |
| R18 | Zod 3 vs Zod 4 | 🟡 Ativo | Unificar na Fase 2 |
| R19 | Dois sistemas de DnD | 🟡 Ativo | Consolidar em dnd-kit na Fase 2 |
| R20 | Zero testes frontend/E2E | 🟡 Ativo | Vitest + Playwright já na Fase 0 |
| R21 | `buildScope` devolve `{}` | 🔴 **Ativo** | Corrigir na Fase 1 — falhar para fechado |
| **R22** | **Perda acidental para lá do âmbito da D2** | 🔴 **Novo** | `pg_dump` antes de tocar em nada; lista explícita de tabelas a preservar (§1.2); truncar por lista branca, nunca por `DROP SCHEMA` |
| R23 | O CSV original pode não cobrir tudo o que está na BD | ✅ **Eliminado** | D4 — contactos e oportunidades saem do âmbito; não há nada a comparar |
| **R24** | **Sem dados de CRM entre a Fase 1 e a Fase 3** (~4–5 semanas) | 🟡 **Novo** | Aceite pelo Tiago (D4). Mitigação: manter a Fase 2 curta e focada; o cold calling continua fora do CRM neste período |

---

## 5. Ações imediatas da Fase 0 (antes da Fase 1)

1. **`pg_dump` de produção**, guardado fora do Railway — bloqueia tudo o resto.
2. **Contactar vendas da Zadarma** sobre reserva manual de um número 289 de Faro (R1) — o prazo de resposta é externo, começa já.
3. Instalar Sentry (front + back), Vitest, Playwright.
4. Medir baseline de LCP/INP nas 3 listas principais, para comparação na Fase 2.
5. Criar ambiente de staging.

---

## 6. Perguntas em aberto

1. **Setor por clínica vem no CSV** ou é preciso classificar? Afeta o seed do enum `Setor` (§6.2) — resposta necessária na Fase 3, não agora.
2. **Já existe conta Zadarma?** Se não, o prazo de verificação de documentos (certidão/CC + morada PT) entra no caminho crítico da Fase 4.
