# CRM Mobile Optimization — Design Spec
Date: 2026-05-09  
Approach: Mobile-first incremental (Opção A)

## Overview

Make the CasaFlow CRM fully operational on mobile devices. The app already has basic mobile support (sliding sidebar, hamburger menu) but key pages break on small screens — wide tables, horizontal Kanban, oversized touch targets. This spec covers navigation, layout, and per-page fixes.

Target breakpoints:
- Mobile: `< 768px`
- Tablet: `768px – 1023px`
- Desktop: `≥ 1024px`

---

## 1. Navigation

### Bottom Navigation Bar (mobile only)

Replace the sidebar on mobile with a fixed bottom bar showing the 5 most-used routes. The existing sidebar only renders on `lg:` (≥ 1024px) — this is already enforced in `AppShell.tsx`. We extend that logic.

**New component:** `BottomNav.tsx` in `frontend/src/components/layout/`

Items (in order):
| Icon | Label | Route |
|------|-------|-------|
| LayoutDashboard | Dashboard | `/dashboard` |
| Users | Contactos | `/contacts` |
| Kanban | Pipeline | `/pipeline` |
| CheckSquare | Tarefas | `/tasks` |
| CalendarClock | Calendário | `/calendar` |

- Height: 56px, fixed bottom, full width
- Background: `var(--sidebar-bg)` — matches sidebar
- Active item: accent color icon + label; inactive: muted
- Badge support for Conversas (unread count) — shown as dot on icon
- Safe area inset respected (`padding-bottom: env(safe-area-inset-bottom)`) for iPhone notch

### Hamburger Drawer (remaining items)

The existing hamburger button in `TopBar` already toggles `sidebarOpen`. On mobile, the full sidebar slides in from the left as a drawer — this already works. No change needed here, just ensure the bottom nav doesn't interfere with the drawer overlay.

### TopBar on Mobile

Slim the TopBar on mobile:
- Hide user name + role (already hidden with `hidden sm:block`)  
- Hide dark mode toggle on mobile (move to Profile page or sidebar drawer)
- Keep: hamburger button, page title, notification bell

---

## 2. Pipeline — Mobile List View

### Problem
`KanbanBoard` renders columns side-by-side with fixed widths (~280px each). On mobile this causes horizontal scroll with no good UX.

### Solution
In `KanbanBoard.tsx`, detect mobile with a `useIsMobile()` hook (checks `window.innerWidth < 768` + resize listener). When mobile:

**Mobile Pipeline View:**
- Stage selector: horizontal scrollable tabs at top (one tab per pipeline stage, active highlighted)
- Card list: full-width cards below, showing Name, Value, Contact, Due date pill
- FAB (floating action button): "+" in bottom right to add opportunity to current stage
- Toggle button (top right): switches to horizontal Kanban scroll mode (`overflow-x: auto`, columns min-width 260px)

Desktop KanbanBoard is untouched.

---

## 3. Per-Page Responsive Fixes

### 3.1 ContactsPage

**Problem:** Renders a `<table>` with 6+ columns — breaks on mobile.

**Fix:** Below `768px`, replace table rows with card layout:
```
┌─────────────────────────────┐
│ [Avatar] Name    [Status]   │
│          Email · Phone      │
│          Source · Date      │
└─────────────────────────────┘
```
- Action buttons (Edit, Delete) become a `⋮` menu per card
- Filter/search bar stays at top; filter dropdowns open full-width on mobile
- Pagination controls stack vertically

### 3.2 TasksPage

**Problem:** Table with columns breaks on mobile; "mark complete" action requires hover.

**Fix:**
- Cards full-width with title, contact, priority badge, due date
- Quick-complete button (checkmark) visible always (not on hover)
- Priority badge with color coding already exists — reuse

### 3.3 CalendarPage

**Problem:** Calendar grid is mostly OK but buttons are small, padding insufficient.

**Fix:**
- Touch targets ≥ 44×44px on all calendar nav buttons
- "Nova tarefa" / "Novo evento" buttons become a single FAB on mobile
- Day cells in month view: minimum height 48px

### 3.4 DashboardPage

**Problem:** 4-column KPI grid overflows on mobile.

**Fix:**
- KPI cards: `grid-template-columns: repeat(2, 1fr)` on mobile (2×2 grid)
- Sparkline charts hidden on mobile (save space)
- Recent contacts / upcoming tasks stack vertically (already `flex-col` — verify padding)

### 3.5 PropertiesPage

**Problem:** Table with address, price, status, agent columns breaks.

**Fix:**
- Mobile card layout matching ContactsPage pattern
- Property image (if available) as small thumbnail left of card
- `⋮` action menu

---

## 4. Global Mobile UX Fixes

### Touch Targets
All interactive elements must be ≥ 44×44px. Audit and fix:
- `Button.tsx` — add `min-height: 44px` on mobile
- `TopBarIconBtn` — already 36×36; bump to 44×44 on mobile
- Table action icon buttons — replace with visible buttons or `⋮` menu

### Input Zoom Prevention (iOS)
Any `<input>` or `<select>` with `font-size < 16px` triggers auto-zoom on iOS Safari. Fix in `Input.tsx` and `Select.tsx`:
```css
@media (max-width: 768px) {
  input, select, textarea { font-size: 16px !important; }
}
```

### Modals on Mobile
In `Modal.tsx`, on mobile:
- Width: `100vw`
- Border-radius: `16px 16px 0 0` (bottom sheet feel)
- Position: fixed bottom (slide up animation)
- Max-height: `90vh` with inner scroll

### Main Content Padding
`AppShell` main area uses `clamp(12px, 4vw, 28px)` — good. Add `padding-bottom` on mobile to account for bottom nav height (56px + safe area).

---

## 5. Utility Hook

**`useIsMobile.ts`** — `frontend/src/hooks/useIsMobile.ts`  
Returns `boolean`, updates on resize via `ResizeObserver` or `window.addEventListener('resize')`.  
Breakpoint: `< 768px`.

---

## 6. Files Changed

| File | Change |
|------|--------|
| `components/layout/BottomNav.tsx` | New component |
| `components/layout/AppShell.tsx` | Render BottomNav on mobile, add bottom padding |
| `components/layout/TopBar.tsx` | Hide dark mode toggle on mobile |
| `components/kanban/KanbanBoard.tsx` | Mobile list view + stage tabs |
| `pages/ContactsPage.tsx` | Card layout on mobile |
| `pages/TasksPage.tsx` | Card layout on mobile |
| `pages/CalendarPage.tsx` | Touch target fixes, FAB |
| `pages/DashboardPage.tsx` | 2-col grid on mobile, hide sparklines |
| `pages/PropertiesPage.tsx` | Card layout on mobile |
| `components/ui/Modal.tsx` | Bottom sheet on mobile |
| `components/ui/Button.tsx` | min-height 44px on mobile |
| `components/ui/Input.tsx` | font-size 16px on mobile |
| `components/ui/Select.tsx` | font-size 16px on mobile |
| `hooks/useIsMobile.ts` | New hook |

---

## 7. Out of Scope

- PWA / service worker (separate initiative if needed)
- Tablet-specific layouts (tablet will inherit desktop layouts which are acceptable)
- ConversationsPage (complex; separate task)
- AutomationsPage, CampaignsPage (admin-only, rarely used on mobile)
