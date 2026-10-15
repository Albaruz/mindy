# Architecture

## Design Principles

- **Feature-Driven:** Organized by business domains (generator, closet, profile, onboarding)
- **Type-Safe:** 100% TypeScript strict mode, no any
- **No Magic Strings:** All constants centralized in `src/constants/`
- **Functional:** Functional components, hooks-based, pure functions
- **Offline-First:** TanStack Query + IndexedDB persistence
- **Decoupled AI:** Prompts separated from logic, versioned (`*.v1.ts`)

---

## Folder Structure

```
src/
├── app/[locale]/
│   ├── (auth)/                  # Login, register, auth callbacks
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── auth/callback/route.ts
│   ├── onboarding/              # Route entry point (wizard lives in features/)
│   ├── generator/               # AI outfit generation (home)
│   │   └── page.tsx             # Machine: zero → auto → loading → showcase → manual
│   ├── closet/                  # Digital wardrobe
│   │   └── page.tsx             # Grid + search + filters
│   ├── calendar/                # Outfit history
│   │   └── page.tsx             # Monthly grouped history
│   ├── profile/                 # Profile + settings
│   │   └── page.tsx             # User data + laundry basket
│   ├── api/
│   │   ├── weather/route.ts      # GET ?lat&lon → OpenWeather
│   │   ├── recommender/route.ts  # POST outfit recommendations
│   │   └── analyze/route.ts      # POST image analysis (vision)
│   ├── layout.tsx               # Root layout
│   └── globals.scss             # Global styles
│
├── features/                    # Business domains (isolated: see "Layering rules" below)
│   ├── generator/               # Outfit generation: store, hooks, carousels, showcase, celebration
│   ├── closet/                  # Wardrobe: queries/mutations, upload pipeline, inventory + laundry hooks
│   │   ├── useClosetInventory.ts     # Search / category / clean-vs-laundry view state
│   │   ├── useLaundryActions.ts      # Optimistic wash + wash-all celebration
│   │   ├── useGarmentDeletion.ts     # Confirm-then-delete flow
│   │   ├── GarmentSourcePicker.tsx   # Add button + camera/gallery sheet
│   │   └── garmentOptions.ts         # Closet UI data (swatches, form option lists)
│   ├── profile/                 # Profile, laundry basket, colorimetry UI
│   ├── history/                 # Outfit history (calendar)
│   ├── onboarding/              # 5-step wizard (OnboardingWizard + steps/), store, inference
│   └── settings/                # Theme store + settings controls
│
├── stores/                      # Cross-cutting Zustand stores (notifications)
│
├── components/                  # Feature-agnostic UI kit (never imports features/)
│   ├── Dialog/                  # Compound modal (focus trap, ARIA); ConfirmDialog builds on it
│   ├── GarmentImage/  QueryState/  AuthCard/  FormField/  SubmitButton/
│   └── Button/  EmptyState/  OptionPills/  ColorSwatches/  SegmentedControl/  ...
│
├── lib/                         # Shared logic (never imports features/)
│   ├── ai/                      # Groq engine + versioned prompts (prompts/system/*.v1.ts)
│   ├── api/routeGuards.ts       # Auth + rate limit + JSON body guards for Route Handlers
│   ├── garment/                 # Shared garment kernel
│   │   ├── normalizers.ts       #   free/AI text -> closed vocabularies
│   │   ├── categorizeGarments.ts#   category rules + laundry predicates
│   │   └── garmentMappers.ts    #   DB row <-> Garment
│   ├── recommender/             # Server-side recommender rules used by api/recommender/route.ts
│   │   └── request | styleFilter | weatherRules | pool | fallback | llmOptions | types
│   ├── supabase/                # Clients, cookies, middleware, session helpers
│   ├── readers.ts  geolocation.ts  taxonomy.ts  logger.ts  rateLimit.ts  useDialogFocus.ts  ...
├── constants/                   # SSOT: values only (closed vocabularies as `as const` arrays)
│   ├── ai.ts                   # AI-related (prompts config, timeouts)
│   ├── api.ts                  # API rate limits, timeouts
│   ├── weather.ts              # Weather thresholds (HEAT, COLD, RAIN)
│   ├── generator.ts            # Generator constants (MAX_DISCARD_COUNT, etc)
│   ├── garment.ts              # Garment tag vocabularies (GARMENT_*_VALUES)
│   ├── profile.ts              # Profile enums (COLORIMETRIES, MORPHOLOGIES, ...) + inference
│   ├── ui-config.ts            # UI constants (SHOP_SECTIONS, STYLE_TRIBES, TOTAL_STEPS, ...)
│   ├── validation.ts           # Input validation rules
│   ├── animations.ts           # Animation durations, easings
│   ├── query.ts                # TanStack Query config
│   ├── geo.ts                  # Geolocation settings
│   └── storage.ts              # LocalStorage & IndexedDB keys
│
├── types/                       # Shared TypeScript types (derived from constants where possible)
│   ├── garment.ts              # Garment, GarmentType, ... (unions derived from constants/garment)
│   ├── user.ts                 # UserProfile, Colorimetry, ... (unions derived from constants/profile)
│   ├── history.ts
│   ├── weather.ts              # WeatherInfo
│   └── ui.ts                   # ThemeMode, NotificationType, CategoryFilter
│
└── styles/
    ├── tokens/                  # JSON definitions (generated from here)
    │   ├── colors.json
    │   ├── spacing.json
    │   ├── typography.json
    │   ├── radius.json
    │   ├── shadows.json
    │   ├── breakpoints.json
    │   ├── zIndex.json
    │   ├── durations.json
    │   ├── easings.json
    │   ├── touchTargets.json
    │   └── layout.json
    ├── core/
    │   ├── _tokens.scss         # Auto-generated from JSON (pnpm tokens:build)
    │   ├── _variables.scss      # Semantic aliases + light/dark palettes
    │   ├── _mixins.scss         # Few mixins, used only by base/ and layout/
    │   └── _animations.scss     # Global keyframes (fade-in, scale-in, spin) + .spin
    ├── base/
    │   ├── _reset.scss
    │   ├── _typography.scss
    │   └── _global.scss
    ├── layout/
    │   └── _skip-link.scss
    └── components/              # GLOBAL shells used directly in markup (BEM)
        ├── _dialog-shell.scss   # .dialog-shell__* (ConfirmDialog, GarmentFormModal, PhotoQualityDialog)
        ├── _auth-form.scss      # .auth-form__*   (login, forgot/reset password)
        └── _visually-hidden.scss # .visually-hidden (custom inputs, hidden legends)
```

Component styles live next to their component as `Component.module.scss`
(CSS Modules). Structure shared by several components is **not** duplicated
or injected with mixins: it is a global BEM class applied in the markup
next to the component's own module class (see `docs/REFACTOR.md`).

### Layering rules

- A feature may not import another feature. Shared domain logic belongs in
  `lib/`, shared state in `stores/`, and shared values in `constants/`.
- The only intentional feature-to-feature exceptions are the data hooks
  `useClosetQuery`, `useProfileQuery`, and `useDoLaundry`.
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
garment_type, style, cut_length, color, material, season
is_dirty (default false)
is_external_garment (for starter wardrobe)
last_worn_date
extra_tags (jsonb: {aiCategory, specificType, colorShade, ...})
```

### Outfit History
```sql
look_id (PK, uuid)
user_id (FK) → profiles
garment_ids (uuid[])
worn_date, created_at
```

### Garment Feedback
```sql
feedback_id (PK, uuid)
user_id (FK) → profiles
garment_id (FK) → garments
signal (enum: 'dismissed')
created_at
```

[Full SDD →](../Software%20Design%20Document%20(SDD)%20-%20App%20de%20Moda%20Inteligente.md#4-estructura-de-datos-postgresql-snake_case-inglés)

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
// Example: useGarmentsQuery
{
  queryKey: ['garments', userId],
  queryFn: () => fetchGarments(userId),
  staleTime: 30 * 1000,           // 30s
  gcTime: 24 * 60 * 60 * 1000,    // 24h (formerly cacheTime)
  refetchOnFocus: false,
  networkMode: 'offlineFirst'     // Retry offline data first
}
```

---

## AI & LLM Integration

### Decoupled Architecture

**Prompts** (`src/lib/ai/prompts/system/*.v1.ts`)
- Pure functions returning strings
- No dependencies on state/context
- Versioned (e.g., `garmentAnalysis.v1.ts`)
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
engine.ts: Prepare context
    ├→ Fetch user profile
    ├→ Fetch clean garments
    ├→ Apply weather rules (e.g., no winter in hot weather)
    └→ Apply style filter
    ↓
Groq API: lookRecommender.v1 prompt
    ├→ Input: profile, outfit slots, options
    └→ Output: 3 outfit combinations with suitability ratio
    ↓
Parse & validate JSON
    ↓
Fallback (if Groq fails):
    └→ Rule-based selection with static ratios [60, 55, 50]
    ↓
Return outfit + metadata (model, fallback, optionsCount)
    ↓
Client: TanStack Query caches result
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/weather` | GET | Current weather + 8-day forecast |
| `/api/recommender` | POST | Generate outfit combinations |
| `/api/analyze` | POST | Analyze garment from image |

[Full API reference →](./API.md)

---

## Offline Architecture

### Service Worker (next-pwa)

- Workbox integration
- CacheFirst strategy for Storage images
- Registered in `next.config.js`

### IndexedDB (TanStack Query)

- Persisted cache: `mindy-query-cache`
- Auto-synced when back online
- 24h expiration

### Local Storage

- Theme preference: `mindy-theme-mode`
- Locale: `NEXT_LOCALE`

---

## Performance Optimizations

- **Code Splitting:** `next/dynamic` for heavy components (bg-removal, carousels)
- **Image Optimization:** `next/image` for garment photos
- **Bundle Size:** <180KB gzip target with @next/bundle-analyzer
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

