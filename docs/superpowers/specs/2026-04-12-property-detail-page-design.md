# Design: Ficha Completa do Imóvel (PropertyDetailPage)

**Data:** 2026-04-12
**Estado:** Aprovado

---

## Âmbito

Expandir a página `/properties/[id]` com galeria, edição inline de detalhes, tabs de documentos e visitas, e acções rápidas no painel lateral.

**Fora do âmbito:**
- Modal de criação rápida — fica 100% intocado
- Tabela de listagem de propriedades — sem alterações
- Upload de fotos no momento de criação — feito apenas após criação na página de detalhe

---

## 1. Base de Dados

### Campos adicionados ao modelo `Property` existente

```prisma
// Localização
postalCode   String?
freguesia    String?
concelho     String?
// district já existe

// Características extra
tipologia             String?   // T0 T1 T2 T3 T4 T4+
areaUtil              Float?
areaTereno            Float?
anoConstrucao         Int?
piso                  Int?
orientacao            String?
// energyCertificate já existe (reutilizado)

// Comodidades
comodidades  String[]

// Negócio
// purpose já existe (SALE | RENT | BOTH)
precoArrendamento  Float?
despesasCondominio Float?
imiAnual           Float?
// commission já existe
```

### Novos modelos

```prisma
model PropertyPhoto {
  id         String   @id @default(cuid())
  propertyId String
  url        String
  categoria  String?  // Exterior | Sala | Cozinha | Quarto | Casa de banho | Outro
  ordem      Int      @default(0)
  createdAt  DateTime @default(now())
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}

model PropertyDocument {
  id         String   @id @default(cuid())
  propertyId String
  nome       String
  tipo       String?  // Caderneta Predial | Certidão de Teor | Licença de Habitabilidade | Certificado Energético | Planta | Contrato | Outro
  url        String
  tamanho    Int?
  createdAt  DateTime @default(now())
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}

model PropertyVisit {
  id          String   @id @default(cuid())
  propertyId  String
  contactId   String?
  userId      String
  scheduledAt DateTime
  status      String   @default("agendada") // agendada | realizada | cancelada
  interesse   String?  // sim | nao | talvez
  notas       String?
  createdAt   DateTime @default(now())
  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}
```

### Migração

`npx prisma migrate dev --name property-detail-expansion`

---

## 2. Backend — Novos Endpoints

### Ficheiros (multer, disco local)

Upload guardado em `backend/uploads/properties/[id]/`.
Servido estaticamente via Express em `/uploads/...`.

```
GET    /properties/:id/photos
POST   /properties/:id/photos           multipart/form-data, campo "file" + "categoria"
PATCH  /properties/:id/photos/reorder   body: { order: string[] }  (array de ids por ordem)
PATCH  /properties/:id/photos/:photoId  body: { categoria }
DELETE /properties/:id/photos/:photoId

GET    /properties/:id/documents
POST   /properties/:id/documents        multipart/form-data, campo "file" + "nome" + "tipo"
DELETE /properties/:id/documents/:docId

GET    /properties/:id/visits
POST   /properties/:id/visits           body: { contactId?, scheduledAt, notas? }
PATCH  /properties/:id/visits/:visitId  body: { status?, interesse?, notas? }
```

### Geração de descrição com IA

```
POST /properties/:id/generate-description
```

Usa `OPENAI_API_KEY` se disponível (padrão actual do projecto).
Prompt: `"Escreve uma descrição profissional e apelativa para anúncio imobiliário em PT-PT para: [características do imóvel]"`
Devolve `{ description: string }`.

### Expansão do PATCH /properties/:id

Aceita todos os novos campos: `postalCode`, `freguesia`, `concelho`, `tipologia`, `areaUtil`, `areaTereno`, `anoConstrucao`, `piso`, `orientacao`, `precoArrendamento`, `despesasCondominio`, `imiAnual`, `comodidades`.

### getById expandido

Inclui `photos`, `documents`, `visits` (com contact name) nas relações.

---

## 3. Frontend — Estrutura de Ficheiros

```
frontend/src/pages/PropertyDetailPage.tsx   (reescrever)
frontend/src/components/properties/
  PropertyHeader.tsx       título, badges, referência, botão Editar
  PropertySidebar.tsx      preço, métricas, 3 botões de acção
  tabs/
    DetailsTab.tsx         edição inline por secção
    PhotosTab.tsx          galeria drag-and-drop + lightbox
    DocumentsTab.tsx       lista + upload
    VisitsTab.tsx          tabela + modal de agendamento
  modals/
    VisitModal.tsx         agendar visita
    ShareModal.tsx         link + QR + email + WhatsApp
```

---

## 4. PropertyDetailPage — Layout

```
← Voltar a Propriedades                    [Editar] [...]

Apartamento T2 · Lisboa        🟢 Disponível
Ref: IMO-2024-001

┌─────────────────────────┬───────────────────────┐
│ GALERIA                 │ PAINEL LATERAL        │
│ foto principal grande   │ 222.000 €             │
│ miniaturas em baixo     │ 85 m² · 2 qts · 1 wc │
│                         │                       │
│                         │ [Agendar Visita]      │
│                         │ [Partilhar Imóvel]    │
│                         │ [Gerar PDF]           │
└─────────────────────────┴───────────────────────┘

TABS: Detalhes | Fotos | Documentos | Visitas
└── conteúdo da tab activa
```

---

## 5. Tab Detalhes — Edição Inline

Cada campo: clica → `<input>` ou `<select>` → `onBlur`/`Enter` → `PATCH /properties/:id` → toast silencioso.

**Secções:**
- **Localização:** endereço, código postal, freguesia, concelho, distrito
- **Características:** tipo, tipologia, área bruta, área útil, área terreno (condicional: Moradia/Terreno), ano construção, piso, orientação solar, certificado energético
- **Comodidades:** grid de checkboxes (15 opções) — cada toggle faz PATCH imediato
- **Negócio:** finalidade, preço venda, preço arrendamento, despesas condomínio, IMI anual, comissão (campo interno)
- **Descrição:** textarea + botão "Gerar com IA" → POST `/properties/:id/generate-description` → preenche textarea

---

## 6. Tab Fotos

- Drag-and-drop com `@dnd-kit/sortable`
- Upload múltiplo: `<input type="file" multiple accept=".jpg,.jpeg,.png,.webp">`
- Máximo 30 fotos; formatos: JPG, PNG, WEBP
- Cada miniatura: botão eliminar + dropdown categoria
- Primeira foto = capa (ordem 0)
- Clique na miniatura → lightbox simples (estado local, sem biblioteca)
- Reordenação persiste via `PATCH /properties/:id/photos/reorder`

---

## 7. Tab Documentos

- Upload drag-and-drop ou botão
- Formatos: PDF, DOC, DOCX, JPG, PNG
- Cada documento: nome, tipo (dropdown), data, tamanho, botão download, botão eliminar
- Sem preview — apenas download

---

## 8. Tab Visitas

- Tabela: Data | Hora | Cliente | Consultor | Estado | Notas
- Estados com badge: Agendada (warning) | Realizada (success) | Cancelada (error)
- Botão "Agendar Visita" → `VisitModal`
- Clicar em visita realizada → expandir linha com: interesse (Sim/Não/Talvez) + nota livre
- Ao agendar: cria `PropertyVisit` + `CalendarEvent` ligado ao imóvel

---

## 9. Painel Lateral — Botões de Acção

### Agendar Visita
→ Abre `VisitModal` (dropdown de contactos com search, data/hora, notas)

### Partilhar Imóvel (`ShareModal`)
- Link público = URL actual (`window.location.href`)
- QR Code via `qrcode.react`
- "Copiar link" com `navigator.clipboard`
- "Enviar WhatsApp" → `https://wa.me/?text=...`
- "Enviar por email" → `mailto:` link

### Gerar PDF
- Client-side com `jsPDF` + `html2canvas`
- Conteúdo: foto de capa, características principais, descrição, contacto do consultor, logo da agência
- Download: `ficha-[referencia].pdf`

---

## 10. Dependências Novas

### Backend
- `multer` — upload de ficheiros
- `@types/multer`

### Frontend
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop fotos
- `qrcode.react` — QR code
- `jspdf` + `html2canvas` — geração de PDF

*(verificar se alguma já existe no package.json antes de instalar)*

---

## Decisões Tomadas

| Decisão | Escolha | Razão |
|---|---|---|
| Storage de ficheiros | Disco local (`uploads/`) | Simples, sem dependência externa; pode migrar para Supabase Storage depois |
| Drag-and-drop fotos | `@dnd-kit` | Leve, acessível, sem jQuery |
| PDF | `jsPDF` client-side | Sem carga no servidor |
| QR Code | `qrcode.react` | ~15kb, zero config |
| Edição inline | `onBlur` → PATCH | Sem botão guardar, UX fluida |
| IA descrição | OpenAI (padrão do projecto) | Anthropic não está configurada actualmente |
| Lightbox | Estado local simples | Sem biblioteca extra necessária |
| `energyCertificate` vs `certificadoEnergetico` | Reutilizar `energyCertificate` existente | Evitar duplicar campo |
| `purpose` vs `finalidade` | Reutilizar `purpose` existente | Evitar duplicar campo |
| `commission` vs `comissao` | Reutilizar `commission` existente | Evitar duplicar campo |
