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

## 🔄 In Progress / Next Sprint

### WCAG 2.2 AA Accessibility Audit
- [ ] Run axe-core full audit
- [ ] Fix contrast ratios (dark/light modes)
- [ ] Test keyboard navigation (Tab, arrows, ESC)
- [ ] Verify focus visible on all interactive elements
- [ ] Test with screen readers (NVDA, JAWS)
- **Timeline:** Sprint 7 (1-2 weeks)
- **Priority:** High

### Visual Regression Testing
- [ ] Set up Playwright snapshots
- [ ] Screenshot critical pages (generator, closet, profile)
- [ ] Configure snapshot thresholds
- [ ] Add CI gate for visual diffs
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

### Social & Sharing

#### Outfit Sharing
- **Description:** Share looks with friends for feedback
- **Benefits:**
  - Community engagement
  - User retention
- **Status:** Not started
- **Effort:** 13 points (includes auth, permissions, UI)

#### Inspiration Feed
- **Description:** Public gallery of looks from other users (opt-in)
- **Benefits:**
  - Style inspiration
  - Engagement loop
- **Status:** Not started
- **Effort:** 13 points

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
- [ ] Configure thresholds (perf ≥90, a11y ≥95)
- [ ] Add GitHub status checks
- [ ] Track metrics over time
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

---

## 🗓️ Timeline Overview

```
Oct 2026 (Sprint 7)
  - ✅ MVP Deployed
  - 🔄 a11y Audit + Visual Regression
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
  - 🎯 Social Features (sharing, inspiration)
  - 🎯 Mobile Native (if needed)
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

**Last updated:** 2026-10-11
