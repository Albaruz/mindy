# Roadmap

## Current Status

**MVP Full-Feature:** ✅ Deployed on Vercel (2026-10-11)

All core features are live and production-ready. This roadmap outlines improvements and new features for post-MVP.

---

## ✅ Completed (MVP)

### Sprint 1: Core Infrastructure
- [x] Next.js 16 + React 19 setup
- [x] Supabase integration (auth, DB, storage)
- [x] Route Handlers for API security
- [x] TypeScript strict mode
- [x] SCSS Modules + token system

### Sprint 2: Authentication & Onboarding
- [x] Email/password auth (Supabase)
- [x] 5-step onboarding wizard
- [x] Biometric profile (measurements)
- [x] Colorimetry inference (direct + indirect via jewelry)
- [x] Profile persistence

### Sprint 3: Digital Closet
- [x] Image upload with background removal
- [x] AI-powered garment tagging
- [x] Manual tag editing with extra_tags
- [x] Search (case-insensitive, accent-tolerant, plurals)
- [x] Filtering + sorting
- [x] Delete & edit functionality

### Sprint 4: AI Outfit Generation
- [x] Weather API integration
- [x] Recommender API (Groq LLM)
- [x] Vision API for image analysis
- [x] 5-state generator machine
- [x] Showcase with swipe gestures
- [x] Manual carousel editor
- [x] Lock/unlock garments
- [x] Celebration screen

### Sprint 5: Supporting Features
- [x] Outfit history (calendar view)
- [x] Laundry basket (selective dirty tracking)
- [x] Dark mode (system/light/dark)
- [x] i18n (Spanish + English)
- [x] PWA (offline support)
- [x] Accessibility (ARIA, 44px targets, skip-links)

### Sprint 6: Quality & Deploy
- [x] Unit tests (Vitest, 90% coverage)
- [x] E2E tests (Playwright, Pixel 7)
- [x] Load testing (k6, weather + recommender)
- [x] Performance baselines (< 180KB gzip)
- [x] Security headers & RLS policies
- [x] Deployed to Vercel

---

## ✅ Completed after MVP (2026-10-12)

### Difficult Garment Photo Flow — Phase 1
- [x] Analyze the original image with Groq Vision before background removal; return garment tags, a localized quality note, cutout difficulty, and a garment-only description
- [x] Keep automatic background removal for photos classified as easy
- [x] For difficult photos, show a localized accessible dialog with concise guidance on neutral contrasting backgrounds, even lighting, and clear framing
- [x] Provide the actions in this order: **Choose another (Recommended)**, **Use photo as-is**, and **Try removing the background**
- [x] Keep the original pending until the user explicitly chooses an action; closing the dialog discards it
- [x] Reduce large images to 1024 px before cutout and normalize saved images to 300 px wide
- [x] Use the Web Worker with a main-thread fallback; fix Blob message handling to avoid treating Blob as transferable
- [x] Keep the dialog and remaining options available if both cutout attempts fail
- [x] Add English/Spanish copy and tests for analysis, choices, and cutout failures
- **Status:** Complete
- **AI image generation:** Not implemented; its action is not rendered. A source TODO marks Phase 2.

---

## 🔄 In Progress / Next Sprint

### WCAG 2.2 AA Accessibility Audit
- [x] Run axe-core full audit
- [x] Fix contrast ratios (dark/light modes)
- [x] Test keyboard navigation (Tab, arrows, ESC)
- [x] Verify focus visible on all interactive elements
- [ ] Test with screen readers (NVDA, JAWS)
- **Status (2026-10-15, Chrome MCP):** Lighthouse a11y 96–100 on 7 routes; fixed dark active-tab contrast (2.36 → pass); keyboard walk + focus screenshots verified in both themes. Only manual screen-reader pass remains.
- **Timeline:** Sprint 7 (1-2 weeks)
- **Priority:** High

### Visual Regression Testing
- [x] Set up Playwright snapshots
- [x] Screenshot critical pages (generator, closet, profile) in light and dark themes
- [x] Configure snapshot threshold (1% pixel-diff ratio)
- [x] Add CI gate for visual diffs
- **Status:** 8 versioned baselines: 6 page views + 2 closet add-garment dialogs
- **Timeline:** Sprint 7 (1 week)
- **Priority:** Medium

### Rain → Material Filtering
- [ ] Implement `isRainy()` condition check
- [ ] Add material filter logic (exclude suede, silk, etc.)
- [ ] Test with weather API rainy scenarios
- [ ] Update recommender prompt to include material rules
- **Timeline:** Sprint 7 (2-3 days)
- **Priority:** High
- **Effort:** 3 points

### AI-Generated Garment Alternative — Phase 2
- [ ] Reuse the garment-only visual description captured during Phase 1
- [ ] Integrate Cloudflare Workers AI using FLUX.1 Schnell (`@cf/black-forest-labs/flux-1-schnell`) as the preferred hosted text-to-image candidate
- [ ] Generate from the text description and validated garment tags only; never send the uploaded photo to the image generator
- [ ] Keep `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` server-only; authenticate requests, validate inputs, and apply per-user rate limits
- [ ] Add a preview step with explicit accept, generate-another, and return-to-options actions; persist to Supabase Storage only after acceptance
- [ ] Store provenance for generated garments and preserve existing garment tags
- [ ] Handle unconfigured credentials, provider failures, timeout, and exhausted free allocation without disabling phase 1 options
- [ ] Verify current Cloudflare plan quota and terms before release; Workers AI currently advertises 10,000 free Neurons per day, but image count depends on model usage and terms may change
- **Priority:** Medium (after Phase 1)
- **Status:** Planned; not implemented
- **Technology:** Groq Vision → Cloudflare Workers AI / FLUX.1 Schnell → Supabase Storage
- **Privacy:** Text-only generation; source photo is not forwarded

**Product decision:** Do not resume image-catalog search (Unsplash, Wikimedia Commons, Pixabay, or similar). The alternative-image direction is AI generation from Groq’s garment description.

---

## 📋 Coming Soon (Q4 2026)

### Garment Similarity & Feedback Loop
- **Description:** Learn from user dismissals using embeddings
- **Benefits:**
  - Avoid recommending similar rejected outfits
  - Personalize recommendations over time
- **Implementation:**
  - Generate embeddings for garments (color, style, material)
  - Cosine similarity search in dismissals
  - Adjust recommender weights based on patterns
- **Timeline:** 2-3 weeks
- **Priority:** Medium
- **Effort:** 8 points
- **Blocks:** None
- **Blocked by:** None

### Starter Wardrobe (Onboarding)
- **Description:** Offer users a curated set of basic pieces after onboarding
- **Benefits:**
  - Generator works immediately (day 1)
  - No need to upload full wardrobe
  - Educational (shows good basics)
- **Implementation:**
  - Create catalog of 8-12 neutral essentials
  - Flag as `is_external_garment=true`
  - Offer opt-in/opt-out during onboarding step 5
  - Don't count toward metrics
- **Timeline:** 1-2 weeks
- **Priority:** Medium
- **Effort:** 5 points
- **Blocks:** None

### Tomorrow's Outfit (Forecast-based)
- **Description:** Generate outfit based on tomorrow's weather
- **Benefits:**
  - Plan outfits in advance
  - Leverage existing weather forecast data
- **Implementation:**
  - Add "Today / Tomorrow / Pick Date" selector in ZeroState
  - Pass `forecast[day]` instead of `current` to recommender
  - Update copy: "Mañana hará 18°C..."
- **Timeline:** 3-5 days
- **Priority:** Low
- **Effort:** 3 points
- **Blocks:** None
- **Depends on:** Weather API (already has forecast)

---

## 🎯 H2 2026 (Future)

### Advanced Personalization

#### Color Base Tagging
- **Description:** Systematically tag garments by undertone (warm, cool, neutral)
- **Benefits:**
  - Better colorimetry matching
  - Manual search by undertone
  - Fallback for new colors
- **Status:** Partially implemented (read-only)
- **Effort:** 3 points

#### Morphology-based Recommendations
- **Description:** Consider body type in fit/cut recommendations
- **Benefits:**
  - Flattering fit suggestions
  - "Best fit for you" label
- **Status:** Infrastructure ready (measurements captured)
- **Effort:** 5 points

### Machine Learning

#### Vein Test (Indirect Colorimetry)
- **Description:** Test color of veins (blue/purple/green) to refine palette
- **Benefits:**
  - More accurate seasonal palette
  - Replaces direct questioning in onboarding
- **Status:** Planned (0 implementation)
- **Effort:** 5 points

#### Outfit Clustering
- **Description:** Group similar outfits (occasion, formality, style)
- **Benefits:**
  - Quick filter by occasion
  - Suggest related looks
- **Status:** Not started
- **Effort:** 8 points

---

## 🛠️ Infrastructure & DevOps

### CI/CD Automation
- [ ] `.github/workflows` for lint, test, build gates
- [ ] Deploy preview on every PR
- [ ] Auto-deploy main to Vercel
- **Timeline:** Sprint 8-9
- **Priority:** Medium
- **Effort:** 5 points

### Storybook Integration
- [ ] Set up Storybook for UI components
- [ ] Document component APIs
- [ ] Visual design system reference
- **Timeline:** After MVP stabilization
- **Priority:** Low
- **Effort:** 8 points

### Performance Optimization

#### Bundle Optimization
- [ ] PurgeCSS integration
- [ ] Tree-shaking unused SCSS mixins
- [ ] Dynamic imports for heavy features
- **Timeline:** Sprint 9
- **Priority:** Low
- **Effort:** 3 points

#### LHCI (Lighthouse CI)
- [x] Configure thresholds (perf ≥90, a11y ≥95)
- [x] Add GitHub Actions gate (`lighthouse` job)
- [ ] Track metrics over time
- **Status:** Threshold gate passing locally: performance 92–94, accessibility ≥95
- **Timeline:** Sprint 9
- **Priority:** Low
- **Effort:** 2 points

---

## 📊 Metrics & Success Criteria

### Quality Gates (Current)
- ✅ Test coverage: 90%+
- ✅ Bundle size: <180KB gzip
- ✅ Lighthouse Performance: ≥90
- ✅ Lighthouse a11y: ≥95
- ✅ Weather API p95: <1500ms
- ✅ Recommender API p95: <8s

### Success Metrics (Post-MVP)
- Time to complete onboarding: <5min
- Time to first outfit recommendation: <10s
- Outfit acceptance rate (not dismissed): >70%
- Daily active users (target): TBD
- User retention (30 days): >50%

---

## 💡 Ideas (Backlog)

### Low Priority / Future Consideration

- [ ] Export outfit as image (screenshot)
- [ ] Print wardrobe catalog
- [ ] Wishlist (mark garments to buy)
- [ ] Integration with fashion retailers (style-alike suggestions)
- [ ] AR try-on (experimental)
- [ ] Voice commands for hands-free generation
- [ ] Calendar sync (export outfits to calendar app)
- [ ] Analytics dashboard (most-worn pieces, color usage, etc.)

### 🗃️ Archived / Post-MVP Validation Required

- [ ] **Outfit Sharing** — Share looks with friends for feedback (13 pts, requires auth/permissions/moderation/realtime)
- [ ] **Inspiration Feed** — Public gallery of looks from other users opt-in (13 pts, requires ranking algorithm/moderation/GDPR)

---

## 🗓️ Timeline Overview

```
Oct 2026 (Sprint 7)
  - ✅ MVP Deployed
  - 🔄 a11y Audit
  - ✅ Visual Regression
  - 🔄 Rain → Material Filtering

Nov 2026 (Sprint 8)
  - 🎯 Similarity + Feedback Loop
  - 🎯 Starter Wardrobe
  - 🎯 Tomorrow's Outfit

Dec 2026 (Sprint 9)
  - 🎯 CI/CD Automation
  - 🎯 Advanced Personalization
  - 🎯 Performance Optimization

2027+ (H2)
  - 🎯 ML Features (vein test, clustering)
  - 🎯 Mobile Native (if needed)
  - 🎯 Social Features (archived — see Ideas/Backlog)
```

---

## 🤝 Contributing

Want to help? Pick an item from this roadmap and open an issue or PR!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📞 Feedback

- Have a feature request? Open a GitHub Issue
- Found a bug? Open a GitHub Issue with reproduction steps
- Want to discuss priorities? Start a Discussion

**Last updated:** 2026-10-13
