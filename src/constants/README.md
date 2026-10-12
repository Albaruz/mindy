# Centralized Constants — Single Source of Truth

This directory holds **all magic values** (strings, numbers, enums, configs) for the app.
Feature code must import from here — no inline literals for domain logic.

## Modules

| File | Domain | Key Exports |
|------|--------|-------------|
| `ai.ts` | LLM engine config | `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_TEMPERATURE`, `VISION_MODEL`, `VISION_TEMPERATURE`, `AI_MAX_ATTEMPTS`, `AI_RETRY_DELAY_MS` |
| `profile.ts` | Profile / onboarding enums & inference | `SKIN_TONES`, `EYE_COLORS`, `HAIR_COLORS`, `PREFERRED_FITS`, `LIFESTYLES`, `SEASON_PALETTE_SIZE`, `inferColorimetry`, `inferMorphology`, `mapStyleToLifestyle`, `mapFitToPreferredFit` |
| `ui-config.ts` | UI config + minimal TS tokens | `MEASURE_MIN/MAX_CM`, `THERMAL_MIN/MAX`, `FORBIDDEN_COLOR_OPTIONS`, `SHOP_SECTIONS`, `STYLE_TRIBES`, `FIT_CHOICES`, `ONBOARDING_DEFAULTS`, `clampMeasurement`, `clampThermal`, `breakpoints`, `zIndex`, `touchTarget` |
| `validation.ts` | Input validation limits | `PASSWORD_MIN_LENGTH`, `EMAIL_PATTERN`, `DISPLAY_NAME_MIN/MAX_LENGTH`, `TAG_KEY/VALUE_MAX_LENGTH`, `MEASUREMENT_MIN/MAX_CM` |
| `generator.ts` | Generator business caps | `MAX_LOOK_OPTIONS`, `MAX_DISCARD_COUNT`, `CAROUSEL_LOOP_MIN_SLIDES` |
| `animations.ts` | Animation / timing durations | `CELEBRATION_BURST_MS`, `NOTIFICATION_DURATION_MS`, `NOTIFICATION_EXIT_MS`, `SWIPE_COMMIT_PX`, `SWIPE_FADE_START_PX`, `SAVE_ARM_DELAY_MS`, `SUCCESS_AUTO_ADVANCE_MS`, `REDIRECT_DELAY_MS`, `SESSION_RETRY_DELAY_MS` |
| `weather.ts` | Climate thresholds (shared server↔client) | `DEFAULT_TEMPERATURE_C`, `HEAT_THRESHOLD_C`, `COLD_THRESHOLD_C`, `RAINY_CONDITIONS`, `RAIN_EXPECTED_THRESHOLD`, `isRainyConditionValue` |
| `api.ts` | Internal API routes & rate limits | `API_ROUTES`, `RATE_LIMITS`, `RETRY_AFTER_HEADER`, `buildWeatherUrl` |
| `query.ts` | TanStack Query defaults | `QUERY_KEYS`, `QUERY_STALE_TIME_MS`, `WEATHER_STALE_TIME_MS`, `QUERY_RETRY_COUNT`, `QUERY_REFETCH_ON_FOCUS`, `QUERY_NETWORK_MODE`, `QUERY_PERSIST_MAX_AGE_MS` |
| `geo.ts` | Geolocation settings | `GEOLOCATION_TIMEOUT_MS`, `GEOLOCATION_MAX_AGE_MS` |
| `storage.ts` | Supabase tables, buckets, persistence keys | `TABLES`, `STORAGE_BUCKETS`, `USER_ID_COLUMN`, `SUPABASE_URL_FALLBACK`, `SUPABASE_ANON_FALLBACK`, `THEME_STORAGE_KEY`, `PERSISTED_CACHE_KEY` |

## Rules

1. **No magic literals** in feature code. If a value represents domain logic, it lives here.
2. **Hex colors stay in TS** (they're domain data for pickers, not design tokens). SCSS owns theming (`src/styles/core/_variables.scss`).
3. **Derived from SSOT**: `FORBIDDEN_COLOR_OPTIONS` derives from `FORBIDDEN_COLORS`; `ONBOARDING_DEFAULTS` centralizes wizard defaults.
4. **Server & client share**: `weather.ts`, `query.ts`, `api.ts`, `validation.ts` are imported by both Route Handlers and client hooks — ensures zero drift.
5. **Adding new constants**: pick the right module, export, and update this README.

## Barrel Export

`index.ts` re-exports everything: `import { FOO, BAR } from "@/constants"`.

## Versioning

`ai.ts` exports `AI_PROMPT_VERSION` (outfit stylist) — bump when system prompt changes semantically. `prompts/versions.ts` holds per-prompt versions for A/B testing.