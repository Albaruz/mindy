# 👗 Mindy Smart Closet

> A PWA to digitize your closet, discover AI-powered outfit combinations, and optimize your personal style.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://mindy-closet.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-0070F3?style=flat-square&logo=nextjs)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19.2.8-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

---

## ✨ Features

- **🤖 AI-Powered Outfits** — Personalized recommendations based on climate, style, and colorimetry
- **🎨 Color Profile** — 5-step onboarding to detect your seasonal palette (spring/summer/autumn/winter)
- **📸 Smart Closet** — Upload photos with auto background removal, AI-powered tagging
- **🌦️ Climate-Aware** — Real-time weather integration (OpenWeather) with smart filtering
- **📅 History & Calendar** — Track your looks, view monthly usage patterns
- **🧺 Laundry Management** — Selective dirty tracking (footwear & outerwear exempt)
- **📱 Offline PWA** — Works without internet, syncs when back online
- **🌍 i18n** — Spanish & English with device-level preferences
- **♿ Accessible** — ARIA labels, 44px touch targets, dark mode support

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **pnpm** 12.8+
- **Supabase**, **Groq**, and **OpenWeather** accounts (free tier)

### Installation

```bash
pnpm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 16 • React 19 • TypeScript • SCSS Modules |
| **State** | Zustand • TanStack Query (IndexedDB persistence) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **AI/Vision** | Groq (gpt-oss-20b + qwen vision) |
| **Weather** | OpenWeather API |
| **PWA** | next-pwa • Service Worker • Workbox |
| **UI** | Swiper • Framer Motion • Lucide React |
| **Testing** | Vitest • Playwright • k6 |

---

## 📦 Project Structure

```
src/
├── app/
│   ├── [locale]/         # Localized routes and views
│   └── api/              # Route handlers: weather, recommender, analyze
├── features/             # Feature-driven domains
├── components/           # Reusable UI components
├── lib/                  # Utilities, hooks, AI engine
├── constants/            # SSOT modules
├── types/                # TypeScript interfaces
└── styles/               # SCSS modules + tokens
```

[Full architecture →](./docs/ARCHITECTURE.md)

---

## 🧪 Testing & Quality

```bash
pnpm test:coverage     # Unit tests with coverage (Vitest)
pnpm test:e2e          # E2E tests (Playwright, Pixel 7)
pnpm typecheck         # TypeScript strict
pnpm lint              # ESLint
pnpm budget            # Enforce shared-JS bundle budget
```

**Performance baselines** (2026-10-10):
- Weather API: p95 = 35ms
- Recommender API: p95 = 41ms
- Bundle size: <180KB gzip

[Testing details →](./docs/TESTING.md)

---

## 🚀 Deployment

Deployed on **Vercel Serverless** (native Next.js support).

### Pre-Deploy Checks

```bash
pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm build
```

### Environment Variables

Add to Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GROQ_API_KEY`
- `OPENWEATHER_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

[Deployment guide →](./docs/DEPLOYMENT.md)

---

## 📚 Documentation

- **[SDD (System Design)](./Software%20Design%20Document%20(SDD)%20-%20App%20de%20Moda%20Inteligente.md)** — Complete technical specification
- **[Architecture](./docs/ARCHITECTURE.md)** — Design decisions & data flow
- **[API Reference](./docs/API.md)** — Endpoint documentation
- **[Testing Strategy](./docs/TESTING.md)** — Unit, E2E, load testing
- **[Contributing Guide](./docs/CONTRIBUTING.md)** — Code style & workflow
- **[Performance Baseline](./PERFORMANCE_BASELINE.md)** — Metrics & benchmarks

---

## 🔒 Security

- **Authentication:** Required (Supabase SSR, no anonymous access)
- **Authorization:** RLS on all tables + Storage policies
- **Rate Limiting:** 30 req/h (weather), 5 req/min (recommender), 30 req/10m (vision)
- **Headers:** HSTS, CSP, X-Frame-Options, nosniff
- **Input Validation:** Strict types, SQL injection prevention, image size limits

[Security details →](./docs/SECURITY.md)

---

## 🎯 Roadmap

### ✅ MVP Complete
- Onboarding wizard (5 steps)
- AI outfit generation (5-state machine)
- Smart closet with search & filters
- Weather integration
- Offline PWA support
- Testing (unit, E2E, load)

### 🔄 In Progress
- WCAG 2.2 AA audit
- Visual regression tests

### 📋 Coming Soon
- Outfit similarity (embeddings)
- Starter wardrobe (basic pieces)
- Tomorrow's outfit (forecast-based)
- Material filtering for rain
- CI/CD automation

[Full roadmap →](./docs/ROADMAP.md)

---

## 🤝 Contributing

1. Fork and clone
2. Create feature branch: `git checkout -b feature/my-feature`
3. Run tests: `pnpm test:coverage`
4. Commit: `git commit -am "feat: add my feature"`
5. Push and open a Pull Request

[Contributing guide →](./docs/CONTRIBUTING.md)

---

## 📜 License

MIT — See [LICENSE.md](./LICENSE.md)

---

## 📞 Support

- 🐛 [Report issues](https://github.com/tu-usuario/mindy-smart-closet/issues)
- 💬 [Discussions](https://github.com/tu-usuario/mindy-smart-closet/discussions)
- 📧 Email: equipo@mindy-closet.dev

---

**Built with ❤️ by the Mindy team**  
**Last updated:** 2026-10-12
