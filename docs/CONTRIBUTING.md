# Contributing Guide

Thank you for contributing to Mindy Smart Closet! 👗

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/your-username/mindy-smart-closet.git
cd mindy-smart-closet
```

### 2. Install & Setup

```bash
pnpm install
cp .env.example .env.local
# Fill in your environment variables
pnpm dev
```

### 3. Create Feature Branch

```bash
git checkout -b feature/my-feature
# or: git checkout -b fix/my-bug
# or: git checkout -b docs/my-docs
```

---

## Code Style

### TypeScript

- **Strict mode:** Required (`tsconfig.json` has `strict: true`)
- **No `any`:** Always use proper types or `unknown` with type guards
- **Naming:** camelCase for variables/functions, PascalCase for components
- **Interfaces:** Prefer `interface` for object types, `type` for unions/primitives

```typescript
// ✅ Good
interface GarmentFilterProps {
  type: GarmentType;
  onFilter: (id: string) => void;
}

function GarmentFilter({ type, onFilter }: GarmentFilterProps) {
  // ...
}

// ❌ Bad
function GarmentFilter(props: any) {
  // ...
}
```

### React Components

- **Functional components only:** No class components
- **Single responsibility:** One feature per component
- **Props:** Use destructuring + TypeScript interfaces
- **Hooks:** Prefer custom hooks for logic extraction
- **No magic strings:** Use constants from `src/constants/`

```typescript
// ✅ Good
import { NOTIFICATION_DURATION_MS } from '@/constants/ui-config';

function Toast({ message }: { message: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // dismiss
    }, NOTIFICATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return <div>{message}</div>;
}

// ❌ Bad
function Toast({ message }: any) {
  setTimeout(() => { /* ... */ }, 3000); // Magic number!
  return <div>{message}</div>;
}
```

### CSS & SCSS

- **SCSS Modules** for component styles: `ComponentName.module.scss`
- **BEM naming** when applicable: `block__element--modifier`
- **Custom Properties** from tokens: `var(--color-primary-terracota)`
- **Mobile-first:** Media queries use `@media (min-width: ...)`

```scss
// ✅ Good
.card {
  display: grid;
  gap: var(--spacing-md);
  background: var(--color-surface);

  @media (min-width: var(--breakpoint-md)) {
    padding: var(--spacing-lg);
  }
}

.card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

// ❌ Bad
.card {
  padding: 16px;
  background: #f9f6f0;
}

.cardTitle {
  font-size: 18px;
  font-weight: 600;
}
```

### Imports & Modules

- **Use path aliases:** `@/components`, `@/lib`, `@/constants`
- **No barrel exports:** Import directly from module files
- **Group imports:** React → Next → packages → local

```typescript
// ✅ Good
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Swiper } from 'swiper/react';
import { useGarments } from '@/lib/hooks/useGarments';
import { GarmentCard } from '@/components/GarmentCard';

// ❌ Bad
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { GarmentCard } from '@/components'; // barrel!
```

---

## Testing

### Write Tests For

- ✅ Utility functions
- ✅ Custom hooks
- ✅ Business logic (AI parsing, weather rules)
- ✅ User workflows (auth, onboarding, generation)
- ✅ Critical paths (outfit generation, upload)

### Don't Over-Test

- ❌ Simple presentational components (if no logic)
- ❌ Next.js built-in functions (useRouter, etc)
- ❌ External library functions

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeColor } from '@/lib/utils/normalizeColor';

describe('normalizeColor', () => {
  describe('basic normalization', () => {
    it('should lowercase input', () => {
      expect(normalizeColor('RED')).toBe('red');
    });

    it('should trim whitespace', () => {
      expect(normalizeColor('  blue  ')).toBe('blue');
    });
  });

  describe('edge cases', () => {
    it('should throw on invalid color', () => {
      expect(() => normalizeColor('invalid')).toThrow(/Unknown color/);
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Garment Upload', () => {
  test.beforeEach(async ({ page, context }) => {
    // Auth setup (use storageState from auth.setup.ts)
    await context.addCookies([...storageState.cookies]);
    await page.goto('/es/closet');
  });

  test('should upload garment with metadata', async ({ page }) => {
    // 1. Click upload
    await page.click('button[aria-label="Subir prenda"]');

    // 2. Select image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/shirt.jpg');

    // 3. Wait for analysis
    await expect(page.getByRole('status')).toBeVisible();

    // 4. Verify garment added
    await expect(page.getByText(/polera/i)).toBeVisible();
  });
});
```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation
- **style:** Code style (formatting, missing semicolons)
- **refactor:** Code refactoring without feature change
- **perf:** Performance improvement
- **test:** Adding/updating tests
- **chore:** Dependencies, build setup

### Examples

```bash
git commit -m "feat(generator): add lock garment functionality"
git commit -m "fix(closet): handle image upload errors gracefully"
git commit -m "docs(readme): update quick start instructions"
git commit -m "perf(storage): optimize IndexedDB queries"
git commit -m "test(e2e): add laundry basket E2E test"
```

---

## Pull Request Process

### Before Opening PR

```bash
# 1. Update main branch
git fetch origin
git rebase origin/main

# 2. Run all checks
pnpm lint
pnpm typecheck
pnpm test --run
pnpm test:e2e --run
pnpm build

# 3. Ensure coverage threshold
pnpm test:coverage

# 4. Check bundle size
pnpm analyze
```

### PR Title & Description

**Title format:**
```
[Feature|Fix|Docs|Perf] Brief description (50 chars max)
```

**Description template:**
```markdown
## Description
What this PR does (1-2 sentences)

## Motivation
Why it's needed / which issue it fixes (#123)

## Changes
- ✨ Feature 1
- 🐛 Fixed bug 1
- 📊 Performance improvement 1

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
- [ ] Tests pass (90% threshold)
- [ ] No console errors/warnings
- [ ] Bundle size impact checked
```

### Example PR

```markdown
## [Feature] Generator: Add garment lock functionality

## Description
Allows users to lock a specific garment and have the AI regenerate other slots
to match it. Improves manual combination workflow.

## Motivation
Users requested ability to "fix" a garment they love and get AI suggestions
for the rest. Closes #234

## Changes
- ✨ Add `toggleLockGarment` action to generator store
- ✨ Add lock UI indicator + tap to lock gesture
- ✨ Modify recommender prompt to accept locked garments
- 🧪 Add E2E test for lock workflow
- 📊 No bundle impact (logic reuse)

## Testing
- [x] Unit tests for `toggleLockGarment` (100% coverage)
- [x] E2E: test lock/unlock/recombine flow
- [x] Manual: tested on Pixel 7 & desktop
- [x] No console errors

## Screenshots
[If UI changes]
Before: [screenshot]
After: [screenshot]
```

---

## Code Review

### What to Expect

- 👀 Code quality & consistency
- 🧪 Test coverage
- ♿ Accessibility (a11y)
- 📊 Performance impact
- 🔒 Security considerations

### Responding to Feedback

- 💬 Explain your reasoning if you disagree
- 🔄 Push new commits instead of force-pushing (keep history)
- ✅ Mark conversations as resolved once addressed
- 🙏 Thank reviewers for their time

---

## Development Tips

### Useful Commands

```bash
# Watch mode for development
pnpm dev

# Type check in watch mode
pnpm typecheck --watch

# Run specific test file
pnpm test lib/utils/normalizeGarment.test.ts

# Test with coverage
pnpm test:coverage

# Debug test in inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run tests/unit/...

# E2E UI mode (visual debugging)
pnpm test:e2e --ui

# Generate types from DB
supabase gen types --lang typescript > src/types/supabase.ts
```

### Local Supabase (Optional)

```bash
# Start local stack
supabase start

# Apply migrations
supabase migration up

# Stop local stack
supabase stop
```

### Debugging with VS Code

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js Debug",
      "type": "node",
      "request": "attach",
      "port": 9230,
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

Then run:
```bash
NODE_OPTIONS='--inspect' pnpm dev
```

---

## Documentation

### Update Docs When

- ✅ Adding new features (update SDD & relevant docs)
- ✅ Changing API contracts (update API.md)
- ✅ Modifying architecture (update ARCHITECTURE.md)
- ✅ Fixing bugs with workarounds (add note to README)

### Writing Style

- Clear & concise (prefer short sentences)
- Use examples when possible
- Target multiple skill levels
- Include links to related docs

---

## Questions?

- 💬 Open a Discussion on GitHub
- 📧 Email: equipo@mindy-closet.dev
- 🐛 Found a bug? Open an Issue with reproduction steps

---

## Code of Conduct

- ✅ Be respectful & inclusive
- ✅ Welcome new contributors
- ✅ Focus on code, not person
- ❌ No harassment, discrimination, or hate speech

Thank you for making Mindy better! 🙏
