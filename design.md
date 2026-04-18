# Alpha Brain — Frontend Design Document

## 1. Vision

Alpha Brain is a **template-driven universal OS for your thoughts** — a second brain that captures ideas, actions, resources, and alerts across any domain (finance, hobbies, projects, research). The finance/market features are not special-cased; they are templates with richer data sources (stock APIs, market feeds). Every category of thinking follows the same core primitive: **Idea → Actions → Resources → Alerts**.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | SSR + SSG + PWA support, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible component primitives |
| State | Zustand | Lightweight, no boilerplate |
| Data fetching | TanStack Query (React Query) | Caching, background sync, optimistic updates |
| Forms | React Hook Form + Zod | Schema-driven validation (mirrors template system) |
| PWA | next-pwa | Service worker, offline support, installable |
| Animations | Framer Motion | Swipe gestures, page transitions |
| Charts | Recharts | Portfolio timelines, market charts |
| Icons | Lucide React | Consistent icon set |
| Notifications | Web Push API + OneSignal | Push notifications for alerts |
| Mock API | MSW (Mock Service Worker) | Frontend dev without backend dependency |

---

## 3. Architecture Overview

```
alpha-brain/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated layout
│   │   ├── layout.tsx            # Shell: nav + bottom bar
│   │   ├── page.tsx              # /home
│   │   ├── ideas/
│   │   │   ├── page.tsx          # /ideas — feed with filters
│   │   │   ├── create/
│   │   │   │   └── page.tsx      # /ideas/create
│   │   │   └── [id]/
│   │   │       └── page.tsx      # /ideas/[id] — detail view
│   │   ├── dashboard/
│   │   │   └── page.tsx          # /dashboard — template-driven
│   │   ├── portfolio/
│   │   │   ├── page.tsx          # /portfolio — actual holdings
│   │   │   └── virtual/
│   │   │       ├── page.tsx      # /portfolio/virtual — list
│   │   │       └── [id]/
│   │   │           └── page.tsx  # /portfolio/virtual/[id]
│   │   ├── market/
│   │   │   └── page.tsx          # /market — market dashboard
│   │   ├── categories/
│   │   │   └── page.tsx          # /categories — manage categories
│   │   └── swipe/
│   │       └── page.tsx          # /swipe — mobile idea swipe UI
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   └── layout.tsx                # Root layout + PWA manifest
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── shell/                    # AppShell, Sidebar, BottomNav
│   ├── ideas/                    # IdeaCard, IdeaFeed, IdeaForm
│   ├── actions/                  # ActionItem, ActionList
│   ├── templates/                # TemplateRenderer, FieldRenderer
│   ├── dashboard/                # DashboardRenderer, WidgetGrid
│   ├── widgets/                  # Individual dashboard widgets
│   │   ├── PortfolioWidget.tsx
│   │   ├── MarketWidget.tsx
│   │   ├── OpinionReturnWidget.tsx
│   │   ├── HobbyTrackerWidget.tsx
│   │   └── GenericStatsWidget.tsx
│   └── swipe/                    # SwipeCard, SwipeDeck
├── lib/
│   ├── api/                      # API client (TanStack Query hooks)
│   ├── mock/                     # MSW handlers + seed data
│   ├── templates/                # Template registry + renderer logic
│   ├── store/                    # Zustand stores
│   └── utils/
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # App icons (192, 512px)
└── design.md                     # This file
```

---

## 4. Core Design Principle — Template Engine

Every category in Alpha Brain has a **template** that defines two things:

```ts
type Template = {
  id: string
  name: string
  form_structure: FieldDefinition[]   // What to capture when creating an idea
  widget_structure: WidgetDefinition[] // What to render in the dashboard
}

type FieldDefinition = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'ticker' | 'url' | 'file' | 'select' | 'multiselect' | 'rating'
  required?: boolean
  options?: string[]       // for select/multiselect
  placeholder?: string
}

type WidgetDefinition = {
  key: string
  widget: 'stats' | 'chart' | 'stock-price' | 'portfolio-returns' | 'opinion-tracker' | 'action-list' | 'resource-gallery' | 'hobby-progress' | 'custom'
  dataSource?: 'idea-field' | 'stock-api' | 'market-api' | 'computed'
  config?: Record<string, unknown>
}
```

### How it flows

```
User selects category
  → Template loaded (form_structure + widget_structure)
  → IdeaForm rendered from form_structure
  → User fills and saves idea
  → DashboardRenderer reads widget_structure
  → Renders correct widgets with idea's content_json data
```

### Example: Stock Opinion Template

```json
{
  "name": "Stock Opinion",
  "form_structure": [
    { "key": "ticker", "label": "Stock", "type": "ticker" },
    { "key": "thesis", "label": "Your Thesis", "type": "textarea" },
    { "key": "target_price", "label": "Target Price", "type": "number" },
    { "key": "timeframe", "label": "Timeframe", "type": "select", "options": ["1 week", "1 month", "3 months", "1 year"] },
    { "key": "conviction", "label": "Conviction", "type": "rating" }
  ],
  "widget_structure": [
    { "key": "ticker", "widget": "stock-price", "dataSource": "stock-api" },
    { "key": "thesis_returns", "widget": "opinion-tracker", "dataSource": "computed" },
    { "key": "actions", "widget": "action-list", "dataSource": "idea-field" }
  ]
}
```

### Example: Book Reading Template

```json
{
  "name": "Book Reading",
  "form_structure": [
    { "key": "title", "label": "Book Title", "type": "text" },
    { "key": "author", "label": "Author", "type": "text" },
    { "key": "total_pages", "label": "Total Pages", "type": "number" },
    { "key": "current_page", "label": "Current Page", "type": "number" },
    { "key": "key_learnings", "label": "Key Learnings", "type": "textarea" }
  ],
  "widget_structure": [
    { "key": "reading_progress", "widget": "hobby-progress", "dataSource": "idea-field" },
    { "key": "actions", "widget": "action-list", "dataSource": "idea-field" }
  ]
}
```

---

## 5. Pages & Routes

### `/home`
- **Metrics bar**: total ideas, opinions, actions taken
- **Active actions**: most recent/urgent actions across all ideas (sorted by due date)
- **Opinion returns widget**: stock opinions P&L summary
- **Hobbies tracker**: active hobbies + action counts
- **Currently reading/watching**: in-progress ideas
- **Bottom nav** (mobile): Home | Ideas | Market | Portfolio | Swipe

### `/ideas`
Idea feed with:
- Search bar
- Filters: Category | Year/Month range | Tags | Status
- Sort: Recent | Most actions | Due soon
- Each card: AI-generated headline + cover image/url + category chip + action count

### `/ideas/create`
Step-by-step form:
1. Pick category (or create new)
2. Template auto-loads → form renders dynamically
3. Add resources (upload files, attach links)
4. Add first action + optional due date + alert
5. Submit → redirects to idea detail

### `/ideas/[id]`
- Full idea view
- Editable content (inline)
- Version history (branching via parent_id)
- Resources gallery
- Actions list with updates log
- Alert management
- "Branch this idea" → creates child idea

### `/dashboard`
Template-driven dashboard per category. If user selects "Stock Opinions" category:
- Renders opinion tracker widgets for all stock-opinion ideas
- If user selects "Hobbies": renders hobby progress widgets

### `/market`
General market dashboard (data from free stock APIs):
- Top gainers / losers (NSE)
- Most traded by volume + delivery %
- Index performance: NIFTY 50, MIDCAP 150, SMALLCAP 250
- Sector heatmap

### `/portfolio`
Actual holdings dashboard (syncs once daily post-market close):
- Total portfolio value + overall P&L
- Best and worst performing stocks
- Holdings table (stock, qty, avg price, current price, gain/loss %)
- Portfolio timeline chart
- Comparison vs NIFTY 50 / MIDCAP / SMALLCAP

### `/portfolio/virtual`
List of virtual portfolios:
- Each portfolio: name, idea/thesis linked, total return %, vs actual portfolio, vs index

### `/portfolio/virtual/[id]`
- Thesis/idea linked at top (click → goes to idea)
- 1L budget allocation across selected stocks
- Returns timeline
- Compare: virtual vs actual vs index

### `/swipe`
Mobile-first swipe deck (Perplexity-style):
- Each card: AI headline + cover image + category chip
- Swipe right → mark as reviewed / take action
- Swipe left → dismiss / archive
- Tap → full idea detail

### `/categories`
- List of all categories
- Create category → pick template fields from library
- Edit template fields
- Browse public template library

---

## 6. Navigation

### Desktop — Left Sidebar
```
Alpha Brain [logo]
─────────────────
Home
Ideas
Dashboard
Market
Portfolio
  └── Virtual Portfolios
Categories
─────────────────
Settings
```

### Mobile — Bottom Tab Bar
```
[Home] [Ideas] [Market] [Portfolio] [Swipe]
```

Floating action button (+) on mobile → quick idea create.

---

## 7. Design System

### Color Palette
```
Background:     #0A0A0F  (near black)
Surface:        #111118  (card background)
Surface-2:      #1A1A24  (elevated surface)
Border:         #2A2A38
Primary:        #7C6FFF  (violet)
Primary-hover:  #6A5EE8
Success:        #22C55E  (gains, positive)
Danger:         #EF4444  (losses, negative)
Warning:        #F59E0B  (alerts, pending)
Text-primary:   #F0F0F8
Text-secondary: #8888A8
Text-muted:     #55556A
```

### Typography
```
Font:         Inter (system fallback: -apple-system)
Heading-1:    32px / 700 / -0.02em
Heading-2:    24px / 600 / -0.01em
Heading-3:    18px / 600
Body:         14px / 400 / 1.6
Caption:      12px / 400
Mono:         JetBrains Mono (ticker symbols, prices)
```

### Spacing
```
Base unit: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64
Card padding: 16px (mobile) / 24px (desktop)
Page padding: 16px (mobile) / 32px (desktop)
```

### Border Radius
```
Card:   12px
Button: 8px
Chip:   999px (pill)
Input:  8px
```

### Component States
- Loading: skeleton shimmer (not spinner)
- Empty: illustration + CTA
- Error: inline error with retry
- Optimistic: immediate UI update, revert on failure

---

## 8. Key UI Patterns

### Idea Card (Feed)
```
┌─────────────────────────────────┐
│ [cover image or colored bg]     │
│                                 │
│ Stock Opinion          [chip]   │
│ ─────────────────────────────   │
│ TSLA could hit 400 before       │
│ earnings on strong delivery     │
│                                 │
│ 3 actions  ·  2 resources       │
│ 4d ago               [→ open]   │
└─────────────────────────────────┘
```

### Action Item
```
┌─────────────────────────────────┐
│ ○  Cold reach analyst at Morgan │
│    Stanley about TSLA thesis    │
│                          3d ago │
│    [Mark done]  [Update]        │
└─────────────────────────────────┘
```

### Swipe Card (Mobile)
```
┌─────────────────────────────────┐
│                                 │
│  [Full-bleed cover image]       │
│                                 │
│  ████████████████████           │
│                                 │
│  TSLA could 3x by 2026 if EV   │
│  adoption follows solar curve   │
│                                 │
│  Stock Opinion · 2 actions      │
│  ← dismiss          act →      │
└─────────────────────────────────┘
```

### Portfolio Holdings Row
```
RELIANCE      ₹2,847  ▲ 2.3%    +₹12,400
              Qty: 10  Avg: ₹2,630
```

---

## 9. PWA Configuration

```json
// public/manifest.json
{
  "name": "Alpha Brain",
  "short_name": "AlphaBrain",
  "theme_color": "#7C6FFF",
  "background_color": "#0A0A0F",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Offline strategy:**
- Home, Ideas feed, Idea detail: cache-first with background revalidation
- Market data, Portfolio: network-first (stale is misleading for prices)
- Idea creation form: available offline, sync when back online (IndexedDB queue)

---

## 10. Free Stock Market API Integration

> Handled in frontend as data sources for widgets. Backend team owns the integration; frontend consumes via REST endpoints.

| Data Needed | Free Source |
|------------|-------------|
| NSE stock quotes | NSE India unofficial API / Yahoo Finance |
| Top gainers/losers | NSE bhav copy (EOD) |
| Delivery % | NSE DRHP data |
| Index levels (NIFTY, MIDCAP, SMALLCAP) | NSE Index API |
| Historical OHLCV | Yahoo Finance (`yfinance`) |

All market data widgets accept a standard `DataFetcher` interface:

```ts
type MarketDataSource = {
  type: 'stock-quote' | 'index-level' | 'top-movers' | 'ohlcv-history'
  symbol?: string
  params?: Record<string, string>
}
```

---

## 11. Mock Data Strategy

During frontend development (before backend is ready):

- **MSW (Mock Service Worker)** intercepts all API calls in the browser
- Mock handlers live in `lib/mock/handlers.ts`
- Seed data covers: 3 categories, 10 ideas, 20 actions, sample portfolio, market snapshot
- Toggle mock mode via `NEXT_PUBLIC_USE_MOCK=true` in `.env.local`
- API client in `lib/api/` uses the same interface whether hitting mock or real backend

---

## 12. API Contract (Expected from Backend)

Frontend will consume these REST endpoints:

```
GET    /api/categories
POST   /api/categories

GET    /api/templates
GET    /api/templates/:id

GET    /api/ideas?category=&tag=&from=&to=&sort=
POST   /api/ideas
GET    /api/ideas/:id
PATCH  /api/ideas/:id

GET    /api/ideas/:id/actions
POST   /api/ideas/:id/actions
PATCH  /api/actions/:id
POST   /api/actions/:id/updates

GET    /api/ideas/:id/resources
POST   /api/ideas/:id/resources

GET    /api/portfolio
GET    /api/portfolio/virtual
POST   /api/portfolio/virtual
GET    /api/portfolio/virtual/:id

GET    /api/market/snapshot        # top gainers, losers, volume, delivery
GET    /api/market/index           # NIFTY 50, MIDCAP, SMALLCAP levels
```

---

## 13. Phased Build Plan

### Phase 1 — Foundation
- [ ] Next.js + Tailwind + shadcn/ui setup
- [ ] PWA manifest + next-pwa
- [ ] App shell: layout, sidebar (desktop), bottom nav (mobile)
- [ ] MSW mock setup with seed data
- [ ] Design tokens in Tailwind config

### Phase 2 — Idea OS Core
- [ ] `/ideas` feed with filters + search
- [ ] `/ideas/create` with dynamic template renderer
- [ ] `/ideas/[id]` detail: content, actions, resources, alerts
- [ ] Idea branching (versions)
- [ ] Action management (create, update, mark done)

### Phase 3 — Dashboard + Templates
- [ ] Template field library UI
- [ ] Category + template creation flow
- [ ] Dashboard page with widget renderer
- [ ] Widget: stats, action-list, resource-gallery

### Phase 4 — Finance Layer
- [ ] `/market` dashboard (gainers, losers, volume, delivery %)
- [ ] `/portfolio` actual holdings + timeline + index comparison
- [ ] `/portfolio/virtual` — create, manage, compare
- [ ] Stock-price widget, opinion-tracker widget, portfolio-returns widget

### Phase 5 — Mobile + Alerts
- [ ] `/swipe` — swipe deck with Framer Motion gestures
- [ ] Push notification setup (OneSignal)
- [ ] Alert creation UI (WhatsApp / push toggle)
- [ ] Offline support + sync queue for idea creation

---

## 14. Folder Naming Conventions

- Components: PascalCase (`IdeaCard.tsx`)
- Hooks: camelCase with `use` prefix (`useIdeas.ts`)
- Utilities: camelCase (`formatCurrency.ts`)
- API hooks: `use[Resource][Action]` (`useIdeasFetch`, `useIdeaCreate`)
- Mock handlers: `[resource].handlers.ts`
- Zustand stores: `use[Domain]Store.ts` (`useIdeaStore.ts`)
