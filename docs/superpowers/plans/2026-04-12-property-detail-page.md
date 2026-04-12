# Property Detail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir `/properties/[id]` com galeria de fotos, edição inline de detalhes, tabs de documentos e visitas, e acções rápidas no painel lateral — sem tocar no modal de criação rápida nem na tabela de listagem.

**Architecture:** Novos modelos Prisma (`PropertyPhoto`, `PropertyDocument`, `PropertyVisit`) + endpoints REST em `properties.router.ts` + upload de ficheiros via `multer` guardado em disco + `PropertyDetailPage` reescrita com tabs e componentes dedicados. Edição inline faz PATCH imediato em cada campo. PDF gerado client-side com `jsPDF`.

**Tech Stack:** Prisma, Express, multer (upload), React, @dnd-kit/sortable (drag fotos), qrcode.react (QR), jspdf + html2canvas (PDF)

---

## File Map

### Backend — criar / modificar

| Ficheiro | Acção |
|---|---|
| `backend/prisma/schema.prisma` | Modificar — adicionar campos e 3 novos modelos |
| `backend/src/modules/properties/properties.service.ts` | Modificar — expandir `create`/`update`/`getById` + novos métodos para photos/docs/visits |
| `backend/src/modules/properties/properties.controller.ts` | Modificar — adicionar handlers para photos/docs/visits/generate-description |
| `backend/src/modules/properties/properties.router.ts` | Modificar — adicionar rotas + multer middleware |
| `backend/src/server.ts` | Modificar — servir `/uploads` como estático |

### Frontend — criar / modificar

| Ficheiro | Acção |
|---|---|
| `frontend/src/types/index.ts` | Modificar — expandir `Property`, adicionar `PropertyPhoto`, `PropertyDocument`, `PropertyVisit` |
| `frontend/src/api/properties.api.ts` | Modificar — adicionar chamadas para photos/docs/visits/generate-description |
| `frontend/src/pages/PropertyDetailPage.tsx` | Reescrever — layout com tabs |
| `frontend/src/components/properties/PropertyHeader.tsx` | Criar |
| `frontend/src/components/properties/PropertySidebar.tsx` | Criar |
| `frontend/src/components/properties/tabs/DetailsTab.tsx` | Criar |
| `frontend/src/components/properties/tabs/PhotosTab.tsx` | Criar |
| `frontend/src/components/properties/tabs/DocumentsTab.tsx` | Criar |
| `frontend/src/components/properties/tabs/VisitsTab.tsx` | Criar |
| `frontend/src/components/properties/modals/VisitModal.tsx` | Criar |
| `frontend/src/components/properties/modals/ShareModal.tsx` | Criar |

---

## Task 1: Schema Prisma — novos campos e modelos

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar campos ao modelo `Property` e os 3 novos modelos**

Abrir `backend/prisma/schema.prisma`. Localizar o modelo `Property` (linha ~227). Adicionar após o campo `imageUrls`:

```prisma
  // Localização extra
  postalCode         String?
  freguesia          String?
  concelho           String?

  // Características extra
  tipologia          String?
  areaUtil           Float?
  areaTereno         Float?
  anoConstrucao      Int?
  piso               Int?
  orientacao         String?

  // Comodidades (array de strings)
  comodidades        String[]

  // Negócio extra
  precoArrendamento  Float?
  despesasCondominio Float?
  imiAnual           Float?

  // Relações media
  photos             PropertyPhoto[]
  documents          PropertyDocument[]
  visits             PropertyVisit[]
```

Depois, no final do ficheiro (após o modelo `CalendarSlot`), adicionar:

```prisma
model PropertyPhoto {
  id         String   @id @default(cuid())
  propertyId String
  url        String
  categoria  String?
  ordem      Int      @default(0)
  createdAt  DateTime @default(now())
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}

model PropertyDocument {
  id         String   @id @default(cuid())
  propertyId String
  nome       String
  tipo       String?
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
  status      String   @default("agendada")
  interesse   String?
  notas       String?
  createdAt   DateTime @default(now())
  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Executar migração**

```bash
cd backend
npx prisma migrate dev --name property-detail-expansion
```

Resultado esperado: `✔ Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerar cliente Prisma**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): adicionar campos e modelos PropertyPhoto/Document/Visit"
```

---

## Task 2: Backend — instalar multer e servir uploads estáticos

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Instalar multer**

```bash
cd backend
npm install multer
npm install --save-dev @types/multer
```

- [ ] **Step 2: Criar pasta uploads**

```bash
mkdir -p uploads/properties
```

- [ ] **Step 3: Adicionar serve estático em `backend/src/server.ts`**

Após a linha `app.use(requestLogger);` (por volta da linha 58), adicionar:

```typescript
import path from 'path';

// Servir uploads estáticos
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
```

**Nota:** o `import path from 'path'` deve ser adicionado no topo do ficheiro junto aos outros imports.

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.ts backend/uploads/.gitkeep
git commit -m "feat(backend): instalar multer e servir /uploads estático"
```

---

## Task 3: Backend — expandir `properties.service.ts`

**Files:**
- Modify: `backend/src/modules/properties/properties.service.ts`

- [ ] **Step 1: Expandir `getById` para incluir fotos, documentos e visitas**

Substituir o bloco `include` dentro de `getById`:

```typescript
const property = await prisma.property.findFirst({
  where,
  include: {
    opportunities: {
      include: {
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    },
    photos: { orderBy: { ordem: 'asc' } },
    documents: { orderBy: { createdAt: 'desc' } },
    visits: {
      orderBy: { scheduledAt: 'desc' },
      include: {
        // contactId resolvido manualmente no controller — sem relação Prisma directa
      },
    },
  },
});
```

**Nota:** `PropertyVisit` não tem relação Prisma com `Contact` (para manter simplicidade). O nome do contacto será buscado separadamente no controller quando necessário.

Versão final correcta do `getById`:

```typescript
export const getById = async (id: string, user: any) => {
  const where: any = await buildWhereClause(user);
  where.id = id;

  const property = await prisma.property.findFirst({
    where,
    include: {
      opportunities: {
        include: {
          contact: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      },
      photos: { orderBy: { ordem: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      visits: { orderBy: { scheduledAt: 'desc' } },
    },
  });
  if (!property) {
    const err: any = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  return property;
};
```

- [ ] **Step 2: Expandir `update` para aceitar novos campos**

Substituir o `data` dentro de `prisma.property.update`:

```typescript
return prisma.property.update({
  where: { id },
  data: {
    title: dto.title,
    description: dto.description,
    type: dto.type as any,
    status: dto.status as any,
    price: dto.price,
    address: dto.address,
    area: dto.area,
    bedrooms: dto.bedrooms,
    bathrooms: dto.bathrooms,
    parking: dto.parking,
    reference: dto.reference,
    imageUrls: dto.imageUrls,
    // novos campos
    postalCode: dto.postalCode,
    freguesia: dto.freguesia,
    concelho: dto.concelho,
    tipologia: dto.tipologia,
    areaUtil: dto.areaUtil,
    areaTereno: dto.areaTereno,
    anoConstrucao: dto.anoConstrucao,
    piso: dto.piso,
    orientacao: dto.orientacao,
    energyCertificate: dto.energyCertificate,
    comodidades: dto.comodidades,
    purpose: dto.purpose as any,
    precoArrendamento: dto.precoArrendamento,
    despesasCondominio: dto.despesasCondominio,
    imiAnual: dto.imiAnual,
    commission: dto.commission,
  },
});
```

Também actualizar o tipo do parâmetro `dto` em `update` para incluir os novos campos:

```typescript
export const update = async (
  id: string,
  dto: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    price?: number;
    address?: string;
    area?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking?: number;
    reference?: string;
    imageUrls?: string;
    postalCode?: string;
    freguesia?: string;
    concelho?: string;
    tipologia?: string;
    areaUtil?: number;
    areaTereno?: number;
    anoConstrucao?: number;
    piso?: number;
    orientacao?: string;
    energyCertificate?: string;
    comodidades?: string[];
    purpose?: string;
    precoArrendamento?: number;
    despesasCondominio?: number;
    imiAnual?: number;
    commission?: number;
  },
  user: any
) => {
```

- [ ] **Step 3: Adicionar métodos para photos, documents, visits, e generate-description**

Adicionar no final do ficheiro `properties.service.ts`:

```typescript
// ─── PHOTOS ──────────────────────────────────────────────────────────────────

export const addPhoto = async (propertyId: string, url: string, categoria?: string) => {
  const maxOrdem = await prisma.propertyPhoto.aggregate({
    where: { propertyId },
    _max: { ordem: true },
  });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;
  return prisma.propertyPhoto.create({ data: { propertyId, url, categoria, ordem } });
};

export const reorderPhotos = async (propertyId: string, orderedIds: string[]) => {
  await Promise.all(
    orderedIds.map((id, idx) =>
      prisma.propertyPhoto.updateMany({
        where: { id, propertyId },
        data: { ordem: idx },
      })
    )
  );
};

export const updatePhoto = async (propertyId: string, photoId: string, categoria: string) => {
  return prisma.propertyPhoto.updateMany({
    where: { id: photoId, propertyId },
    data: { categoria },
  });
};

export const deletePhoto = async (propertyId: string, photoId: string) => {
  return prisma.propertyPhoto.deleteMany({ where: { id: photoId, propertyId } });
};

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const addDocument = async (
  propertyId: string,
  nome: string,
  url: string,
  tipo?: string,
  tamanho?: number
) => {
  return prisma.propertyDocument.create({ data: { propertyId, nome, url, tipo, tamanho } });
};

export const deleteDocument = async (propertyId: string, docId: string) => {
  return prisma.propertyDocument.deleteMany({ where: { id: docId, propertyId } });
};

export const getDocuments = async (propertyId: string) => {
  return prisma.propertyDocument.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'desc' },
  });
};

// ─── VISITS ──────────────────────────────────────────────────────────────────

export const getVisits = async (propertyId: string) => {
  return prisma.propertyVisit.findMany({
    where: { propertyId },
    orderBy: { scheduledAt: 'desc' },
  });
};

export const addVisit = async (
  propertyId: string,
  dto: { contactId?: string; scheduledAt: string; notas?: string },
  user: any
) => {
  return prisma.propertyVisit.create({
    data: {
      propertyId,
      contactId: dto.contactId ?? null,
      userId: user.id,
      scheduledAt: new Date(dto.scheduledAt),
      notas: dto.notas,
    },
  });
};

export const updateVisit = async (
  propertyId: string,
  visitId: string,
  dto: { status?: string; interesse?: string; notas?: string }
) => {
  return prisma.propertyVisit.updateMany({
    where: { id: visitId, propertyId },
    data: dto,
  });
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/properties/properties.service.ts
git commit -m "feat(properties): expandir service com photos/docs/visits e novos campos"
```

---

## Task 4: Backend — expandir controller e router

**Files:**
- Modify: `backend/src/modules/properties/properties.controller.ts`
- Modify: `backend/src/modules/properties/properties.router.ts`

- [ ] **Step 1: Adicionar handlers no controller**

Adicionar no final de `properties.controller.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import * as propertiesService from './properties.service';

// ─── PHOTOS ──────────────────────────────────────────────────────────────────

export const addPhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: 'Ficheiro obrigatório' }); return; }
    const url = `/uploads/properties/${req.params.id}/${file.filename}`;
    const photo = await propertiesService.addPhoto(req.params.id, url, req.body.categoria);
    res.status(201).json(photo);
  } catch (err) { next(err); }
};

export const reorderPhotos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.reorderPhotos(req.params.id, req.body.order);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const updatePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.updatePhoto(req.params.id, req.params.photoId, req.body.categoria);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

export const deletePhoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.deletePhoto(req.params.id, req.params.photoId);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const addDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: 'Ficheiro obrigatório' }); return; }
    const url = `/uploads/properties/${req.params.id}/${file.filename}`;
    const doc = await propertiesService.addDocument(
      req.params.id,
      req.body.nome || file.originalname,
      url,
      req.body.tipo,
      file.size
    );
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.deleteDocument(req.params.id, req.params.docId);
    res.status(204).send();
  } catch (err) { next(err); }
};

// ─── VISITS ──────────────────────────────────────────────────────────────────

export const getVisits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visits = await propertiesService.getVisits(req.params.id);
    res.status(200).json(visits);
  } catch (err) { next(err); }
};

export const addVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const visit = await propertiesService.addVisit(req.params.id, req.body, req.user);
    res.status(201).json(visit);
  } catch (err) { next(err); }
};

export const updateVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await propertiesService.updateVisit(req.params.id, req.params.visitId, req.body);
    res.status(200).json({ ok: true });
  } catch (err) { next(err); }
};

// ─── GENERATE DESCRIPTION ────────────────────────────────────────────────────

export const generateDescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prop = await propertiesService.getById(req.params.id, req.user);

    const features = [
      `Tipo: ${prop.type}`,
      prop.tipologia ? `Tipologia: ${prop.tipologia}` : null,
      prop.area ? `Área bruta: ${prop.area} m²` : null,
      prop.areaUtil ? `Área útil: ${prop.areaUtil} m²` : null,
      prop.bedrooms != null ? `Quartos: ${prop.bedrooms}` : null,
      prop.bathrooms != null ? `Casas de banho: ${prop.bathrooms}` : null,
      prop.parking != null ? `Estacionamento: ${prop.parking} lugar(es)` : null,
      prop.anoConstrucao ? `Ano de construção: ${prop.anoConstrucao}` : null,
      prop.piso != null ? `Piso: ${prop.piso}` : null,
      prop.orientacao ? `Orientação: ${prop.orientacao}` : null,
      prop.energyCertificate ? `Certificado energético: ${prop.energyCertificate}` : null,
      prop.address ? `Localização: ${prop.address}` : null,
      prop.comodidades?.length ? `Comodidades: ${prop.comodidades.join(', ')}` : null,
    ].filter(Boolean).join('; ');

    const prompt = `Escreve uma descrição profissional e apelativa para anúncio imobiliário em PT-PT para: ${features}`;

    let description = '';

    if (process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      description = completion.choices[0]?.message?.content ?? '';
    } else {
      description = `Excelente ${prop.type.toLowerCase()} ${prop.tipologia ?? ''} localizado em ${prop.address}. ${prop.area ? `Com ${prop.area} m² de área bruta` : ''}${prop.bedrooms != null ? `, ${prop.bedrooms} quartos` : ''}${prop.bathrooms != null ? ` e ${prop.bathrooms} casa(s) de banho` : ''}. Imóvel em excelente estado, ideal para quem procura conforto e qualidade.`;
    }

    res.status(200).json({ description });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Adicionar rotas no router**

Substituir o conteúdo de `properties.router.ts` por:

```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './properties.controller';

const router = Router();
router.use(authenticate);

// Upload storage — guarda em uploads/properties/:id/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(__dirname, '../../../../uploads/properties', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const photoUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Formato não suportado'));
  },
});

const docUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Formato não suportado'));
  },
});

// Propriedades base
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.patch('/:id', ctrl.update);
router.delete('/:id', requireRole('AGENCY_OWNER', 'AGENCY_ADMIN'), ctrl.remove);

// Fotos
router.post('/:id/photos', photoUpload.single('file'), ctrl.addPhoto);
router.patch('/:id/photos/reorder', ctrl.reorderPhotos);
router.patch('/:id/photos/:photoId', ctrl.updatePhoto);
router.delete('/:id/photos/:photoId', ctrl.deletePhoto);

// Documentos
router.post('/:id/documents', docUpload.single('file'), ctrl.addDocument);
router.delete('/:id/documents/:docId', ctrl.deleteDocument);

// Visitas
router.get('/:id/visits', ctrl.getVisits);
router.post('/:id/visits', ctrl.addVisit);
router.patch('/:id/visits/:visitId', ctrl.updateVisit);

// IA
router.post('/:id/generate-description', ctrl.generateDescription);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/properties/properties.controller.ts \
        backend/src/modules/properties/properties.router.ts
git commit -m "feat(properties): adicionar endpoints photos/documents/visits/generate-description"
```

---

## Task 5: Frontend — instalar dependências e actualizar tipos

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/properties.api.ts`

- [ ] **Step 1: Instalar dependências frontend**

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities qrcode.react jspdf html2canvas
```

- [ ] **Step 2: Expandir tipos em `frontend/src/types/index.ts`**

Após a interface `Property` existente (linha ~191), adicionar:

```typescript
export interface PropertyPhoto {
  id: string
  propertyId: string
  url: string
  categoria?: string
  ordem: number
  createdAt: string
}

export interface PropertyDocument {
  id: string
  propertyId: string
  nome: string
  tipo?: string
  url: string
  tamanho?: number
  createdAt: string
}

export interface PropertyVisit {
  id: string
  propertyId: string
  contactId?: string
  userId: string
  scheduledAt: string
  status: 'agendada' | 'realizada' | 'cancelada'
  interesse?: 'sim' | 'nao' | 'talvez'
  notas?: string
  createdAt: string
  // enriquecido no frontend
  contactName?: string
  userName?: string
}
```

Expandir a interface `Property` para incluir os novos campos e relações:

```typescript
export interface Property {
  id: string
  title: string
  description?: string
  type: PropertyType
  purpose?: PropertyPurpose
  status: PropertyStatus
  price: number
  address: string
  district?: string
  lat?: number
  lng?: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking?: number
  reference?: string
  energyCertificate?: string
  yearBuilt?: number
  condition?: string
  features?: string
  virtualTourUrl?: string
  tags?: string
  portalsPublished?: string
  commission?: number
  contractStart?: string
  contractEnd?: string
  viewCount?: number
  imageUrls: string
  // novos campos
  postalCode?: string
  freguesia?: string
  concelho?: string
  tipologia?: string
  areaUtil?: number
  areaTereno?: number
  anoConstrucao?: number
  piso?: number
  orientacao?: string
  comodidades?: string[]
  precoArrendamento?: number
  despesasCondominio?: number
  imiAnual?: number
  // relações
  photos?: PropertyPhoto[]
  documents?: PropertyDocument[]
  visits?: PropertyVisit[]
  createdById?: string
  createdAt: string
  updatedAt?: string
}
```

- [ ] **Step 3: Expandir API client**

Substituir o conteúdo de `frontend/src/api/properties.api.ts` por:

```typescript
import api from './client'

export const getProperties = (params?: any) => api.get('/properties', { params })
export const getProperty = (id: string) => api.get(`/properties/${id}`)
export const createProperty = (data: any) => api.post('/properties', data)
export const updateProperty = (id: string, data: any) => api.patch(`/properties/${id}`, data)
export const deleteProperty = (id: string) => api.delete(`/properties/${id}`)

// Photos
export const uploadPhoto = (id: string, file: File, categoria?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (categoria) fd.append('categoria', categoria)
  return api.post(`/properties/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const reorderPhotos = (id: string, order: string[]) =>
  api.patch(`/properties/${id}/photos/reorder`, { order })
export const updatePhoto = (id: string, photoId: string, categoria: string) =>
  api.patch(`/properties/${id}/photos/${photoId}`, { categoria })
export const deletePhoto = (id: string, photoId: string) =>
  api.delete(`/properties/${id}/photos/${photoId}`)

// Documents
export const uploadDocument = (id: string, file: File, nome: string, tipo?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('nome', nome)
  if (tipo) fd.append('tipo', tipo)
  return api.post(`/properties/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const deleteDocument = (id: string, docId: string) =>
  api.delete(`/properties/${id}/documents/${docId}`)

// Visits
export const getVisits = (id: string) => api.get(`/properties/${id}/visits`)
export const createVisit = (id: string, data: { contactId?: string; scheduledAt: string; notas?: string }) =>
  api.post(`/properties/${id}/visits`, data)
export const updateVisit = (id: string, visitId: string, data: { status?: string; interesse?: string; notas?: string }) =>
  api.patch(`/properties/${id}/visits/${visitId}`, data)

// IA
export const generateDescription = (id: string) =>
  api.post(`/properties/${id}/generate-description`)
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/src/types/index.ts frontend/src/api/properties.api.ts
git commit -m "feat(frontend): expandir tipos Property e api client com photos/docs/visits"
```

---

## Task 6: Frontend — `PropertyHeader` e `PropertySidebar`

**Files:**
- Create: `frontend/src/components/properties/PropertyHeader.tsx`
- Create: `frontend/src/components/properties/PropertySidebar.tsx`

- [ ] **Step 1: Criar `PropertyHeader.tsx`**

Criar `frontend/src/components/properties/PropertyHeader.tsx`:

```tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { Property } from '../../types'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../utils/constants'

const statusVariant: Record<string, any> = {
  AVAILABLE: 'success', RESERVED: 'warning', SOLD: 'info', RENTED: 'purple', IN_PROCESS: 'default'
}

interface Props {
  property: Property
  onEdit: () => void
}

export const PropertyHeader: React.FC<Props> = ({ property, onEdit }) => {
  const navigate = useNavigate()
  return (
    <div>
      <button
        onClick={() => navigate('/properties')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}
      >
        <ArrowLeft size={15} /> Voltar a Propriedades
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {property.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Badge variant="default">{PROPERTY_TYPE_LABELS[property.type]}</Badge>
            <Badge variant={statusVariant[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Badge>
            {property.reference && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref: {property.reference}</span>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={onEdit}>
          <Edit size={14} /> Editar
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `PropertySidebar.tsx`**

Criar `frontend/src/components/properties/PropertySidebar.tsx`:

```tsx
import React from 'react'
import { Calendar, Share2, FileText } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Property } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface Props {
  property: Property
  onScheduleVisit: () => void
  onShare: () => void
  onGeneratePDF: () => void
}

export const PropertySidebar: React.FC<Props> = ({ property, onScheduleVisit, onShare, onGeneratePDF }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              {property.purpose === 'RENT' ? 'Arrendamento' : 'Venda'}
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#4ade80', margin: '4px 0 0' }}>
              {formatCurrency(property.price)}
              {property.purpose === 'RENT' && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mês</span>}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--text-secondary)', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
            {property.area != null && <span><b>{property.area}</b> m²</span>}
            {property.bedrooms != null && <span><b>{property.bedrooms}</b> quartos</span>}
            {property.bathrooms != null && <span><b>{property.bathrooms}</b> WC</span>}
            {property.parking != null && <span><b>{property.parking}</b> estac.</span>}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button onClick={onScheduleVisit} style={{ width: '100%', justifyContent: 'center' }}>
          <Calendar size={15} /> Agendar Visita
        </Button>
        <Button variant="secondary" onClick={onShare} style={{ width: '100%', justifyContent: 'center' }}>
          <Share2 size={15} /> Partilhar Imóvel
        </Button>
        <Button variant="secondary" onClick={onGeneratePDF} style={{ width: '100%', justifyContent: 'center' }}>
          <FileText size={15} /> Gerar PDF
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/properties/
git commit -m "feat(properties): PropertyHeader e PropertySidebar"
```

---

## Task 7: Frontend — `DetailsTab` com edição inline

**Files:**
- Create: `frontend/src/components/properties/tabs/DetailsTab.tsx`

- [ ] **Step 1: Criar `DetailsTab.tsx`**

Criar `frontend/src/components/properties/tabs/DetailsTab.tsx`:

```tsx
import React, { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import type { Property } from '../../../types'
import { updateProperty, generateDescription } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'

const COMODIDADES = [
  'Garagem', 'Elevador', 'Varanda', 'Terraço', 'Jardim', 'Piscina',
  'Ar condicionado', 'Lareira', 'Arrecadação', 'Porteiro', 'Condomínio',
  'Mobilado', 'Cozinha equipada', 'Videovigilância', 'Painéis solares',
]

interface InlineFieldProps {
  label: string
  value?: string | number | null
  type?: 'text' | 'number' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  onSave: (val: string) => Promise<void>
}

const InlineField: React.FC<InlineFieldProps> = ({ label, value, type = 'text', options, onSave }) => {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(current)
    setSaving(false)
    setEditing(false)
  }

  if (type === 'select') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
        <select
          value={current}
          onChange={(e) => { setCurrent(e.target.value); onSave(e.target.value) }}
          style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '2px 6px' }}
        >
          <option value="">—</option>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <textarea
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={save}
          rows={4}
          style={{ width: '100%', marginTop: 4, fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '2px 8px', width: 180 }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ fontSize: 13, color: current ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 8px', borderRadius: 6, minWidth: 80, textAlign: 'right' }}
          title="Clique para editar"
        >
          {current || '—'}
        </span>
      )}
    </div>
  )
}

interface Props {
  property: Property
  onChange: (updated: Partial<Property>) => void
}

export const DetailsTab: React.FC<Props> = ({ property, onChange }) => {
  const { showToast } = useUIStore()
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [description, setDescription] = useState(property.description ?? '')

  const save = useCallback(async (field: string, value: any) => {
    try {
      await updateProperty(property.id, { [field]: value === '' ? null : value })
      onChange({ [field]: value === '' ? null : value })
    } catch {
      showToast('Erro ao guardar', 'error')
    }
  }, [property.id])

  const saveComodidade = async (comodidade: string, checked: boolean) => {
    const current = property.comodidades ?? []
    const next = checked ? [...current, comodidade] : current.filter(c => c !== comodidade)
    await save('comodidades', next)
  }

  const handleGenerateDesc = async () => {
    setGeneratingDesc(true)
    try {
      const res = await generateDescription(property.id)
      const desc = res.data.description
      setDescription(desc)
      await save('description', desc)
      showToast('Descrição gerada', 'success')
    } catch {
      showToast('Erro ao gerar descrição', 'error')
    } finally {
      setGeneratingDesc(false)
    }
  }

  const showAreaTereno = ['HOUSE', 'LAND', 'FARM'].includes(property.type)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Localização */}
      <Card title="Localização">
        <InlineField label="Endereço" value={property.address} onSave={v => save('address', v)} />
        <InlineField label="Código postal" value={property.postalCode} onSave={v => save('postalCode', v)} />
        <InlineField label="Freguesia" value={property.freguesia} onSave={v => save('freguesia', v)} />
        <InlineField label="Concelho" value={property.concelho} onSave={v => save('concelho', v)} />
        <InlineField label="Distrito" value={property.district} onSave={v => save('district', v)} />
      </Card>

      {/* Características */}
      <Card title="Características">
        <InlineField
          label="Tipologia"
          value={property.tipologia}
          type="select"
          options={['T0','T1','T2','T3','T4','T4+'].map(v => ({ value: v, label: v }))}
          onSave={v => save('tipologia', v)}
        />
        <InlineField label="Área bruta (m²)" value={property.area} type="number" onSave={v => save('area', v ? Number(v) : null)} />
        <InlineField label="Área útil (m²)" value={property.areaUtil} type="number" onSave={v => save('areaUtil', v ? Number(v) : null)} />
        {showAreaTereno && (
          <InlineField label="Área de terreno (m²)" value={property.areaTereno} type="number" onSave={v => save('areaTereno', v ? Number(v) : null)} />
        )}
        <InlineField label="Ano de construção" value={property.anoConstrucao} type="number" onSave={v => save('anoConstrucao', v ? Number(v) : null)} />
        <InlineField label="Piso" value={property.piso} type="number" onSave={v => save('piso', v ? Number(v) : null)} />
        <InlineField
          label="Orientação solar"
          value={property.orientacao}
          type="select"
          options={['Norte','Sul','Este','Oeste','Nascente','Poente'].map(v => ({ value: v, label: v }))}
          onSave={v => save('orientacao', v)}
        />
        <InlineField
          label="Certificado energético"
          value={property.energyCertificate}
          type="select"
          options={['A+','A','B','B-','C','D','E','F','Isento'].map(v => ({ value: v, label: v }))}
          onSave={v => save('energyCertificate', v)}
        />
      </Card>

      {/* Comodidades */}
      <Card title="Comodidades">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {COMODIDADES.map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(property.comodidades ?? []).includes(c)}
                onChange={e => saveComodidade(c, e.target.checked)}
              />
              {c}
            </label>
          ))}
        </div>
      </Card>

      {/* Negócio */}
      <Card title="Negócio">
        <InlineField
          label="Finalidade"
          value={property.purpose}
          type="select"
          options={[{ value: 'SALE', label: 'Venda' }, { value: 'RENT', label: 'Arrendamento' }, { value: 'TRESPASSE', label: 'Ambos' }]}
          onSave={v => save('purpose', v)}
        />
        <InlineField label="Preço de venda (€)" value={property.price} type="number" onSave={v => save('price', v ? Number(v) : 0)} />
        <InlineField label="Preço arrendamento (€/mês)" value={property.precoArrendamento} type="number" onSave={v => save('precoArrendamento', v ? Number(v) : null)} />
        <InlineField label="Despesas condomínio (€/mês)" value={property.despesasCondominio} type="number" onSave={v => save('despesasCondominio', v ? Number(v) : null)} />
        <InlineField label="IMI anual estimado (€)" value={property.imiAnual} type="number" onSave={v => save('imiAnual', v ? Number(v) : null)} />
        <InlineField label="Comissão (%)" value={property.commission} type="number" onSave={v => save('commission', v ? Number(v) : null)} />
      </Card>

      {/* Descrição */}
      <Card title="Descrição">
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save('description', description)}
            rows={5}
            style={{ width: '100%', fontSize: 13, color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
            placeholder="Descrição do imóvel..."
          />
        </div>
        <Button variant="secondary" onClick={handleGenerateDesc} loading={generatingDesc}>
          <Sparkles size={14} /> Gerar descrição com IA
        </Button>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/properties/tabs/DetailsTab.tsx
git commit -m "feat(properties): DetailsTab com edição inline por campo"
```

---

## Task 8: Frontend — `PhotosTab`

**Files:**
- Create: `frontend/src/components/properties/tabs/PhotosTab.tsx`

- [ ] **Step 1: Criar `PhotosTab.tsx`**

Criar `frontend/src/components/properties/tabs/PhotosTab.tsx`:

```tsx
import React, { useState, useRef, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, Upload } from 'lucide-react'
import type { PropertyPhoto } from '../../../types'
import { uploadPhoto, deletePhoto, reorderPhotos, updatePhoto } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'

const CATEGORIAS = ['Exterior', 'Sala', 'Cozinha', 'Quarto', 'Casa de banho', 'Outro']

interface SortablePhotoProps {
  photo: PropertyPhoto
  onDelete: (id: string) => void
  onCategoriaChange: (id: string, cat: string) => void
  onClick: () => void
  apiBase: string
}

const SortablePhoto: React.FC<SortablePhotoProps> = ({ photo, onDelete, onCategoriaChange, onClick, apiBase }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const src = photo.url.startsWith('http') ? photo.url : `${apiBase}${photo.url}`

  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border-color)', aspectRatio: '4/3', cursor: 'grab' }}>
      <img
        src={src}
        alt=""
        onClick={onClick}
        {...attributes}
        {...listeners}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
      >
        <X size={12} />
      </button>
      <select
        value={photo.categoria ?? ''}
        onChange={e => onCategoriaChange(photo.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 11, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 4px' }}
      >
        <option value="">Categoria...</option>
        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

interface Props {
  propertyId: string
  photos: PropertyPhoto[]
  onChange: (photos: PropertyPhoto[]) => void
}

export const PhotosTab: React.FC<Props> = ({ propertyId, photos, onChange }) => {
  const { showToast } = useUIStore()
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleFiles = useCallback(async (files: FileList) => {
    if (photos.length + files.length > 30) {
      showToast('Máximo de 30 fotos', 'error'); return
    }
    setUploading(true)
    try {
      const results: PropertyPhoto[] = []
      for (const file of Array.from(files)) {
        const res = await uploadPhoto(propertyId, file)
        results.push(res.data)
      }
      onChange([...photos, ...results])
    } catch {
      showToast('Erro ao fazer upload', 'error')
    } finally {
      setUploading(false)
    }
  }, [photos, propertyId])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(propertyId, photoId)
      onChange(photos.filter(p => p.id !== photoId))
    } catch {
      showToast('Erro ao eliminar foto', 'error')
    }
  }

  const handleCategoriaChange = async (photoId: string, categoria: string) => {
    try {
      await updatePhoto(propertyId, photoId, categoria)
      onChange(photos.map(p => p.id === photoId ? { ...p, categoria } : p))
    } catch {
      showToast('Erro ao actualizar categoria', 'error')
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({ ...p, ordem: i }))
    onChange(reordered)
    try {
      await reorderPhotos(propertyId, reordered.map(p => p.id))
    } catch {
      showToast('Erro ao reordenar', 'error')
    }
  }

  return (
    <div>
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}
      >
        <Upload size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p style={{ margin: 0 }}>{uploading ? 'A carregar...' : 'Arrastar fotos ou clique para seleccionar'}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11 }}>JPG, PNG, WEBP · Máx. 30 fotos</p>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {photos.map(photo => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                apiBase={apiBase}
                onDelete={handleDelete}
                onCategoriaChange={handleCategoriaChange}
                onClick={() => setLightbox(photo.url.startsWith('http') ? photo.url : `${apiBase}${photo.url}`)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/properties/tabs/PhotosTab.tsx
git commit -m "feat(properties): PhotosTab com drag-and-drop e lightbox"
```

---

## Task 9: Frontend — `DocumentsTab`

**Files:**
- Create: `frontend/src/components/properties/tabs/DocumentsTab.tsx`

- [ ] **Step 1: Criar `DocumentsTab.tsx`**

Criar `frontend/src/components/properties/tabs/DocumentsTab.tsx`:

```tsx
import React, { useState, useRef } from 'react'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import type { PropertyDocument } from '../../../types'
import { uploadDocument, deleteDocument } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import { formatDate } from '../../../utils/formatters'

const TIPOS = ['Caderneta Predial', 'Certidão de Teor', 'Licença de Habitabilidade', 'Certificado Energético', 'Planta', 'Contrato', 'Outro']

const formatSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  propertyId: string
  documents: PropertyDocument[]
  onChange: (docs: PropertyDocument[]) => void
}

export const DocumentsTab: React.FC<Props> = ({ propertyId, documents, onChange }) => {
  const { showToast } = useUIStore()
  const [uploading, setUploading] = useState(false)
  const [uploadTipo, setUploadTipo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadDocument(propertyId, file, file.name, uploadTipo || undefined)
      onChange([res.data, ...documents])
      showToast('Documento adicionado', 'success')
    } catch {
      showToast('Erro ao carregar documento', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(propertyId, docId)
      onChange(documents.filter(d => d.id !== docId))
    } catch {
      showToast('Erro ao eliminar documento', 'error')
    }
  }

  return (
    <div>
      {/* Upload zone */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={uploadTipo}
          onChange={e => setUploadTipo(e.target.value)}
          style={{ fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)' }}
        >
          <option value="">Tipo de documento</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <Upload size={14} /> {uploading ? 'A carregar...' : 'Adicionar documento'}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}
      >
        Ou arraste um documento para aqui
      </div>

      {/* Lista */}
      {documents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Sem documentos</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => {
            const href = doc.url.startsWith('http') ? doc.url : `${apiBase}${doc.url}`
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                <FileText size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                    {doc.tipo && <span>{doc.tipo} · </span>}
                    {formatDate(doc.createdAt)}
                    {doc.tamanho && <span> · {formatSize(doc.tamanho)}</span>}
                  </p>
                </div>
                <a href={href} download target="_blank" rel="noreferrer" style={{ padding: 6, color: 'var(--text-muted)', display: 'flex' }}>
                  <Download size={15} />
                </a>
                <button onClick={() => handleDelete(doc.id)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/properties/tabs/DocumentsTab.tsx
git commit -m "feat(properties): DocumentsTab com upload e lista de documentos"
```

---

## Task 10: Frontend — `VisitModal` e `VisitsTab`

**Files:**
- Create: `frontend/src/components/properties/modals/VisitModal.tsx`
- Create: `frontend/src/components/properties/tabs/VisitsTab.tsx`

- [ ] **Step 1: Criar `VisitModal.tsx`**

Criar `frontend/src/components/properties/modals/VisitModal.tsx`:

```tsx
import React, { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { getContacts } from '../../../api/contacts.api'
import { createVisit } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import type { PropertyVisit, Contact } from '../../../types'

interface Props {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (visit: PropertyVisit) => void
}

export const VisitModal: React.FC<Props> = ({ propertyId, isOpen, onClose, onCreated }) => {
  const { showToast } = useUIStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    getContacts({ limit: 200 }).then(r => {
      const d = r.data
      setContacts(Array.isArray(d) ? d : d.data || [])
    }).catch(() => {})
  }, [isOpen])

  const handleSubmit = async () => {
    if (!scheduledAt) { showToast('Data e hora obrigatórias', 'error'); return }
    setSaving(true)
    try {
      const res = await createVisit(propertyId, { contactId: contactId || undefined, scheduledAt, notas })
      onCreated(res.data)
      showToast('Visita agendada', 'success')
      onClose()
      setContactId(''); setScheduledAt(''); setNotas('')
    } catch {
      showToast('Erro ao agendar visita', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Visita" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Cliente</label>
          <select
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            style={{ width: '100%', fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)' }}
          >
            <option value="">— Seleccionar cliente —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Data e hora *</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{ width: '100%', fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notas</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            style={{ width: '100%', fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving}>Agendar</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Criar `VisitsTab.tsx`**

Criar `frontend/src/components/properties/tabs/VisitsTab.tsx`:

```tsx
import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { VisitModal } from '../modals/VisitModal'
import type { PropertyVisit } from '../../../types'
import { updateVisit } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'
import { formatDate } from '../../../utils/formatters'

const statusVariant: Record<string, any> = {
  agendada: 'warning', realizada: 'success', cancelada: 'error'
}
const statusLabel: Record<string, string> = {
  agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada'
}

interface Props {
  propertyId: string
  visits: PropertyVisit[]
  onChange: (visits: PropertyVisit[]) => void
}

export const VisitsTab: React.FC<Props> = ({ propertyId, visits, onChange }) => {
  const { showToast } = useUIStore()
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const handleStatusChange = async (visitId: string, status: string) => {
    try {
      await updateVisit(propertyId, visitId, { status })
      onChange(visits.map(v => v.id === visitId ? { ...v, status: status as any } : v))
    } catch {
      showToast('Erro ao actualizar visita', 'error')
    }
  }

  const handleInteresseChange = async (visitId: string, interesse: string, notas: string) => {
    try {
      await updateVisit(propertyId, visitId, { interesse, notas })
      onChange(visits.map(v => v.id === visitId ? { ...v, interesse: interesse as any, notas } : v))
    } catch {
      showToast('Erro ao guardar', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={14} /> Agendar Visita
        </Button>
      </div>

      {visits.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Sem visitas registadas</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visits.map(visit => {
            const dt = new Date(visit.scheduledAt)
            const isExpanded = expanded === visit.id
            return (
              <div key={visit.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 14px', cursor: visit.status === 'realizada' ? 'pointer' : 'default' }}
                  onClick={() => visit.status === 'realizada' && setExpanded(isExpanded ? null : visit.id)}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                    {dt.toLocaleDateString('pt-PT')} {dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant={statusVariant[visit.status]} small>{statusLabel[visit.status]}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{visit.notas || '—'}</span>
                  <select
                    value={visit.status}
                    onChange={e => { e.stopPropagation(); handleStatusChange(visit.id, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 12, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-primary)' }}
                  >
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                {isExpanded && visit.status === 'realizada' && (
                  <VisitFeedback visit={visit} onSave={(interesse, notas) => handleInteresseChange(visit.id, interesse, notas)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <VisitModal
        propertyId={propertyId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={v => onChange([v, ...visits])}
      />
    </div>
  )
}

const VisitFeedback: React.FC<{ visit: PropertyVisit; onSave: (interesse: string, notas: string) => void }> = ({ visit, onSave }) => {
  const [interesse, setInteresse] = useState(visit.interesse ?? '')
  const [notas, setNotas] = useState(visit.notas ?? '')

  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Cliente demonstrou interesse?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['sim', 'nao', 'talvez'].map(v => (
            <button
              key={v}
              onClick={() => setInteresse(v)}
              style={{ padding: '4px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: interesse === v ? 700 : 400, background: interesse === v ? 'var(--color-primary)' : 'var(--bg-card)', color: interesse === v ? '#fff' : 'var(--text-secondary)', borderColor: interesse === v ? 'var(--color-primary)' : 'var(--border-color)' }}
            >
              {v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Talvez'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nota pós-visita</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          style={{ width: '100%', fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => onSave(interesse, notas)}>Guardar</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/properties/modals/VisitModal.tsx \
        frontend/src/components/properties/tabs/VisitsTab.tsx
git commit -m "feat(properties): VisitsTab e VisitModal"
```

---

## Task 11: Frontend — `ShareModal` e geração de PDF

**Files:**
- Create: `frontend/src/components/properties/modals/ShareModal.tsx`

- [ ] **Step 1: Criar `ShareModal.tsx`**

Criar `frontend/src/components/properties/modals/ShareModal.tsx`:

```tsx
import React, { useState } from 'react'
import QRCode from 'qrcode.react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  url: string
}

export const ShareModal: React.FC<Props> = ({ isOpen, onClose, url }) => {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waText = encodeURIComponent(`Olha este imóvel: ${url}`)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partilhar Imóvel" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <QRCode value={url} size={160} />

        <div style={{ width: '100%' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Link do imóvel</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={url}
              style={{ flex: 1, fontSize: 12, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-secondary)' }}
            />
            <button
              onClick={copyLink}
              style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
            >
              {copied ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: '#25d366', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=Imóvel&body=${waText}`}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            Email
          </a>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Criar função `generatePDF`**

Criar `frontend/src/components/properties/generatePDF.ts`:

```typescript
import jsPDF from 'jspdf'
import type { Property } from '../../types'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../utils/constants'

export const generatePropertyPDF = async (property: Property, apiBase: string) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, margin = 15

  // Título
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(property.title, margin, 25)

  // Tipo e estado
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`${PROPERTY_TYPE_LABELS[property.type]} · ${PROPERTY_STATUS_LABELS[property.status]}`, margin, 33)
  if (property.reference) doc.text(`Ref: ${property.reference}`, margin, 39)

  // Preço
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 200, 80)
  doc.text(
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price),
    W - margin,
    25,
    { align: 'right' }
  )
  doc.setTextColor(0)

  let y = 50

  // Foto de capa
  if (property.photos && property.photos.length > 0) {
    try {
      const photoUrl = property.photos[0].url.startsWith('http')
        ? property.photos[0].url
        : `${apiBase}${property.photos[0].url}`
      const img = await loadImage(photoUrl)
      const imgW = W - margin * 2
      const imgH = Math.min(imgW * 0.6, 90)
      doc.addImage(img, 'JPEG', margin, y, imgW, imgH)
      y += imgH + 8
    } catch { /* sem foto */ }
  }

  // Características
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)
  const chars: string[] = []
  if (property.area) chars.push(`Área: ${property.area} m²`)
  if (property.bedrooms != null) chars.push(`Quartos: ${property.bedrooms}`)
  if (property.bathrooms != null) chars.push(`WC: ${property.bathrooms}`)
  if (property.parking != null) chars.push(`Estac.: ${property.parking}`)
  doc.text(chars.join('  ·  '), margin, y)
  y += 7

  // Endereço
  doc.text(property.address, margin, y)
  y += 10

  // Descrição
  if (property.description) {
    doc.setFontSize(9)
    doc.setTextColor(80)
    const lines = doc.splitTextToSize(property.description, W - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 8
  }

  // Rodapé
  doc.setFontSize(9)
  doc.setTextColor(140)
  doc.text('CasaFlow CRM · ' + new Date().toLocaleDateString('pt-PT'), margin, 285)

  const ref = property.reference || property.id.slice(0, 8)
  doc.save(`ficha-${ref}.pdf`)
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/properties/modals/ShareModal.tsx \
        frontend/src/components/properties/generatePDF.ts
git commit -m "feat(properties): ShareModal com QR code e generatePDF"
```

---

## Task 12: Frontend — `PropertyDetailPage` reescrita

**Files:**
- Modify: `frontend/src/pages/PropertyDetailPage.tsx`

- [ ] **Step 1: Reescrever `PropertyDetailPage.tsx`**

Substituir o conteúdo completo de `frontend/src/pages/PropertyDetailPage.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProperty, updateProperty } from '../api/properties.api'
import type { Property, PropertyPhoto, PropertyDocument, PropertyVisit } from '../types'
import { PageSpinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { useUIStore } from '../store/ui.store'
import { PropertyHeader } from '../components/properties/PropertyHeader'
import { PropertySidebar } from '../components/properties/PropertySidebar'
import { DetailsTab } from '../components/properties/tabs/DetailsTab'
import { PhotosTab } from '../components/properties/tabs/PhotosTab'
import { DocumentsTab } from '../components/properties/tabs/DocumentsTab'
import { VisitsTab } from '../components/properties/tabs/VisitsTab'
import { VisitModal } from '../components/properties/modals/VisitModal'
import { ShareModal } from '../components/properties/modals/ShareModal'
import { generatePropertyPDF } from '../components/properties/generatePDF'

// Edit modal reutiliza o PropertyForm já existente em PropertiesPage
// Para não duplicar código, importamos dinamicamente
import { PropertiesPage } from './PropertiesPage'

type Tab = 'details' | 'photos' | 'documents' | 'visits'

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useUIStore()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  const fetchProperty = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getProperty(id)
      setProperty(res.data)
    } catch {
      showToast('Erro ao carregar propriedade', 'error')
      navigate('/properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProperty() }, [id])

  if (loading) return <PageSpinner />
  if (!property) return null

  const handlePropertyChange = (updated: Partial<Property>) => {
    setProperty(prev => prev ? { ...prev, ...updated } : prev)
  }

  const handlePhotosChange = (photos: PropertyPhoto[]) => {
    setProperty(prev => prev ? { ...prev, photos } : prev)
  }

  const handleDocumentsChange = (documents: PropertyDocument[]) => {
    setProperty(prev => prev ? { ...prev, documents } : prev)
  }

  const handleVisitsChange = (visits: PropertyVisit[]) => {
    setProperty(prev => prev ? { ...prev, visits } : prev)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Detalhes' },
    { key: 'photos', label: `Fotos${property.photos?.length ? ` (${property.photos.length})` : ''}` },
    { key: 'documents', label: `Documentos${property.documents?.length ? ` (${property.documents.length})` : ''}` },
    { key: 'visits', label: `Visitas${property.visits?.length ? ` (${property.visits.length})` : ''}` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PropertyHeader property={property} onEdit={() => navigate(`/properties?edit=${property.id}`)} />

      {/* Galeria + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Galeria de capa */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', minHeight: 220 }}>
          {property.photos && property.photos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <img
                src={property.photos[0].url.startsWith('http') ? property.photos[0].url : `${apiBase}${property.photos[0].url}`}
                alt={property.title}
                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
              />
              {property.photos.length > 1 && (
                <div style={{ display: 'flex', gap: 4, padding: 8, overflowX: 'auto' }}>
                  {property.photos.slice(1, 6).map(p => (
                    <img
                      key={p.id}
                      src={p.url.startsWith('http') ? p.url : `${apiBase}${p.url}`}
                      alt=""
                      style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0, cursor: 'pointer', opacity: 0.85 }}
                      onClick={() => setActiveTab('photos')}
                    />
                  ))}
                  {property.photos.length > 6 && (
                    <button
                      onClick={() => setActiveTab('photos')}
                      style={{ width: 72, height: 52, borderRadius: 6, flexShrink: 0, background: 'var(--bg-page)', border: '1px dashed var(--border-color)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
                    >
                      +{property.photos.length - 6}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}
              onClick={() => setActiveTab('photos')}
            >
              <span style={{ fontSize: 32, opacity: 0.3 }}>🏠</span>
              Adicionar fotos
            </div>
          )}
        </div>

        <PropertySidebar
          property={property}
          onScheduleVisit={() => setShowVisitModal(true)}
          onShare={() => setShowShareModal(true)}
          onGeneratePDF={() => generatePropertyPDF(property, apiBase)}
        />
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === 'details' && (
            <DetailsTab property={property} onChange={handlePropertyChange} />
          )}
          {activeTab === 'photos' && (
            <PhotosTab
              propertyId={property.id}
              photos={property.photos ?? []}
              onChange={handlePhotosChange}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              propertyId={property.id}
              documents={property.documents ?? []}
              onChange={handleDocumentsChange}
            />
          )}
          {activeTab === 'visits' && (
            <VisitsTab
              propertyId={property.id}
              visits={property.visits ?? []}
              onChange={handleVisitsChange}
            />
          )}
        </div>
      </div>

      <VisitModal
        propertyId={property.id}
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        onCreated={v => handleVisitsChange([v, ...(property.visits ?? [])])}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
      />
    </div>
  )
}
```

**Nota:** O botão "Editar" no header navega para `/properties?edit=ID`. Isso requer uma pequena alteração na `PropertiesPage` para abrir o modal de edição se a query string `edit` estiver presente — ver passo seguinte.

- [ ] **Step 2: Ajustar `PropertiesPage` para abrir modal via query param**

Em `frontend/src/pages/PropertiesPage.tsx`, dentro de `PropertiesPage`, após os `useState`, adicionar:

```typescript
// Abrir modal de edição via URL ?edit=id (chamado da página de detalhe)
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const editId = params.get('edit')
  if (editId && properties.length > 0) {
    const prop = properties.find(p => p.id === editId)
    if (prop) { setEditProp(prop); setShowModal(true) }
  }
}, [properties])
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PropertyDetailPage.tsx \
        frontend/src/pages/PropertiesPage.tsx
git commit -m "feat(properties): PropertyDetailPage completa com tabs, galeria e acções"
```

---

## Task 13: Verificação final e arranque

- [ ] **Step 1: Verificar que o backend compila**

```bash
cd backend
npx tsc --noEmit
```

Corrigir quaisquer erros de tipos.

- [ ] **Step 2: Verificar que o frontend compila**

```bash
cd frontend
npx tsc --noEmit
```

Corrigir quaisquer erros de tipos.

- [ ] **Step 3: Arrancar e testar manualmente**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Fluxo a testar:
1. Abrir `/properties` → clicar numa propriedade → confirma que abre `/properties/[id]`
2. Tab Detalhes → clicar num campo → editar → blur → confirmar que guarda (sem toast de erro)
3. Tab Fotos → arrastar uma foto para o drop zone → confirmar miniatura aparece
4. Tab Documentos → upload de um PDF → aparece na lista
5. Tab Visitas → "Agendar Visita" → preencher → confirmar aparece na lista
6. Painel lateral → "Partilhar Imóvel" → modal abre com QR e link
7. Painel lateral → "Gerar PDF" → download acontece

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: verificação final property detail expansion"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Alteração 1: página `/properties/[id]` com layout galeria + sidebar + tabs
- ✅ Alteração 2: Tab Detalhes com edição inline, secções Localização/Características/Comodidades/Negócio/Descrição + IA
- ✅ Alteração 3: Tab Fotos com drag-and-drop, lightbox, categorias, máx 30
- ✅ Alteração 4: Tab Documentos com upload, lista, tipos, download
- ✅ Alteração 5: Tab Visitas com tabela, modal agendamento, feedback pós-visita
- ✅ Alteração 6: Botões Agendar Visita / Partilhar (QR + WhatsApp) / Gerar PDF
- ✅ Alteração 7: Modal de criação 100% intocado (upload de fotos também removido)
- ✅ Schema: 3 novos modelos + campos adicionais ao Property

**Placeholder scan:** Nenhum TBD ou TODO no plano.

**Type consistency:** `PropertyPhoto`, `PropertyDocument`, `PropertyVisit` definidos na Task 5 e usados consistentemente nas Tasks 8-12. `Property.photos`, `Property.documents`, `Property.visits` adicionados na Task 5. Métodos de API definidos na Task 5 e usados nas Tasks 8-11.

**Nota sobre `getContacts`:** o `VisitModal` usa `getContacts` da API de contacts. Verificar que `frontend/src/api/contacts.api.ts` exporta essa função antes de executar a Task 10.
