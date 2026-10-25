# API Reference

## Overview

All APIs use **Route Handlers** (Next.js serverless functions) to keep credentials secure.

- 🔐 API keys never exposed to client
- 📡 Rate limiting enforced per endpoint
- ✅ JSON response with metadata
- ⏱️ Configurable timeouts

---

## 1. Weather API

### Endpoint

```
GET /api/weather?lat={latitude}&lon={longitude}
```

### Authentication

- **Required:** Yes (401 if not authenticated)
- **Method:** Supabase session (automatic via middleware)

### Query Parameters

| Param | Type | Required | Example |
|---|---|---|---|
| `lat` | number | ✅ | `-33.8688` |
| `lon` | number | ✅ | `-51.2093` |

### Response

```json
{
  "current": {
    "temp": 22,
    "condition": "partly_cloudy",
    "description": "Parcialmente nublado",
    "icon": "02d",
    "humidity": 65,
    "windSpeed": 12
  },
  "forecast": [
    {
      "date": "2026-10-11",
      "temp": 24,
      "low": 18,
      "high": 28,
      "condition": "sunny",
      "rainProb": 0,
      "description": "Soleado"
    },
    // ... 7 more days
  ],
  "fallback": false,
  "message": "success"
}
```

### Rate Limit

```
30 requests/hour per user
```

### Timeout

```
8000ms
```

### Caching

```
Revalidate: 10 minutes (automatic)
TanStack Query: staleTime 10min
```

### Error Responses

| Status | Body | Reason |
|---|---|---|
| `200` | success object | Valid weather data |
| `400` | `{error: "Missing lat/lon"}` | Invalid parameters |
| `401` | `{error: "Unauthorized"}` | Not authenticated |
| `429` | `{error: "Rate limit exceeded"}` | Rate limited |
| `500` | `{fallback: true, temp: 20}` | API error (fallback) |

### Example Usage (Frontend)

```typescript
import { useQuery } from '@tanstack/react-query';

function WeatherDisplay() {
  const { data, isLoading } = useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('Weather API failed');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10min
    refetchInterval: 10 * 60 * 1000,
  });

  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      <Temperature temp={data.current.temp} />
      <Condition condition={data.current.condition} />
    </div>
  );
}
```

---

## 2. Recommender API

### Endpoint

```
POST /api/recommender
```

### Authentication

- **Required:** Yes (401 if not authenticated)
- **Method:** Supabase session

### Request Body

```json
{
  "garments": [
    { "garmentId": "top-1", "garmentType": "top", "styles": ["casual"], "isDirty": false },
    { "garmentId": "bottom-1", "garmentType": "bottom", "styles": ["casual"], "isDirty": false }
  ],
  "temperatureC": 22,
  "condition": "Clear",
  "dayLow": 17,
  "dayHigh": 25,
  "rainProbability": 0,
  "profile": {
    "preferredFit": "regular",
    "lifestyle": "casual_daily",
    "colorimetry": "autumn",
    "morphology": "rectangle"
  },
  "mood": "relaxed",
  "style": "casual",
  "locale": "en",
  "lockedGarmentIds": [],
  "dismissedGarmentIds": [],
  "forcedFavoritesIds": [],
  "suggestedFavoriteIds": ["top-1"]
}
```

`garments` is required and must contain 1–200 items. `forcedFavoritesIds` are
hard constraints: surviving IDs are included in every generated option, like
locked garments. `suggestedFavoriteIds` are optional preferences for automatic
generation, not constraints. The server selects only compatible, eligible
favorites, preserves them through the candidate cap, and independently gives
each look a 25% chance to use a favorite in place of a garment from the same
category. Dirty, dismissed, weather-incompatible, and style-incompatible
garments are not used as suggestions.

### Response

```json
{
  "options": [
    {
      "garmentIds": ["top-1", "bottom-1"],
      "reason": "A versatile casual look",
      "suitabilityRatio": 92
    }
  ],
  "temperatureC": 22,
  "requiredOuterwear": false,
  "_isFallback": false,
  "excludedWinterGarments": 0,
  "excludedRainMaterials": 0,
  "excludedDismissedGarments": 0,
  "model": "openai/gpt-oss-20b",
  "fallbackReason": null
}
```

### Rate Limit

```
5 requests/minute per user
```

### Timeout

```
15000ms per AI model call (configured by AI_TIMEOUT_MS)
```

### Error Responses

| Status | Body | Reason |
|---|---|---|
| `200` | `{ options, _isFallback, ... }` | Success; `_isFallback` reports rule-based recovery |
| `400` | `{error: "..."}` | Malformed request or no eligible/buildable candidates |
| `401` | `{error: "Unauthorized"}` | Not authenticated |
| `413` | `{error: "Too many garments in a single request."}` | More than 200 garments |
| `422` | `{error: "INSUFFICIENT_STYLE_GARMENTS"}` | Not enough clean garments for style |
| `429` | `{error: "Rate limit exceeded"}` | Rate limited; retry delay is in the `Retry-After` header |
| `500` | `{error: "Unexpected recommender error."}` | Unexpected internal error |
| `502` | `{error: "AI service request failed. Try again."}` | Upstream and local fallback both failed |
| `503` | `{error: "AI service is not configured ..."}` | Missing `GROQ_API_KEY` |

### Fallback Behavior

If Groq API fails or is rate-limited, the endpoint returns rule-based combinations
with static suitability ratios and `_isFallback: true`. The response still uses
the same `options` contract:

```json
{
  "options": [
    { "garmentIds": ["..."], "suitabilityRatio": 60 },
    { "garmentIds": ["..."], "suitabilityRatio": 55 },
    { "garmentIds": ["..."], "suitabilityRatio": 50 }
  ],
  "_isFallback": true,
  "model": "local-fallback"
}
```

### Example Usage (Frontend)

```typescript
async function generateOutfits(
  garments: Garment[],
  profile: RecommenderProfile | null,
  style: string,
  suggestedFavoriteIds: string[] = [],
) {
  const res = await fetch('/api/recommender', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      garments,
      profile,
      style,
      temperatureC: currentWeather.temperatureC,
      condition: currentWeather.condition,
      dayLow: currentWeather.dayLow,
      dayHigh: currentWeather.dayHigh,
      rainProbability: currentWeather.rainProbability,
      lockedGarmentIds: [],
      dismissedGarmentIds: [],
      forcedFavoritesIds: [],
      suggestedFavoriteIds,
    }),
  });

  if (!res.ok) {
    if (res.status === 422) {
      throw new Error('INSUFFICIENT_STYLE_GARMENTS');
    }
    throw new Error(`Recommender failed: ${res.statusText}`);
  }

  const { options, _isFallback } = await res.json();
  return { options, isFallback: _isFallback };
}
```

Clients may request server-sent streaming by adding
`Accept: text/event-stream`. The stream emits `progress`, `preview`, `reset`,
and `complete` events; the completed event contains the same response payload.

---

## 3. Analyze API

### Endpoint

```
POST /api/analyze
```

### Authentication

- **Required:** Yes (401 if not authenticated)
- **Method:** Supabase session

### Request Body

```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..."
}
```

### Constraints

- **Max size:** 7,000,000 characters (base64)
- **Format:** JPEG, PNG, WebP
- **Recommended:** Max 5MB (≈3.7M base64 chars)

### Response

```json
{
  "garment_type": "top",
  "style": "casual",
  "cut_length": "short",
  "color": "blue",
  "color_detail": "sky blue",
  "material": "cotton",
  "season": "all",
  "processing_time_ms": 523
}
```

### Field Details

| Field | Type | Possible Values |
|---|---|---|
| `garment_type` | string | top, bottom, footwear, outerwear, dress, jumpsuit, etc |
| `style` | string | casual, formal, sport, elegant, streetwear, party |
| `cut_length` | string | short, midi, long, cropped, oversized |
| `color` | string | red, blue, green, neutral, etc (normalized) |
| `color_detail` | string | sky blue, navy, pastel pink (specific shade) |
| `material` | string | cotton, silk, wool, polyester, denim, linen, etc |
| `season` | string | spring, summer, autumn, winter, all, mid_season |

### Rate Limit

```
30 requests/10 minutes per user
```

### Timeout

```
30000ms
```

### Error Responses

| Status | Body | Reason |
|---|---|---|
| `200` | garment object | Success |
| `400` | `{error: "Image too large"}` | Base64 > 7M chars |
| `401` | `{error: "Unauthorized"}` | Not authenticated |
| `429` | `{error: "Rate limit exceeded"}` | Rate limited |
| `503` | `{error: "Vision API unavailable", "skipped": true}` | No API key configured |

### Example Usage (Frontend)

```typescript
async function analyzeGarment(imageBase64: string) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  if (!res.ok) {
    const error = await res.json();
    if (res.status === 503) {
      console.warn('Vision API not available, using manual entry');
      return null;
    }
    throw new Error(error.error);
  }

  const garment = await res.json();
  return garment;
}

// Full upload pipeline. Background removal is optional and is not part of the
// critical upload path.
async function uploadGarment(file: File) {
  // 1. Compress & convert to base64
  const base64 = await toDownscaledDataUrl(file, { maxWidth: 1024 });

  // 2. Analyze with AI
  const garmentData = await analyzeGarment(base64);

  // 3. Store the original source image. The user may request background
  // removal later from the garment edit view.
  const imagePng = file;

  // 4. Upload to storage
  const path = `garments/${userId}/${uuid()}.png`;
  const { data } = await supabase.storage
    .from('garments')
    .upload(path, imagePng);

  // 5. Save to database
  await supabase.from('garments').insert({
    user_id: userId,
    image_url: `${STORAGE_URL}/${path}`,
    original_image_url: `${STORAGE_URL}/${path}`,
    garment_type: garmentData.garment_type,
    style: garmentData.style,
    color: garmentData.color,
    material: garmentData.material,
    season: garmentData.season,
    extra_tags: {
      aiCategory: garmentData.garment_type,
      specificType: garmentData.style,
      colorShade: garmentData.color_detail,
    },
  });
}
```

### Garment image actions

Image transformations are client-side, authenticated mutations handled by the
closet feature rather than public API route handlers:

- **Change image:** uploads a new PNG and updates both `image_url` and
  `original_image_url`.
- **Remove background:** reads `original_image_url`, processes it in the
  background-removal worker, uploads the result, and updates only `image_url`.
- **Delete garment:** removes the database row and both referenced Storage
  objects when they are different.

All database updates are scoped by `garment_id` and the authenticated
`user_id`. A failed transformation leaves the currently displayed image intact.

---

## Common Patterns

### Retry Logic

```typescript
async function fetchWithRetry(
  url: string,
  options = {},
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok && attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### Error Handling

```typescript
async function apiCall(endpoint: string, payload: object) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      
      if (res.status === 401) {
        // Redirect to login
        router.push('/login');
        return;
      }

      if (res.status === 422) {
        // Show specific error to user
        showNotification(error.error, 'warning');
        return;
      }

      if (res.status === 429) {
        // Show rate limit message
        showNotification('Too many requests, please wait', 'error');
        return;
      }

      throw new Error(`API Error: ${error.error || res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('API call failed:', error);
    showNotification('Something went wrong', 'error');
    throw error;
  }
}
```

### Caching with TanStack Query

```typescript
const weatherQuery = useQuery({
  queryKey: ['weather', lat, lon],
  queryFn: () => fetch(`/api/weather?lat=${lat}&lon=${lon}`).then(r => r.json()),
  staleTime: 10 * 60 * 1000,      // Data fresh for 10 minutes
  gcTime: 24 * 60 * 60 * 1000,    // Cache for 24 hours
  refetchOnFocus: false,           // Don't auto-refetch on focus
  networkMode: 'offlineFirst',     // Use offline data if available
});
```

---

## Rate Limiting

### Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1634567890
```

### When Rate Limited (429)

```
Retry-After: 12  (seconds to wait before retrying)
```

### Handling

```typescript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
  showNotification(`Too many requests. Please try again in ${retryAfter}s`);
  await sleep(retryAfter * 1000);
  return retry();
}
```

---

## Monitoring & Observability

### Logging

All API calls are logged via `src/lib/logger.ts`:

```typescript
logger.info('Weather API called', { lat, lon });
logger.error('Recommender API failed', { error, retries });
```

### Metrics (Vercel OTEL)

- Request duration (p50, p95, p99)
- Error rates
- Cache hit rates
- Fallback activation %

---

## Debugging

### Local Requests

```bash
# Test weather endpoint
curl "http://localhost:3000/api/weather?lat=-33.8688&lon=-51.2093" \
  -H "Cookie: your-session-cookie"

# Test recommender
curl -X POST "http://localhost:3000/api/recommender" \
  -H "Content-Type: application/json" \
  -d '{"outfit_slots": {...}, ...}' \
  -H "Cookie: your-session-cookie"
```

### Environment Variables

```bash
# See what API keys are configured
env | grep GROQ
env | grep OPENWEATHER

# Test API key validity
curl "https://api.groq.com/verify" -H "Authorization: Bearer $GROQ_API_KEY"
```

---

## Resources

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [OpenWeather API](https://openweathermap.org/api)
- [Groq API](https://console.groq.com/docs/speech-text)
