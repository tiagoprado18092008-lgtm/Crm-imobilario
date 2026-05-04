# Spec: Importação de Propriedades via CSV

**Data:** 2026-05-04  
**Estado:** Aprovado pelo utilizador

---

## Contexto

A página de Propriedades (`/properties`) permite criar propriedades manualmente uma a uma. Os consultores imobiliários precisam de importar carteiras inteiras de imóveis de forma rápida — a funcionalidade de importação CSV resolve isto sem requerer alterações ao backend.

---

## Fluxo do utilizador

1. Na página de Propriedades, botão **"Importar CSV"** ao lado do "Nova Propriedade"
2. Clica → abre modal `ImportPropertiesModal`
3. Modal tem duas tabs:
   - **"Template"** — botão para descarregar `template_propriedades.csv` com colunas pré-definidas e uma linha de exemplo
   - **"Importar"** — área de drag-and-drop (ou clica para selecionar ficheiro .csv)
4. Após selecionar ficheiro: parse imediato no frontend, validação linha a linha
5. Envia propriedades válidas para `createProperty` em sequência, com barra de progresso
6. No final: resumo — "X propriedades importadas, Y falharam" com lista de erros por linha (ex: "Linha 4: preço inválido")
7. Ao fechar o modal com sucesso, a tabela de propriedades recarrega

---

## Template CSV

Colunas (header em português, minúsculas com underscore):

| Coluna | Obrigatório | Valores aceites |
|---|---|---|
| titulo | ✅ | texto (mín. 2 chars) |
| tipo | ✅ | APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, WAREHOUSE, FARM, OTHER |
| estado | ✅ | AVAILABLE, RESERVED, SOLD, RENTED, IN_PROCESS |
| preco | ✅ | número positivo |
| endereco | ✅ | texto (mín. 3 chars) |
| area | — | número (m²) |
| quartos | — | número inteiro |
| casas_banho | — | número inteiro |
| estacionamento | — | número inteiro |
| referencia | — | texto |
| descricao | — | texto |

O template inclui uma linha de exemplo comentada com `#` (ignorada no parse).

---

## Arquitectura

### Frontend only — sem endpoint novo

- Parse com **`papaparse`** (instalar se não existir no projeto)
- Validação linha a linha no frontend antes de enviar
- Chamadas à API existente `createProperty` em sequência (não paralelas para não sobrecarregar)
- Componente novo isolado: `frontend/src/components/properties/ImportPropertiesModal.tsx`
- Nenhuma alteração ao backend

### Validação por linha

Erros que causam skip da linha (não param a importação):
- `titulo` em falta ou menos de 2 chars
- `tipo` não reconhecido
- `estado` não reconhecido
- `preco` não é número ou é negativo
- `endereco` em falta ou menos de 3 chars

Campos opcionais inválidos (ex: `quartos` = "abc") são ignorados silenciosamente (campo fica undefined).

### Geração do template

Template gerado dinamicamente com `Blob` no browser — sem ficheiro estático. Linha de exemplo usa dados fictícios ilustrativos.

---

## Componentes afectados

| Ficheiro | Alteração |
|---|---|
| `frontend/src/components/properties/ImportPropertiesModal.tsx` | **Novo** — modal completo de importação |
| `frontend/src/pages/PropertiesPage.tsx` | Adicionar botão "Importar CSV" + import do modal |
| `package.json` (frontend) | Adicionar `papaparse` + `@types/papaparse` se não existirem |

---

## Estados do modal

1. **idle** — tabs Template / Importar, área de drop visível
2. **parsing** — a processar o ficheiro (instantâneo, sem spinner necessário)
3. **importing** — barra de progresso (X de Y propriedades)
4. **done** — resumo de sucesso/erros, botão "Fechar"

---

## Critérios de sucesso

- Utilizador consegue descarregar o template, preencher, e importar sem ler documentação
- Linhas inválidas não bloqueiam as válidas
- Erros são identificáveis por número de linha
- A tabela actualiza após importação bem-sucedida
