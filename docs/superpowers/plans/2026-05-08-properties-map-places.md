# Properties: Map + Google Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar mapa interativo na ficha do imóvel (usando os campos `lat/lng` já existentes) e autocomplete de morada via Google Places API na criação/edição de imóveis.

**Architecture:** Mapa via iframe Google Maps embed (sem SDK — zero dependências extra). Google Places via REST Autocomplete API chamada do backend (evita expor API key no frontend) ou via script loader no frontend. Usamos o loader no frontend com a Places API JavaScript SDK.

**Tech Stack:** Google Maps JavaScript API (Places library), React, campos `lat/lng/address` já no schema Prisma.

---

### Task 1: Configurar API Key Google Maps

**Files:**
- Modify: `frontend/.env.example`
- Modify: `frontend/.env` (local, não commitado)

- [ ] **Step 1: Adicionar variável de ambiente**

Em `frontend/.env.example`, adicionar:
```
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

Em `frontend/.env` (ficheiro local real), preencher com a chave real da Google Cloud Console.

> A chave precisa de ter as APIs "Maps JavaScript API" e "Places API" ativadas. Restringir por domínio/referrer na Google Cloud Console.

- [ ] **Step 2: Commit do .env.example**

```bash
git add frontend/.env.example
git commit -m "feat(properties): add VITE_GOOGLE_MAPS_KEY env var"
```

---

### Task 2: Hook para carregar Google Maps SDK

**Files:**
- Create: `frontend/src/hooks/useGoogleMaps.ts`

- [ ] **Step 1: Criar hook**

Criar `frontend/src/hooks/useGoogleMaps.ts`:

```typescript
import { useEffect, useState } from 'react'

let loaded = false
let loading = false
const callbacks: Array<() => void> = []

export const useGoogleMaps = () => {
  const [ready, setReady] = useState(loaded)

  useEffect(() => {
    if (loaded) { setReady(true); return }
    callbacks.push(() => setReady(true))
    if (loading) return
    loading = true

    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key) { console.warn('VITE_GOOGLE_MAPS_KEY não definida'); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=pt`
    script.async = true
    script.onload = () => {
      loaded = true
      loading = false
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }
    document.head.appendChild(script)
  }, [])

  return ready
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useGoogleMaps.ts
git commit -m "feat(properties): add useGoogleMaps hook for lazy SDK loading"
```

---

### Task 3: Componente AddressAutocomplete

**Files:**
- Create: `frontend/src/components/properties/AddressAutocomplete.tsx`

- [ ] **Step 1: Criar componente**

Criar `frontend/src/components/properties/AddressAutocomplete.tsx`:

```tsx
import React, { useEffect, useRef } from 'react'
import { useGoogleMaps } from '../../hooks/useGoogleMaps'

interface Props {
  value: string
  onChange: (address: string, lat?: number, lng?: number, components?: Record<string, string>) => void
  placeholder?: string
  style?: React.CSSProperties
}

export const AddressAutocomplete: React.FC<Props> = ({ value, onChange, placeholder, style }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const acRef = useRef<any>(null)
  const ready = useGoogleMaps()

  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return

    const google = (window as any).google
    acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'pt' },
      fields: ['formatted_address', 'geometry', 'address_components'],
    })

    acRef.current.addListener('place_changed', () => {
      const place = acRef.current.getPlace()
      if (!place.geometry) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const components: Record<string, string> = {}
      place.address_components?.forEach((c: any) => {
        if (c.types.includes('postal_code')) components.postalCode = c.long_name
        if (c.types.includes('locality')) components.city = c.long_name
        if (c.types.includes('administrative_area_level_1')) components.district = c.long_name
        if (c.types.includes('sublocality') || c.types.includes('administrative_area_level_2')) components.freguesia = c.long_name
      })

      onChange(place.formatted_address, lat, lng, components)
    })
  }, [ready, onChange])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      placeholder={placeholder || 'Pesquisar morada em Portugal…'}
      style={{
        width: '100%', padding: '9px 13px', borderRadius: 8,
        border: '1px solid var(--border)', fontSize: 13,
        background: 'var(--surface-2)', color: 'var(--text-primary)',
        outline: 'none', boxSizing: 'border-box', ...style,
      }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/properties/AddressAutocomplete.tsx
git commit -m "feat(properties): add AddressAutocomplete component with Google Places"
```

---

### Task 4: Integrar autocomplete na ficha do imóvel

**Files:**
- Modify: `frontend/src/components/properties/tabs/DetailsTab.tsx`

- [ ] **Step 1: Substituir input de morada**

Em `DetailsTab.tsx`, encontrar o campo `address` (input de texto simples) e substituir por:

```tsx
import { AddressAutocomplete } from '../AddressAutocomplete'

// No lugar do <input> de address:
<AddressAutocomplete
  value={form.address || ''}
  onChange={(address, lat, lng, components) => {
    setForm((f: any) => ({
      ...f,
      address,
      ...(lat !== undefined && { lat }),
      ...(lng !== undefined && { lng }),
      ...(components?.postalCode && { postalCode: components.postalCode }),
      ...(components?.city && { district: components.city }),
      ...(components?.district && { distrito: components.district }),
      ...(components?.freguesia && { freguesia: components.freguesia }),
    }))
  }}
/>
```

> Adaptar os nomes dos campos (`form`, `setForm`) ao que existir no componente.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/properties/tabs/DetailsTab.tsx
git commit -m "feat(properties): integrate AddressAutocomplete in property details form"
```

---

### Task 5: Mapa na ficha do imóvel

**Files:**
- Create: `frontend/src/components/properties/PropertyMap.tsx`
- Modify: `frontend/src/components/properties/tabs/DetailsTab.tsx`

- [ ] **Step 1: Criar componente PropertyMap**

Criar `frontend/src/components/properties/PropertyMap.tsx`:

```tsx
import React from 'react'

interface Props {
  lat: number
  lng: number
  title?: string
}

export const PropertyMap: React.FC<Props> = ({ lat, lng, title }) => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (!key) return null

  const encodedTitle = encodeURIComponent(title || '')
  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=15&language=pt`

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginTop: 20 }}>
      <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Localização
      </div>
      <iframe
        title={`Mapa — ${title || 'Imóvel'}`}
        width="100%"
        height="300"
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        allowFullScreen
        src={src}
      />
      <div style={{ padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          Ver no Google Maps ↗
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar mapa na DetailsTab**

Em `DetailsTab.tsx`, importar e usar `PropertyMap`:

```tsx
import { PropertyMap } from '../PropertyMap'

// No final do JSX da DetailsTab, antes de fechar o container principal:
{property.lat && property.lng && (
  <PropertyMap lat={property.lat} lng={property.lng} title={property.title} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/properties/PropertyMap.tsx frontend/src/components/properties/tabs/DetailsTab.tsx
git commit -m "feat(properties): add map embed in property detail view"
```

---

### Task 6: Guardar lat/lng no backend ao actualizar imóvel

**Files:**
- Modify: `backend/src/modules/properties/properties.service.ts`

- [ ] **Step 1: Aceitar lat/lng no update**

Em `properties.service.ts`, nas funções `create` e `update`, confirmar que `lat` e `lng` estão no dto e são passados ao Prisma. Se não estiverem, adicionar:

```typescript
// No tipo dto:
lat?: number;
lng?: number;

// No data do prisma:
...(dto.lat !== undefined && { lat: dto.lat }),
...(dto.lng !== undefined && { lng: dto.lng }),
```

Também garantir `postalCode`, `district`, `freguesia` nos mesmos dtos.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/properties/
git commit -m "feat(properties): ensure lat/lng and address components are persisted"
```

---
