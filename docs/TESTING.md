# Testing Strategy

## Overview

- **Unit Tests:** Vitest (90% coverage threshold)
- **E2E Tests:** Playwright (Pixel 7, es-ES locale)
- **Load Tests:** k6 (weather & recommender endpoints)
- **a11y Tests:** axe-core + @axe-core/playwright

---

## Unit Tests (Vitest)

### Coverage Threshold

```
Lines:       90%
Branches:    90%
Functions:   90%
Statements:  90%
```

### Running Tests

```bash
# Watch mode (development)
pnpm test

# Single run
pnpm test --run

# Coverage report
pnpm test:coverage
```

### Test Structure

```
tests/
├── unit/
│   ├── lib/
│   │   ├── ai/
│   │   │   └── engine.test.ts
│   │   ├── utils/
│   │   │   ├── normalizeGarment.test.ts
│   │   │   └── categorizeGarment.test.ts
│   │   └── db/
│   │       └── garments.test.ts
│   └── constants/
│       └── ai.test.ts
├── rls_isolation.sql          # Database RLS tests
└── seed.ts                     # Test data seeder
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeGarmentType } from '@/lib/utils/normalizeGarment';

describe('normalizeGarmentType', () => {
  it('should normalize "t-shirt" to "top"', () => {
    expect(normalizeGarmentType('t-shirt')).toBe('top');
  });

  it('should handle uppercase input', () => {
    expect(normalizeGarmentType('T-SHIRT')).toBe('top');
  });

  it('should throw for unknown types', () => {
    expect(() => normalizeGarmentType('xyz')).toThrow();
  });
});
```

---

## E2E Tests (Playwright)

### Configuration

```
Project: Pixel 7 (mobile)
Locale: es-ES
Browser: Chromium
Timeout: 30s per test
```

### Running Tests

```bash
# Headless (CI mode)
pnpm test:e2e

# UI mode (visual debugging)
pnpm test:e2e --ui

# Specific file
pnpm test:e2e auth.spec.ts

# Watch mode
pnpm test:e2e --watch
```

### Test Files

#### `auth.setup.ts` (Baseline)
```typescript
// Creates authenticated user session
// Used by other specs via: use: { storageState: ... }
// Exports: storageState.json
```

#### `onboarding.spec.ts`
```typescript
✅ Should complete 5-step wizard
✅ Should infer colorimetry from jewelry
✅ Should save profile data
✅ Should redirect to generator on success
```

#### `generator.spec.ts`
```typescript
✅ Should show zero state with weather
✅ Should select style and load looks
✅ Should swipe to dismiss and accept looks
✅ Should lock garments and recombine
✅ Should show celebration on wear
```

#### `closet.spec.ts`
```typescript
✅ Should upload garment with background removal
✅ Should search garments (case-insensitive, accents)
✅ Should filter by state (all/clean/dirty)
✅ Should edit garment tags
✅ Should delete garment
```

#### `laundry.spec.ts`
```typescript
✅ Should view dirty basket
✅ Should wash individual garment
✅ Should wash all garments
✅ Should exempt footwear from dirty marking
```

#### `offline.spec.ts`
```typescript
✅ Should work offline (cached data)
✅ Should show cached closet without internet
✅ Should queue requests and sync when online
```

#### `a11y.spec.ts` (WIP)
```typescript
⏳ Should pass axe accessibility checks
⏳ Should have visible focus indicators
⏳ Should support keyboard navigation
⏳ Should respect prefers-reduced-motion
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Generator Flow', () => {
  test('should complete outfit selection', async ({ page, context }) => {
    // 1. Start with authenticated session
    await context.addCookies([...storageState.cookies]);
    
    // 2. Navigate to generator
    await page.goto('/es/generator');
    
    // 3. Verify zero state
    await expect(page.getByRole('heading', { name: /clima/i })).toBeVisible();
    
    // 4. Select style
    await page.getByRole('button', { name: /casual/i }).click();
    
    // 5. Wait for loading
    await expect(page.getByRole('status', { name: /cargando/i })).toBeVisible();
    
    // 6. Verify showcase
    await expect(page.getByRole('status', { name: /look/i })).toBeVisible();
    
    // 7. Swipe right (wear today)
    await page.locator('[data-testid="showcase-card"]').swipe({ direction: 'right' });
    
    // 8. Verify celebration
    await expect(page.getByText(/felicidades/i)).toBeVisible();
  });
});
```

---

## Load Testing (k6)

### Weather Endpoint

**File:** `k6/k6-weather.js`

```javascript
// Ramp: 5 → 20 → 50 VUs
// Duration: 5min total
// Target: p50 <500ms, p95 <1500ms, errors <2%

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Ramp-up
    { duration: '3m', target: 20 },   // Sustained
    { duration: '1m', target: 50 },   // Spike
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500'],
    'http_req_failed': ['rate<0.02'],
  },
};
```

### Recommender Endpoint

**File:** `k6/k6-recommender.js`

```javascript
// Ramp: 1 → 5 → 10 VUs
// Duration: 5min total
// Target: p50 <3s, p95 <8s, errors <5%, fallback <30%

export const options = {
  stages: [
    { duration: '1m', target: 1 },
    { duration: '2m', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(50)<3000', 'p(95)<8000'],
    'http_req_failed': ['rate<0.05'],
    'http_req_duration{staticAsset:no,scenario:default}': ['p(99)<10000'],
  },
};
```

### Running Load Tests

```bash
# Weather test
k6 run k6/k6-weather.js

# Recommender test
k6 run k6/k6-recommender.js

# With custom environment
k6 run -e BASE_URL=https://mindy-closet.vercel.app k6/k6-weather.js
```

---

## Accessibility Testing

### axe-core Integration

```typescript
// In e2e/a11y.spec.ts
import { injectAxe, checkA11y } from 'axe-playwright';

test('should pass accessibility audit', async ({ page }) => {
  await page.goto('/es/generator');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true
    }
  });
});
```

### Manual Checklist (WCAG 2.2 AA)

- [ ] Visible focus indicators on all interactive elements
- [ ] Color contrast ratio ≥4.5:1 for normal text, ≥3:1 for large text
- [ ] Touch targets ≥44×44 CSS pixels
- [ ] Keyboard navigation works (Tab, Arrow, Enter, Esc)
- [ ] ARIA labels on non-semantic buttons
- [ ] Respects `prefers-reduced-motion`
- [ ] Form validation messages clear and associated
- [ ] Images have alt text (or `role="presentation"`)
- [ ] Headings in logical order (h1 → h2 → h3)
- [ ] Role, name, and state programmatically determinable

---

## Performance Baselines

**Recorded:** 2026-10-10

### API Endpoints

| Endpoint | Metric | Value | Status |
|---|---|---|---|
| `/api/weather` | p95 | 35ms | ✅ |
| `/api/recommender` | p95 | 41ms | ✅ |

### Bundle Size

```
Total (gzip):  <180KB  ✅
JS:            ~150KB
CSS:           ~15KB
Fonts:         ~15KB
```

### Lighthouse

```
Performance:   ≥90   ✅
Accessibility: ≥95   ✅
Best Practices: ≥90  ✅
SEO:           ≥90   ✅
```

### Test Coverage

```
Lines:      90%+ ✅
Branches:   90%+ ✅
Functions:  90%+ ✅
```

---

## CI/CD Gates (Local)

Before pushing, ensure all pass:

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript strict
pnpm test --run  # 90% coverage
pnpm test:e2e    # E2E specs
pnpm build       # Next.js build
pnpm analyze     # <180KB gzip
```

**GitHub Actions:** Not yet automated (planned for post-MVP)

---

## Debugging

### Vitest Debug

```bash
# Node inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Then open chrome://inspect in Chromium
```

### Playwright Debug

```bash
# Debug mode (step through)
pnpm test:e2e --debug

# Opens Playwright Inspector with timeline
# Use step buttons to advance through test
```

### k6 Real-time Dashboard

```bash
# Open k6 cloud dashboard (requires account)
k6 cloud k6/k6-weather.js
```

---

## Test Data & Seeding

### Database Seeding

```typescript
// supabase/seed.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, SERVICE_ROLE_KEY);

// Insert test user, profile, garments
await supabase.from('profiles').insert([...]);
await supabase.from('garments').insert([...]);
```

### E2E Setup

```typescript
// tests/e2e/auth.setup.ts
test('authenticate', async ({ page }) => {
  await page.goto('/es/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test123!@#');
  await page.click('button[type="submit"]');
  
  // Save session state
  await page.context().storageState({ path: 'storageState.json' });
});
```

---

## Maintenance

### When to Update Tests

- ✅ UI changes → Update E2E selectors
- ✅ API contract changes → Update mocks
- ✅ Performance regression → Adjust k6 thresholds
- ✅ New features → Add corresponding tests

### Test Reliability

- Use `data-testid` for selectors (more stable than text/role)
- Avoid hardcoded delays (use `waitFor` instead)
- Mock external APIs in unit tests
- Use fixtures for common setup (auth.setup.ts)

---

## Resources

- [Vitest Docs](https://vitest.dev)
- [Playwright Docs](https://playwright.dev)
- [k6 Docs](https://k6.io/docs)
- [axe-core](https://github.com/dequelabs/axe-core)
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
