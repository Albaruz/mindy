# Architecture

## Design Principles

- **Feature-Driven:** Organized by business domains (generator, closet, profile, onboarding)
- **Type-Safe:** 100% TypeScript strict mode, no any
- **No Magic Strings:** All constants centralized in `src/constants/`
- **Functional:** Functional components, hooks-based, pure functions
- **Offline-First:** TanStack Query + IndexedDB persistence
- **Decoupled AI:** Prompts separated from logic and versioned (`*.vN.ts`)

---

## Folder Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/page.tsx       # Localized sign-in and registration
│   │   ├── (app)/                # Authenticated application shell
│   │   │   ├── calendar/page.tsx
│   │   │   ├── closet/page.tsx
│   │   │   ├── generator/page.tsx
│   │   │   ├── profile/          # Profile and profile/onboarding routes
│   │   │   └── settings/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── layout.tsx
│   │   └── error.tsx
│   ├── api/                      # Route Handlers are not locale-prefixed
│   │   ├── analyze/route.ts
│   │   ├── favorites/route.ts
│   │   ├── garments/[id]/favorite/route.ts
│   │   ├── recommender/route.ts
│   │   └── weather/route.ts
│   ├── auth/callback/route.ts
│   ├── global-error.tsx
│   ├── layout.tsx
│   └── providers.tsx
├── proxy.ts                      # Next.js request proxy and locale/auth routing
├── i18n/                         # Locale routing, request config, navigation
├── features/                     # Isolated business domains
│   ├── generator/                # API, recommendation domain, hooks, state, views
│   ├── closet/                   # Garments, upload queue, inventory, image services
│   ├── profile/                  # Profile domain and profile query
│   ├── history/                  # Calendar history query and card
│   ├── onboarding/                # Wizard, inference and state
│   └── settings/                  # Theme and settings controls
├── stores/                       # Cross-cutting Zustand stores
├── components/                   # Feature-agnostic UI kit
├── lib/                           # Shared logic; never imports from features/
│   ├── ai/                        # Groq engine and versioned prompts
│   ├── api/routeGuards.ts         # Auth, quota and JSON-body guards
│   ├── garment/                   # Garment mapping, predicates and shared mutations
│   ├── recommender/               # Request parsing, rules, recovery and finalization
│   └── supabase/                  # Client/server clients, cookies and sessions
├── constants/                     # Centralized values and closed vocabularies
├── types/                         # Shared TypeScript types
└── styles/                        # JSON tokens, global SCSS and component modules

messages/                          # English and Spanish next-intl dictionaries
supabase/                          # Migrations, seed data and SQL tests
.github/workflows/test.yml         # Unit, build, E2E, Lighthouse and RLS CI
```

Feature directories use kebab-case. Each component and view owns a folder for
its implementation, styles, tests, and private helpers. Hooks, domain modules,
stores, and API clients are grouped by responsibility; their tests remain next
to the implementation. Component styles use `Component.module.scss` (CSS Modules).
This keeps ownership clear while folders group files by responsibility. Structure shared
by several components is **not** duplicated or injected with mixins: it is a
global BEM class applied in the markup next to the component's own module class
(see `docs/REFACTOR.md`).

### Layering rules

- A feature may not import another feature. Shared domain logic belongs in
  `lib/`, shared state in `stores/`, and shared values in `constants/`.
- The only intentional feature-to-feature exceptions are the data hooks
  `useClosetQuery`, `useFavoritesQuery`, and `useProfileQuery`. Laundry mutations
  live in the shared `lib/garment` layer; there is no profile laundry hook or
  duplicate laundry-basket query.
- `components/`, `lib/`, and `stores/` never import from `features/`.
- ESLint enforces these boundaries with `no-restricted-imports`.

---

## Data Flow

```
User Interaction
    ↓
React Component (Zustand store update)
    ↓
TanStack Query (cache check)
    ├→ Cache hit: Return cached data
    └→ Cache miss: Fetch
        ↓
        Route Handler (Next.js API)
        ├→ Business logic (climate rules, style filters)
        ├→ External API call (Groq, OpenWeather)
        └→ Return JSON
    ↓
Persisted to IndexedDB (TanStack Query)
    ↓
Component renders with new data
    ↓
Service Worker caches if needed
```

---

## Database Schema

### Profiles
```sql
user_id (PK) → auth.users
skin_tone, eye_color, hair_color
chest_cm, waist_cm, hip_cm
colorimetry (spring/summer/autumn/winter)
morphology, preferred_fit, lifestyle
extra_preferences (jsonb)
```

### Garments
```sql
garment_id (PK, uuid)
user_id (FK) → profiles
image_url (Supabase Storage)
original_image_url (Supabase Storage, preserved source photo)
garment_type, style, cut_length, color, material, season
styles (text[]), cut_lengths (text[])
is_dirty (default false)
is_external_garment (for starter wardrobe)
last_worn_date
extra_tags (jsonb: {aiCategory, specificType, colorShade, ...})
is_favorite (default false)
created_at
```

`image_url` is the image currently displayed in the closet. `original_image_url`
stores the uploaded source image. A background-removal operation updates only
`image_url`; replacing the image updates both URLs. Existing rows are backfilled
from `image_url` by migration `20261018215904_add_garment_original_image`.

### Outfit History
```sql
look_id (PK, uuid)
user_id (FK) → profiles
garment_ids (uuid[])
worn_date, created_at
is_planned (boolean, default false)
planned_date (date, null for worn looks)
```

Planned entries must keep `is_planned = (planned_date IS NOT NULL)`. A partial
unique index on `(user_id, planned_date) WHERE is_planned` enforces one
replaceable plan per user and day. The `record_planned_outfit` RPC validates
garment ownership and performs the upsert against that partial index.

### Garment Feedback
```sql
feedback_id (PK, uuid)
user_id (FK) → profiles
garment_id (FK) → garments
signal (text check: 'dismissed')
created_at
```

`garment_feedback` has indexes on `user_id` and `garment_id`; foreign-key
columns are indexed to keep joins and cascade deletes bounded.

[Full SDD →](../.specs/Software%20Design%20Document%20%28SDD%29%20-%20App%20de%20Moda%20Inteligente.md)

---

## State Management

### Zustand Stores

**useGeneratorStore**
```typescript
// Machine states: zero | auto-select | loading | showcase | manual
state, setState, resetFlow, resetCanvas, unlockAll
lockGarmentIds, dismissedGarmentIds, fixedGarments
aiLooks, activeLookIndex
```

**useNotificationStore**
```typescript
notifications: Array<{id, message, type, duration}>
addNotification(message, type='info', duration=NOTIFICATION_DURATION_MS)
removeNotification(id)
// Auto-dismiss after duration
```

**themeStore**
```typescript
theme: 'system' | 'light' | 'dark'
setTheme(theme)
// Stored in localStorage: mindy-theme-mode
```

**onboardingStore**
```typescript
currentStep: 1-5
profileData: {identity, morphology, colorimetry, fineTuning}
setStep, updateProfile, completeOnboarding
```

### TanStack Query

Persistence: `mindy-query-cache` in IndexedDB

```typescript
// Example: useClosetQuery
{
  queryKey: QUERY_KEYS.garments,
  staleTime: ENTITY_STALE_TIME_MS,
  gcTime: ENTITY_GC_TIME_MS, // at least the 24h persistence max age
  refetchOnWindowFocus: QUERY_REFETCH_ON_FOCUS,
  networkMode: QUERY_NETWORK_MODE
}
```

The persisted cache uses `QUERY_PERSIST_MAX_AGE_MS` and a buster set to the
public build identifier, so deployments discard data serialized by older code.

---

## AI & LLM Integration

### Decoupled Architecture

**Prompts** (`src/lib/ai/prompts/system/*.v1.ts`)
- Pure functions returning strings
- No dependencies on state/context
- Versioned (currently `outfitStylist.v3.ts` and `garmentAnalysis.v2.ts`)
- Easy to test and iterate

**Engine** (`src/lib/ai/engine.ts`)
- Groq SDK wrapper
- JSON parsing + validation
- Retry logic with exponential backoff
- Timeout handling

**Route Handlers** (`src/app/api/recommender/route.ts`)
- HTTP layer
- Business rules (climate, style filters)
- Fallback logic
- Error handling

### Flow Example: Outfit Generation

```
POST /api/recommender
    ↓
Route guard: authenticate, consume per-user quota, validate JSON
    ↓
Normalize candidates from the request
    ├→ Apply heat, rain, feedback, and style rules
    └→ Balance the candidate pool and preserve pinned garments
    ↓
Groq structured output (JSON fallback if needed)
    ↓
Parse, validate, and repair model options
    ↓
Shared finalization: weather, variety, completion, favorites, layering
    ↓
Local deterministic fallback (if the upstream model fails)
    ↓
Return JSON or the same completed payload as an SSE event
    ↓
Client generation hooks consume the recommendation
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/weather` | GET | Current weather plus today/tomorrow summaries |
| `/api/recommender` | POST | Generate outfit combinations |
| `/api/analyze` | POST | Analyze garment from image |
| `/api/favorites` | GET | List the signed-in user's favorites |
| `/api/garments/[id]/favorite` | PATCH | Set one garment's favorite state |

[Full API reference →](./API.md)

---

## Offline Architecture

### Service Worker (next-pwa)

- Workbox integration
- CacheFirst strategy for Storage images
- Registered in `next.config.js`

### IndexedDB (TanStack Query)

- Persisted cache: `mindy-query-cache` in IndexedDB
- Cache buster: public build version; a new build discards stale client state
- Entity `gcTime` is at least the 24h persister max age
- Successful queries only; errors and mutations are not persisted

### Local Storage

- Theme preference: `mindy-theme-mode`
- Locale: `NEXT_LOCALE`

---

## Performance Optimizations

- **Code Splitting:** `next/dynamic` for heavy components (bg-removal, carousels)
- **Image Optimization:** `next/image` for garment photos
- **Bundle Size:** <180KB gzip first-load shared JS, enforced by `pnpm budget`
  (`scripts/check-bundle-budget.mjs`, CI gate after `pnpm build --webpack`).
  Current: ~140KB. Interactive treemap via `pnpm analyze` (`ANALYZE=true`).
- **CSS Tokens:** Auto-generated from JSON, zero runtime overhead
- **Service Worker:** CacheFirst for Storage (200 entries, 30 days)
- **Lazy Loading:** Images with IntersectionObserver

---

## Security Layers

1. **Authentication:** Supabase SSR with required login
2. **Authorization:** RLS on all tables + Storage policies
3. **API Keys:** Hidden in Route Handlers (never in client)
4. **Rate Limiting:** Enforced per endpoint
5. **Input Validation:** TypeScript + runtime checks
6. **Headers:** HSTS, CSP, X-Frame-Options, nosniff

---

## Testing Strategy

- **Unit:** Vitest (90% threshold)
- **E2E:** Playwright (Pixel 7, es-ES locale)
- **Load:** k6 (weather & recommender)
- **a11y:** axe-core + @axe-core/playwright

[Testing details →](./TESTING.md)

---

## Error Boundaries

- **Per feature:** `src/app/[locale]/(app)/{generator,closet,calendar,profile,settings}/error.tsx`
  (thin wrappers, one line each)
- **Locale fallback:** `src/app/[locale]/error.tsx` (auth + public pages)
- **Last resort:** `src/app/global-error.tsx` (own `<html>/<body>`, inline
  bilingual copy — no providers available at that level)
- **Shared UI:** `src/components/FeatureError/` — `FeatureError` (alert +
  retry + home link) and the `makeRouteError(route)` factory, which logs to
  Vercel Logs with its route name via `@/lib/logger` before rendering.
- Copy lives in the `Errors` namespace (`messages/*.json`); retry reuses
  `Common.retry`.

