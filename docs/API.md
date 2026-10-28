# API Reference

The App Router exposes five Route Handlers. All handlers require a signed-in
Supabase session, enforce a per-user quota, and keep server API keys off the
client. Requests use the session cookie; send same-origin requests with browser
credentials enabled.

| Method | Route | Purpose | Per-user limit |
|---|---|---|---:|
| `GET` | `/api/weather?lat={lat}&lon={lon}` | Current weather and today/tomorrow summaries | 30/hour |
| `POST` | `/api/recommender` | JSON outfit recommendation or SSE stream | 5/minute |
| `POST` | `/api/analyze` | Vision tags for an uploaded image | 30/10 minutes |
| `GET` | `/api/favorites` | Current user's favorite garments | 60/minute |
| `PATCH` | `/api/garments/{id}/favorite` | Set a garment's favorite state | 60/minute |

Rate limits are consumed by the authenticated `consume_api_rate_limit` RPC.
Quota-service failures fail closed. A `429` response includes `Retry-After` in
seconds. JSON bodies are capped by the shared Route Handler guard.

## Weather

```http
GET /api/weather?lat=40.41&lon=-3.70
```

Both coordinates are required finite decimal values (`lat`: -90..90, `lon`:
-180..180). The handler fetches OpenWeather's current and forecast endpoints in
parallel. It responds `Cache-Control: private, no-store`; the upstream fetch
cache is ten minutes.

```json
{
  "temperatureC": 21.4,
  "condition": "Clear",
  "city": "Madrid",
  "dayLow": 10,
  "dayHigh": 16,
  "dayCondition": "Rain",
  "rainProbability": 80,
  "today": {
    "temperatureC": 21.4,
    "condition": "Clear",
    "dayLow": 10,
    "dayHigh": 16,
    "dayCondition": "Rain",
    "rainProbability": 80
  },
  "tomorrow": {
    "temperatureC": 19,
    "condition": "Clouds",
    "dayLow": 16,
    "dayHigh": 21,
    "dayCondition": "Clouds",
    "rainProbability": 40
  },
  "fallback": false
}
```

The flat weather fields are today's values for compatibility. `today` and
`tomorrow` are city-local summaries; `tomorrow` may be `null` when the forecast
is unavailable. If coordinates, the API key, or the upstream service are
unavailable, the handler returns the seasonal fallback with `fallback: true`.

| Status | Meaning |
|---|---|
| `200` | Current weather or seasonal fallback |
| `401` | No authenticated session |
| `429` | Per-user weather quota exceeded |
| `503` | Rate-limit service unavailable |

## Recommender

```http
POST /api/recommender
Content-Type: application/json
```

`garments` is required and must contain 1–200 garment objects with a valid ID.
The handler accepts camelCase and the documented legacy aliases below. Unknown
or invalid vocabulary values are discarded before they reach the model.

```json
{
  "garments": [
    { "garmentId": "top-1", "garmentType": "top", "styles": ["casual"], "isDirty": false },
    { "garmentId": "bottom-1", "garmentType": "bottom", "styles": ["casual"], "isDirty": false }
  ],
  "temperatureC": 21,
  "dayLow": 10,
  "dayHigh": 25,
  "condition": "Clear",
  "rainProbability": 0,
  "profile": { "preferredFit": "regular", "lifestyle": "casual_daily" },
  "mood": "relaxed",
  "style": "casual",
  "locale": "en",
  "lockedGarmentIds": [],
  "dismissedGarmentIds": [],
  "forcedFavoritesIds": [],
  "suggestedFavoriteIds": ["top-1"]
}
```

`lockedGarmentIds` also accepts `fixed_garments` and `fixedGarments`. Locked
garments and `forcedFavoritesIds` are hard constraints. `suggestedFavoriteIds`
are preferences only; eligible favorites are selected by the server and may
appear in a look. `locale` also accepts the legacy `language` alias. Optional
weather values are `temperatureC`, `dayLow`, `dayHigh`, `condition`, and
`rainProbability`. Optional profile and mood values are validated against the
closed vocabularies.

The JSON response is:

```json
{
  "options": [
    {
      "garmentIds": ["top-1", "bottom-1"],
      "suitabilityRatio": 88,
      "reason": "A balanced casual look."
    }
  ],
  "temperatureC": 21,
  "requiredOuterwear": false,
  "_isFallback": false,
  "excludedWinterGarments": 0,
  "excludedRainMaterials": 0,
  "excludedDismissedGarments": 0,
  "model": "…",
  "repairAttempted": false,
  "fallbackReason": null
}
```

Response headers include `x-groq-model`, `x-fallback`, `x-fallback-reason`,
`x-options-count`, exclusion counts, and `x-request-id`. The local fallback keeps
the same response shape and sets `_isFallback: true`.

To receive Server-Sent Events, add `Accept: text/event-stream`. Events are
newline-delimited `data:` frames with `progress`, `preview`, `reset`, `error`,
or `complete` types. The `complete` event contains the same payload as the JSON
response.

| Status | Meaning |
|---|---|
| `200` | Model or local fallback returned options |
| `400` | Missing/invalid garments or no buildable candidates |
| `401` | No authenticated session |
| `413` | More than 200 garments or oversized request body |
| `422` | Requested style cannot form a look |
| `429` | Per-user recommender quota exceeded |
| `499` | Client disconnected during a non-streaming request |
| `502` | Model failed and no local fallback can be built |
| `503` | Groq key missing or rate-limit service unavailable |

## Analyze

```http
POST /api/analyze
Content-Type: application/json
```

The request uses **camelCase** JSON fields. `imageBase64` must be a JPEG, PNG,
or WebP data URL whose decoded bytes match the declared format. The request body
is capped at 10 MiB; image data URLs are capped at 9,500,000 characters and 7
MiB decoded.

```json
{
  "imageBase64": "data:image/png;base64,...",
  "locale": "en"
}
```

The response also uses camelCase. Closed tags can be `null`; lists such as
`styles` and `cuts` contain only allowlisted values.

```json
{
  "skipped": false,
  "category": "top",
  "garmentType": "top",
  "color": "blue",
  "colorDetail": "sky blue",
  "secondaryColor": null,
  "print": null,
  "season": "all",
  "style": "casual",
  "styles": ["casual"],
  "material": "cotton",
  "cutLength": "regular",
  "cuts": ["regular"],
  "typeDetail": "t-shirt",
  "cutoutDifficulty": "easy",
  "qualityNote": null,
  "visualDescription": "A blue cotton top."
}
```

| Status | Meaning |
|---|---|
| `200` | Vision tags returned |
| `400` | Invalid JSON or image data URL |
| `401` | No authenticated session |
| `413` | JSON body exceeds the shared limit |
| `429` | Per-user vision quota exceeded |
| `502` / `504` | Vision provider failure / timeout |
| `503` | Groq is not configured; clients may continue with manual tags |

## Favorites

```http
GET /api/favorites
```

Returns the authenticated user's favorited garments as a JSON array of the
shared `Garment` shape. The result is `private` and has a short HTTP cache
policy; client requests also use `cache: "no-store"`.

```http
PATCH /api/garments/{id}/favorite
Content-Type: application/json
```

`id` must be a UUID. The field name follows the database's snake_case API
contract:

```json
{ "is_favorite": true }
```

```json
{ "success": true, "is_favorite": true }
```

Both routes require authentication and consume the `favorite` quota (60/minute
per user). `PATCH` returns `400` for an invalid ID or non-boolean value, `404`
when the owned garment does not exist, and `500` for a database failure.

## Shared protections

- All five routes authenticate before doing paid upstream work or returning
  user-scoped database data.
- JSON parsing, request-size limits, rate-limit responses, and `Retry-After`
  handling are centralized in `src/lib/api/routeGuards.ts`.
- Supabase queries are parameterized through the client and scoped by the
  authenticated user; Storage writes are restricted by the bucket's user-folder
  policies.
- Groq and OpenWeather credentials remain server-only.
