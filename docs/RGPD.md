# RGPD — tratamento de dados no AlphaCRM

> Data: 2026-09-21 · Âmbito: cold calling B2B e gravação de chamadas
> **Este documento descreve o que está implementado. Não substitui aconselhamento jurídico** — ver §5.

---

## 1. Que dados são tratados

| Categoria | Origem | Base legal |
|---|---|---|
| Nome da empresa, telefone, email, morada | Listas públicas de clínicas, importação CSV | Interesse legítimo (prospeção B2B) |
| Nome do contacto e cargo | Chamada ou site da empresa | Interesse legítimo |
| Gravações de chamadas | Chamadas feitas e recebidas | Interesse legítimo (qualidade e formação) |
| Notas de chamada e histórico | Introduzidas pelo comercial | Interesse legítimo |
| Dados contratuais (propostas, faturas) | Após conversão | Execução de contrato |

Não são tratadas categorias especiais de dados. A base de dados é de **empresas**, não de particulares: os contactos são profissionais no exercício da sua função.

---

## 2. Gravação de chamadas

### 2.1 Aviso

O aviso de gravação é dado no início de cada chamada por mensagem automática configurável, e o facto de ter sido dado fica registado no `CallEvent` da chamada.

### 2.2 Base legal

**Interesse legítimo** — qualidade do atendimento e formação de comerciais. Não é pedido consentimento porque o tratamento não depende dele; o interlocutor é informado e pode opor-se, e a oposição é registada como `NAO_CONTACTAR`.

### 2.3 Retenção

| Situação | Prazo | Onde está implementado |
|---|---|---|
| Chamada **não convertida** | **30 dias** | `Recording.deleteAt`, definido em `calls.service.recordDisposition` |
| Lead **convertida** em negócio | `deleteAt` é limpo; passa a base pré-contratual, prazo configurável | idem |

Os 30 dias seguem a **Deliberação CNPD 1039/2017**, que fixa esse prazo para gravações com finalidade de qualidade e formação.

A purga corre diariamente às 03:30 (`jobs/recordings-cron.ts`) e **elimina a linha além do ficheiro** — uma linha a apontar para um ficheiro apagado continua a registar que a chamada foi gravada, que é precisamente o que o prazo de retenção existe para terminar.

### 2.4 Armazenamento

As gravações são descarregadas do operador e re-alojadas em armazenamento próprio, e apagadas do lado do operador. Além da quota (200MB no plano grátis, 2GB no Office), isto mantém o controlo do prazo de eliminação connosco e não com o operador.

---

## 3. Oposição ao contacto (opt-out)

`NAO_CONTACTAR` é a única disposition irreversível a partir do dialer. Ao ser registada:

1. `Lead.optOutCalls` passa a `true`
2. O estado passa a `DESQUALIFICADO` com o motivo registado
3. A lead sai de todas as filas de chamada, sequências e importações futuras
4. `calls.service.startCall` recusa marcar, com HTTP 403

Coberto por teste automatizado (`src/__tests__/calling-compliance.test.ts`), conforme exigido.

---

## 4. Horário de chamadas

Configurável por `CALLING_HOURS_START` / `CALLING_HOURS_END` (por defeito 9h–20h), sem chamadas ao fim de semana. **Validado no servidor**, não no dialer, para que um separador esquecido aberto não consiga marcar fora de horas.

---

## 5. Identificação do chamador

Só são apresentados números comprados e verificados na conta. A interface nunca fornece o caller ID — é escolhido no servidor a partir da lista do operador.

Portugal ainda não tem legislação anti-spoofing (a proposta da ANACOM está pendente), mas a ausência de lei não é autorização.

---

## 6. Direitos dos titulares

| Direito | Como é exercido |
|---|---|
| Acesso | Exportação dos dados do contacto a partir da ficha |
| Retificação | Edição inline na ficha |
| Apagamento | Soft delete na lead + purga da gravação |
| Oposição | `NAO_CONTACTAR`, ver §3 |
| Portabilidade | Exportação CSV |

---

## 7. ⚠️ Por validar com advogado

Estes pontos **não estão resolvidos** e precisam de parecer jurídico antes de escalar a operação de cold calling:

1. **Registo nacional de oposição para B2B.** Não há fonte primária clara de que exista em Portugal um equivalente à lista Robinson aplicável a chamadas B2B. Confirmar antes de aumentar o volume.
2. **Interesse legítimo para prospeção fria.** A avaliação de impacto (LIA) não foi formalizada. Recomendado documentá-la.
3. **Prazo pós-conversão.** "Configurável" não é um prazo. Fixar um número concreto.
4. **Transferências internacionais.** A Zadarma é uma empresa com infraestrutura fora da UE; confirmar onde ficam as gravações em trânsito e se há cláusulas contratuais-tipo aplicáveis.

---

## 8. Onde está no código

| Controlo | Ficheiro |
|---|---|
| Retenção de gravações | `backend/src/jobs/recordings-cron.ts` |
| Opt-out | `backend/src/lib/dispositions.ts` |
| Horário de chamadas | `backend/src/modules/telephony/calls.service.ts` |
| Caller ID restrito | `backend/src/modules/telephony/calls.service.ts` |
| Isolamento entre workspaces | `backend/src/lib/workspace.ts` + `src/__tests__/tenant-isolation.test.ts` |
