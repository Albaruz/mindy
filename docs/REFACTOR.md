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
| 1 | Types: `src/types/*`, single source for unions, strict types | Done, pending review |
| 2 | Helpers: route guards, session, readers, laundry predicates, geo | Done, pending review |
| 3 | Components: `QueryState`, `GarmentImage`, `FormField`/`SubmitButton`, `AuthCard`, `Dialog` | Done, pending review |
| 4 | CSS: global semantic classes, dead mixin/keyframe removal, tokens, hard-coded values | Done, pending review |
| 5 | Layers: query keys, shared kernel, wizard move, split large files | Done, pending review |
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

### Phase 1
- Closed vocabularies are s const arrays in constants/ (garment.ts,
  profile.ts, ui-config.ts); 	ypes/ derives unions from them.
- Merged duplicated interfaces (WizardPayload, RecommenderProfile,
  Climate, ClimateInput); added 	ypes/weather.ts and 	ypes/ui.ts.
- Deleted the unused constants/index.ts barrel.

### Phase 2
- `lib/api/routeGuards.ts`: equireRouteUser, ateLimitResponse,
  eadJsonBody. nalyze, ecommender and weather use them instead of
  three copies of the auth + quota + JSON boilerplate.
- `lib/supabase/session.ts`: getSessionUser / equireUser replace the
  uth.getUser() + "no session" block in 11 client hooks.
- `lib/readers.ts`: isRecord, eadString, eadFiniteNumber replace
  six local payload readers.
- `lib/geolocation.ts`: one getCurrentPosition() wrapper (was in
  useWeatherQuery and useGenerateLooks).
- `categorizeGarments.ts`: isWearableGarment, isInLaundryGarment,
  isWashableGarment replace eight inline isDirty / exemption filters.
- Not done (left out on purpose): date formatting helpers (only two call
  sites, not worth an abstraction) and the Server Actions auth pattern
  (differs per action: redirect vs. error object).

### Phase 3
- `components/Dialog`: compound `Dialog` (+ `DialogHeader`, `DialogTitle`,
  `DialogClose`, `DialogBody`, `DialogMessage`, `DialogFooter`,
  `DialogActions`). The root owns overlay, ARIA and focus handling
  (`useDialogFocus`); parts apply the global `dialog-shell__*` classes.
  `ConfirmDialog`, `PhotoQualityDialog` and `GarmentFormModal` use it.
  The close button label of `GarmentFormModal` was a hardcoded Spanish
  "Cerrar"; it is now `Closet.form.close` (en/es).
  Left as is: `OutfitCelebrationScreen` (full-screen animated layout, not
  the dialog shell) and the closet add-garment bottom sheet.
- `components/GarmentImage`: photo-or-placeholder for garments; replaces
  four raw `<img>` in `GarmentCard`, `ShowcaseCard`, `HistoryCard` and
  `OutfitCelebrationScreen`. The only lint exception for garment photos
  lives there (Supabase URLs have no `next/image` loader; a native `img`
  keeps PWA runtime caching intact). The blob-URL preview in
  `GarmentFormModal` has its own documented exception. ESLint is now at
  0 warnings.
- `components/QueryState`: pending -> error with retry -> content, used by
  the closet and calendar pages.
- `components/AuthCard`, `FormField`, `SubmitButton`: shared shell,
  labelled field and pending submit of the login and password-recovery pages.
  Behavior change: the login submit now also shows the spinner while pending
  (before only the recovery pages did). The spinner CSS moved to
  `SubmitButton.module.scss` with its own keyframes.
- Not done: `ChoiceGroup` (pills/swatches/segmented). It was not read in
  depth during the audit, so it needs its own look before deciding.

### Phase 4
- Global classes used in markup: `.visually-hidden` (`styles/components/_visually-hidden.scss`)
  replaces the hand-written hidden radio inputs (OptionPills, ColorSwatches,
  GarmentFormModal, onboarding steps), the hidden legend and two
  screen-reader-only spans. Each module keeps only its own `:focus-visible`
  ring. `.spin` (in `core/_animations.scss`) replaces the duplicated spinner
  rotation in ProcessingOverlay and SubmitButton. The TopNavigation label
  stays local: it is hidden by a container query, not always.
- `core/_animations.scss` shrank from 234 to ~30 lines: only `fade-in`,
  `scale-in` and `spin` remain, because only global CSS references them.
  Thirteen unused keyframes, the animation/transition mixins and the dead
  `.animate-*` classes are gone. `core/_mixins.scss` keeps only the mixins
  the global base styles still include (respond-*, container, touch-target,
  visually-hidden and friends were unused). `core/_typography.scss` was
  imported by nobody and is deleted.
- Removed per-component `@media (prefers-reduced-motion)` blocks that only
  set `animation: none` / `transition: none`: `base/_reset.scss` already
  clamps every animation and transition globally. Blocks that do more
  (hide confetti, reset hover transforms) stay.
- Removed the `:root[data-theme="light"]` block in `_variables.scss`: a
  hand-copied duplicate of the tokens. The dark rule already excludes
  `[data-theme="light"]`, so `:root` supplies the light values.
- Dropped 47 dead `var(--color-x, #hex)` fallbacks (the tokens are always
  defined; the fallbacks also disagreed with each other), used the
  `--radius-pill` token for `999px` and the focus-ring tokens for the
  repeated `outline: 2px solid var(--color-accent)`.
- Dead code: unused `.radio` in settings, `.spinning` in the generator page.
- Behavior notes: the SubmitButton spinner now turns at 1s (was 0.8s).
- Not done, with reason: a shared error-message box (only 4 uses, each with
  its own spacing), a `.surface-card` class (the card variants differ in
  radius, shadow and padding), and replacing the remaining raw hex values
  (confetti colors, the onboarding gradient and the ProcessingOverlay text,
  which deliberately stays light in dark mode). Moving the 188 loose `rem`
  values in the app pages to `--space-*` is a visual-regression risk without
  snapshots; it needs the Playwright baselines first.

### Phase 5
- Query keys: the hooks no longer export `*_QUERY_KEY`; everybody uses
  `QUERY_KEYS` from `constants/query.ts`. The `5 * 60 * 1000` / `10 * 60 * 1000`
  literals of four hooks are now `ENTITY_STALE_TIME_MS` / `ENTITY_GC_TIME_MS`.
- Shared kernel: `lib/garment/` (`normalizers`, `categorizeGarments`,
  `garmentMappers`) replaces files that lived in `closet` and `generator` and
  were imported by `profile`, `history` and the recommender route.
  `garmentOptions` keeps only closet UI data. `Category` moved to
  `types/garment.ts`. The notification store moved from `features/ui` to
  `stores/`; `components/Notification` no longer imports a feature.
- Cross-feature imports went from 17 to 3, all data hooks.
- ESLint now enforces the layering (`no-restricted-imports`): no feature-to-
  feature imports except `useClosetQuery`, `useProfileQuery`, `useDoLaundry`;
  `components/`, `lib/` and `stores/` cannot import features. Verified with
  throwaway violating files.
- The onboarding wizard moved from `app/.../profile/onboarding/` to
  `features/onboarding/` (the route keeps a thin `page.tsx`).
- `api/recommender/route.ts` went from 938 to 320 lines: request readers,
  style filter, weather rules, pool balancing, local fallback and LLM-option
  parsing now live in `lib/recommender/` (code moved verbatim, magic numbers
  to `constants/generator.ts`). The existing route tests pass unchanged.
- `closet/page.tsx` went from 525 to 274 lines: `useClosetInventory`,
  `useLaundryActions`, `useGarmentDeletion` and `GarmentSourcePicker` (add
  button + source sheet). They have their own unit tests (the page had none;
  pages are covered by Playwright). The source sheet now uses the shared
  `useDialogFocus` instead of its own focus trap, so it also locks page scroll.
- Not done: `useGeneratorStore` (314 lines) and `Home.tsx` were not split;
  the Server Actions location (decision 5) and the Supabase generated types
  (decision 2) stay open. `profileValidation` / `inferColorimetry` are still in
  `constants/`: moving them is a pure rename with a wide blast radius and no
  structural payoff now that features no longer import each other.

### ChoiceGroup analysis (Phase 3 leftover)
Six hand-written choice pickers were compared. Result:
- **Merged into `OptionPills`:** the season picker of `GarmentFormModal` was a
  copy of the pill markup + styles with an icon. `OptionPills` now accepts
  `renderIcon`; the modal uses it and lost ~45 lines of TSX and SCSS. The
  season legend now matches the other fields of the form.
- **Merged into `SegmentedControl`:** the language and theme switches of
  `SettingsControls` re-implemented it (button + `aria-pressed`, track, accent
  active segment). `SegmentedControl` options accept an `icon`; ~70 lines of
  settings SCSS are gone. Visual drift to review: track background is the
  surface color (was canvas) and the label font is the small size.
- **New `RadioSegments`:** the two large equal-width radio questions of the
  onboarding (shop section, fit) were duplicated markup. One component now
  owns them (radio semantics, filled selection, 3.5rem touch target).
- **`ColorSwatches` gained a multiple mode:** the onboarding veto circles
  (forbidden colors) were a copy with checkboxes. `ColorSwatches` is now a
  discriminated union: single (radios, `value`/`onSelect`, default) or
  `multiple` (checkboxes, `values`/`onToggle`), plus `tone="danger"` and
  `hideNames`. The veto cross (non-color cue) moved into the danger tone. About
  60 lines of onboarding SCSS and markup are gone. Visual drift to review:
  the dot border is 1px (was 2px) and the selected veto no longer scales up.
- **Deliberately not merged:** the editorial style cards are a unique layout
  animated by Framer Motion.
- Not a single generic `ChoiceGroup`: the remaining components differ in
  semantics (radio vs `aria-pressed` buttons), layout (wrap vs stretch) and
  selected style (outline vs fill), so one component would need several
  variant props. Each stays small and documents when to use it.