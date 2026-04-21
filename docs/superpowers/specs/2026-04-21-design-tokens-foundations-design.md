# Design Tokens & Foundations — Sub-projeto 1 do Redesign CasaFlow

**Data:** 2026-04-21
**Âmbito:** Primeira fatia do redesign completo de UI/UX. Só tokens, tipografia, variáveis CSS, dark mode e reset global. **Não** toca em componentes, páginas ou layouts — isso é fatias seguintes.
**Stack:** React 19 + Vite + Tailwind v4 + TypeScript. Ficheiros-chave: `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/index.html`.

---

## Objetivo

Substituir a paleta atual (navy `#0f2553` + gold `#b8963e`) pela nova identidade **azul marinho + azul royal** da spec, introduzir **3 famílias tipográficas** (DM Sans / Inter / DM Mono), manter compatibilidade com tokens shadcn/Radix já usados pelos componentes existentes, e preparar o terreno para os sub-projetos seguintes sem partir nada em produção.

## Não-objetivos

- Redesenhar qualquer componente, página ou layout. Só muda o **valor** dos tokens; quem consome (Sidebar, Button, DataTable, etc.) é mexido nas fatias seguintes.
- Adicionar novos utilitários Tailwind além dos já em uso.
- Migrar classes hard-coded (`text-slate-600`, `bg-white`, etc.) — isso acontece página a página nas fatias seguintes. Esta fatia preserva os overrides de dark mode existentes para que nada visível parta antes do tempo.
- Criar novos componentes (Toast avançado, CommandPalette, Skeleton) — fatia 2.

## Decisões principais

### 1. Paleta — substituição total

Gold sai completamente. Todos os tokens passam a refletir a paleta da spec do utilizador:

```css
--primary: #1B2B4B;
--primary-light: #243860;
--accent: #2E6BE6;
--accent-hover: #1E55C4;
--accent-soft: #EEF3FD;
--success: #16A34A;
--warning: #D97706;
--danger: #DC2626;
--surface: #FFFFFF;
--surface-2: #F8F9FC;
--surface-3: #F1F3F8;
--border: #E4E7EF;
--border-strong: #CBD0DC;
--text-primary: #0F1728;
--text-secondary: #4B5675;
--text-muted: #8B92A9;
--sidebar-bg: #1B2B4B;
--sidebar-text: #C8D3E8;
--sidebar-active: #FFFFFF;
--sidebar-active-bg: #2E6BE6;
```

**Tokens legacy retidos como aliases (transição):**
`--color-navy`, `--color-navy-mid`, `--color-gold`, `--color-gold-light`, `--color-border-cf`, `--color-muted-cf`, `--color-sidebar`, `--color-off-white` ainda existem espalhados por componentes. Em vez de caçar agora e partir algo, remapeio-os para a nova paleta como aliases:

- `--color-navy` → `#1B2B4B` (= `--primary`)
- `--color-navy-mid` → `#243860` (= `--primary-light`)
- `--color-gold` → `#2E6BE6` (= `--accent`) — **gold passa a significar accent royal**
- `--color-gold-light` → `#EEF3FD` (= `--accent-soft`)
- `--color-border-cf` → `#E4E7EF`
- `--color-muted-cf` → `#8B92A9`
- `--color-off-white` → `#F8F9FC`
- `--color-sidebar` → mantém `#ffffff` (usado pela sidebar *branca* antiga em desktop; a sidebar nova é azul marinho e usa `--sidebar-bg`)

Isto evita um "dia D" em que tudo parte. Cada página eliminará os aliases à medida que for redesenhada; no fim do redesign (fatia final) removemos o bloco de aliases inteiro.

**Tokens shadcn/Radix (`--primary`, `--secondary`, `--background`, etc.):** remapeados para HSL equivalente da nova paleta para que `@radix-ui/*`, `class-variance-authority` e componentes que consomem `hsl(var(--primary))` continuem a funcionar com o novo visual.

### 2. Tipografia — 3 famílias via Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- Movo a importação do `index.css` para `<link>` no `index.html` para permitir `preconnect` e paralelismo com o bundle JS.
- `display=swap` evita FOIT.
- Tokens tipográficos:

```css
--font-display: 'DM Sans', system-ui, sans-serif;  /* headings, labels */
--font-body:    'Inter', system-ui, sans-serif;    /* body, UI */
--font-mono:    'DM Mono', 'SF Mono', monospace;   /* KPIs, valores */
```

- `body` passa a usar `--font-body`. Headings usam `--font-display` através de utilitário Tailwind (`font-display`) configurado no `@theme`. Números financeiros/KPI usam `font-mono` (utilitário Tailwind já existe, mas aponta para `--font-mono`).

### 3. Dark mode — toggle funcional com persistência

Implementação de sistema + inicialização:

- Criar `frontend/src/lib/theme.ts` com API mínima:
  ```ts
  export type Theme = 'light' | 'dark' | 'system';
  export function getStoredTheme(): Theme;   // lê localStorage 'casaflow-theme' (default 'system')
  export function applyTheme(theme: Theme): void;  // adiciona/remove classe 'dark' no <html>
  export function resolveTheme(theme: Theme): 'light' | 'dark';  // system → matchMedia
  ```
- Bootstrap anti-flash em `index.html` (`<head>`, antes do bundle): script síncrono inline que lê `localStorage` e aplica `.dark` no `<html>` antes de qualquer render, evitando flash de tema errado.
- Listener de `prefers-color-scheme` em `main.tsx` para quando `theme === 'system'`.
- Zustand store (`useThemeStore`) já pode ficar para a fatia que acrescenta o toggle UI (Topbar). Aqui entregamos **só a base**: API + persistência + anti-flash. Sem UI de toggle ainda.

Tokens dark (aplicados via `.dark` e via `[data-theme="dark"]` — suportamos ambos para não partir nada):

```css
.dark, [data-theme="dark"] {
  --surface: #0F1728;
  --surface-2: #1B2B4B;
  --surface-3: #243860;
  --border: #2D3E5F;
  --border-strong: #3E5380;
  --text-primary: #F0F4FF;
  --text-secondary: #A9B4CE;
  --text-muted: #8B92A9;
  --sidebar-bg: #090E1A;
  --accent-soft: rgba(46,107,230,0.12);
  /* primary/accent/success/warning/danger inalterados */
}
```

### 4. Reset e base

- `*, *::before, *::after { box-sizing: border-box }` — já existe, mantém-se.
- `body { font-family: var(--font-body); background: var(--surface-2); color: var(--text-primary); }`
- Scrollbar: manter a scrollbar fina existente mas com cores da nova paleta.
- `focus-visible` global: `outline: 2px solid var(--accent); outline-offset: 2px` para acessibilidade consistente.
- Transições globais: manter as existentes (`120ms cubic-bezier`), só ajustar a lista de propriedades (`transform` incluído).

### 5. Utilitários CSS reutilizáveis

As classes existentes (`.nav-link`, `.card`, `.page-container`, `.data-table`, `.metric-card`, `.icon-btn`, `.input-premium`, `.gradient-text`) ficam mas os seus **valores internos passam a usar os novos tokens**. Nenhuma remoção ainda — os componentes que dependem destas classes continuam a funcionar. Tomadas aqui:

- `.nav-link.active::before` (a barra gold à esquerda) → passa a cor `--accent`. Na fatia da Sidebar substituímos esta classe pelo pill design da spec.
- `.gradient-text` → gradiente passa de `#1a2e4a → #c9a84c` para `#1B2B4B → #2E6BE6`.
- `.input-premium:focus` → ring passa a `rgba(46,107,230,0.18)`.

## Arquitetura dos ficheiros

```
frontend/
├── index.html                          # + preconnect + link fonts + script anti-flash
├── src/
│   ├── index.css                       # reescrito: tokens + reset + utilitários
│   ├── main.tsx                        # + listener prefers-color-scheme (system theme)
│   └── lib/
│       └── theme.ts                    # NOVO: API mínima de tema
```

Zero alterações em componentes, páginas, ou routes.

## Contratos e interfaces

**`lib/theme.ts`:**
```ts
export type Theme = 'light' | 'dark' | 'system';

export function getStoredTheme(): Theme;
export function setStoredTheme(t: Theme): void;   // escreve localStorage + aplica
export function resolveTheme(t: Theme): 'light' | 'dark';  // system → matchMedia
export function applyTheme(t: Theme): void;       // muda classe .dark em <html>
export function watchSystemTheme(cb: (resolved: 'light'|'dark') => void): () => void;
```

Ninguém em fatia 1 consome isto ainda (Topbar na fatia 3 é quem acrescenta o toggle). Entregamos a API preparada.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Componente que usa `text-gold-*` hard-coded fica invisível quando gold vira azul | Aliases remapeados garantem continuidade visual (gold=accent). Auditamos hard-codes nas fatias seguintes. |
| Tokens shadcn (`--primary`, `--secondary`) usados por Radix partem layout | Mantemos nomes, mudamos só valores HSL — testado visualmente no Dashboard em dev antes de commit. |
| Flash de tema errado em primeiro load | Script anti-flash inline em `<head>` antes do bundle. |
| 3 famílias de fonte atrasam primeiro render | `display=swap` + `preconnect` + weights limitados aos estritamente usados. |
| Dark mode atualmente usa `.dark` mas docs da spec mencionam `[data-theme="dark"]` | Suportamos ambos os seletores em paralelo; nenhum código existente parte. |

## Testing

- **Visual smoke test:** navegar em dev por Login, Dashboard, Contactos, Pipeline, Calendário, Conversas. Nenhuma página deve ficar quebrada, ilegível ou sem cor de fundo. Componentes podem parecer "um pouco diferentes" (cores ligeiramente deslocadas) — esperado. Nada deve estar **partido**.
- **Dark mode manual:** alternar `document.documentElement.classList.toggle('dark')` na consola em cada página e verificar legibilidade.
- **TypeScript:** `npm run -s build` no `/frontend` passa sem erros.
- **Lint:** `npm run lint` sem novos erros.

Não há testes automatizados para este projeto (verificado em `package.json`), por isso a validação é visual + build.

## Critérios de aceitação

- [ ] `frontend/src/index.css` reescrito com novos tokens, aliases de transição e dark mode.
- [ ] `frontend/index.html` com preconnect + link para as 3 fontes + script anti-flash de tema.
- [ ] `frontend/src/lib/theme.ts` criado e exportando a API acima.
- [ ] `frontend/src/main.tsx` a chamar `applyTheme(getStoredTheme())` no arranque e a ouvir `prefers-color-scheme`.
- [ ] `npm run build` passa.
- [ ] Dashboard em dev: sidebar navy, accent royal visível em links ativos, tipografia Inter no body e DM Sans nos títulos, nada ilegível.
- [ ] Dark mode forçado via classe manual: texto legível em todas as páginas visitadas.
- [ ] Commit + push (conforme preferência gravada).

## Próximas fatias (não implementar aqui)

2. Componentes `ui/` (Button, Input, Badge, Modal, Table, Toast refinado, Skeleton novo, CommandPalette novo).
3. Layout (Sidebar + Topbar + tema toggle UI + command palette trigger).
4. Dashboard (KPI cards, funil, agendamentos próximos).
5. Contactos + Drawer.
6. Pipeline Kanban.
7. Agendamentos Calendar.
8. Propriedades + Conversas + Relatórios.
9. Responsividade + polish final + remoção dos aliases legacy.
