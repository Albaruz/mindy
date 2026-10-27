# Performance Baseline - Pre-Deploy

**Date**: 2026-10-10  
**Environment**: Local dev (Next.js 16.3.8, Turbopack)  
**Server**: http://localhost:3000

---

## 🔐 Auth Overhead (Pre-Auth Tests)

| Endpoint | p50 | p95 | p99 | Error | Notes |
|----------|-----|-----|-----|-------|-------|
| `/api/recommender` | N/A | **41ms** | N/A | 100% (401) | Fast auth check |
| `/api/weather` | N/A | **35ms** | N/A | 100% (401) | Server crashed at ~15s |

> **Note**: All requests return 401 Unauthorized (no auth). Latency measures auth middleware only. Server crashed under weather load (connection refused).

---

## 🎯 Post-Deploy Targets (Authenticated)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **TTFB `/api/recommender`** | < 3s (streaming) / < 8s (blocking) | Vercel Logs + k6 |
| **TTFB `/api/weather`** | < 500ms (cached) / < 2s (fresh) | Vercel Logs + k6 |
| **LCP Generator page** | < 2.5s | Vercel Speed Insights |
| **Supabase query (closet/profile)** | < 100ms p95 | Vercel Logs |
| **Groq error rate** | < 1% | Structured logs |
| **Fallback rate** | < 10% | `x-fallback` header |
| **Bundle JS (gzipped)** | < 180KB | `@next/bundle-analyzer` |

---

## 📦 Bundle Analysis (Local)

Run: `pnpm run analyze` → open `.next/analyze/client.html`

| Chunk | Size (gzipped) | Status |
|-------|----------------|--------|
| Main | TBD | Check analyzer |
| `ManualCarousels` (Swiper) | Lazy ✅ | Dynamic import |
| `OutfitCelebrationScreen` (framer-motion + lottie) | Lazy ✅ | Dynamic import |
| `@imgly/background-removal` | **0 KB** ✅ | Web Worker + CDN |

---

## 🧪 Load Test Scripts

```bash
# Recommender (authenticated - needs session cookie)
k6 run k6-recommender.js --vus 5 --duration 1m -e BASE_URL=https://your-app.vercel.app

# Weather (authenticated)
k6 run k6-weather.js --vus 20 --duration 1m -e BASE_URL=https://your-app.vercel.app

# Smoke test (local)
k6 run k6-recommender.js --vus 1 --duration 30s
```

---

## 📈 Post-Deploy Checklist

- [ ] Deploy to Vercel
- [ ] Enable Speed Insights + Analytics + OTEL
- [ ] Create test user in Supabase
- [ ] Run authenticated k6 tests (with session cookie)
- [ ] Document real latencies in this file
- [ ] Set up Vercel Log alerts (p95 > 5s, error rate > 5%)

---

## 🔧 Known Issues to Fix Post-Deploy

1. **Authenticated k6 tests** - Need login flow to get session cookie
2. **Server stability under load** - Investigate connection refused
3. **Groq streaming** - Implement SSE for TTFB < 3s
4. **Rate limiting** - Shared Postgres RPC now keeps per-user quotas consistent across serverless instances; monitor counter-write load after deployment
