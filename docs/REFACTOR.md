# Refactor Plan & Log

Living document for the structural refactor started after the SDD audit
(2026-10). It records the **decisions taken**, the **target conventions**
and a **log per phase**. Update it in the same change as the code of each
phase.

Rules of engagement: one branch per phase, one commit per phase, no commit
before review, docs updated every phase, `typecheck` + `eslint` + `vitest`
(coverage thresholds) + `pnpm build` green before handing a phase over.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Type source of truth | `as const` arrays live in `src/constants/`; types are derived from them (`(typeof X)[number]`). The `*_VALUES` arrays now in `types/garment.ts` move to `constants/`. |
| 2 | DB row types | Generate Supabase types and replace the hand-written `GarmentRow` / `ProfileRow` (row types only at first, not a fully typed client). |
| 3 | Domain logic in `constants/` | Moves to its feature (`features/profile/`): `profileValidation`, `inferColorimetry` and friends. `constants/` keeps only values. |
| 4 | Cross-feature coupling | Shared kernel for what several features need (garment taxonomy + laundry predicates, notification store, query keys in `constants/query.ts`) plus an ESLint rule forbidding feature-to-feature imports. |
| 5 | Server Actions | Colocated with their route or feature (`actions.ts`); `src/actions/` is removed. |
| 6 | Onboarding wizard | Moves from `app/.../profile/onboarding/` to `features/onboarding/`. |
| 7 | CSS naming | BEM everywhere (`block__element--modifier`, kebab-case blocks). |
| 8 | Shared CSS | Semantic global classes (`.pill`, `.surface-card`, `.dialog-shell__*`, ...), used in the markup. No atomic utilities (`.flex`, `.gap-*`) and no mixins. |
| 9 | Dialogs | A compound `Dialog` component (focus trap, Escape, `aria-modal`) replaces the three hand-wired dialogs. |
| 10 | User-facing errors | Hooks throw stable error codes; the UI translates them with next-intl (planned, Phase 6). |
| 11 | `constants/index.ts` | Deleted (no consumers, contradicts the no-barrel rule) and removed from AGENTS.md. |
| 12 | `*.branch.test.*` | Merged into one `X.test.*` per module, grouped by behavior; done when a file is touched or in Phase 6, never at the cost of coverage. |

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Bug fixes + leftovers of the earlier cleanup | Done, pending review |
| 1 | Types: `src/types/*`, single source for unions, strict types | Pending |
| 2 | Helpers: route guards, session, readers, laundry predicates, geo, dates | Pending |
| 3 | Components: `QueryState`, `GarmentImage`, `FormField`/`SubmitButton`, `AuthCard`, `Dialog` | Pending |
| 4 | CSS: global semantic classes, dead mixin/keyframe removal, tokens, hard-coded values | Pending |
| 5 | Layers: query keys, shared kernel, wizard move, split large files | Pending |
| 6 | Docs sync (SDD + ARCHITECTURE), i18n error codes, test naming | Pending |

## Log

### Phase 0
- **Bug:** three animations never ran in production. CSS Modules hash the
  `animation-name`, but the keyframes were global, so the compiled CSS
  referenced names that were never defined: the `Button` loading spinner and
  the `NotificationBubble` enter/exit toasts. Fixed by declaring each
  `@keyframes` in the module that uses it. Verified by scanning the compiled
  CSS: no animation without a matching `@keyframes`.
- `styles/components/_auth-form.scss` is now a global BEM shell
  (`.auth-form__*`) applied in markup, like `_dialog-shell.scss`. Before it was
  `@use`d from two modules, which emitted the same CSS twice.
- Restored the login title's `margin-top: 0.5rem`, lost when it was merged with
  the password pages' title in the earlier cleanup.
- Generator types de-duplicated: `RecommenderOption` / `RecommenderResponse`
  are declared only in `generatorApi.ts`; `Category`, `LookStyle` and `AiLook`
  only in `useGeneratorStore.ts`; no inline `import()` types.
