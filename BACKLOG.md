# Backlog - Mindy Smart Closet

Tabla con los items del backlog del documento SDD, ordenados por prioridad y dificultad.

| ID | # | Funcionalidad | Descripción | Prioridad | Dificultad | Esfuerzo | Status |
|---|---|---|---|---|---|---|---|
| #BKL-001 | 1 | Filtrado por Material en Lluvia | Lluvia → fuerza abrigo, pero también filtra materiales (suede, silk) | Media | Fácil | 2 pts | Pendiente |
| #BKL-003 | 2 | Similitud en Descartes | garment_feedback escrito pero no leído; evitar combinaciones similares con embeddings | Media | Muy Difícil | 8 pts | Pendiente |
| #BKL-004 | 3 | Etiquetado de color_base | Pipeline de visión escribe `color_base` en extra_tags (derivado del color cerrado) | Media | Fácil | 3 pts | Hecho |
| #BKL-005 | 4 | Starter Wardrobe | Set de 8-12 prendas básicas en onboarding; is_external_garment=true; opt-in/out | Media | Medio | 5 pts | Pendiente |
| #BKL-006 | 5 | Outfit para Mañana | Selector "Hoy/Mañana" en ZeroState; usar forecast[day] en vez de current | Media | Fácil | 3 pts | Pendiente |
| #BKL-007 | 6 | Container Queries | Migrar 41 @media queries a @container en Cards/Carousels/Forms/Modals | Baja | Medio | 5 pts | Pendiente |
| #BKL-008 | 7 | Visual Regression | Playwright snapshots (toHaveScreenshot) en home, closet, profile, dialogs | Baja | Medio | 8 pts | Pendiente |
| #BKL-009 | 8 | BEM Completo | Completar BEM en: WeatherThreadIcon, MorphoIcon, OptionPills, ColorSwatches, LazyImage, SmartSkeleton, pasos wizard | Baja | Fácil | 3 pts | Parcial |
| #BKL-010 | 9 | Accessibility Audit Final (WCAG 2.2 AA) | Axe 7 rutas × 2 temas + diálogos + targets 24px + reduced-motion; falta teclado completo y lector de pantalla | Alta | Medio | 5 pts | Parcial |
| #BKL-011 | 10 | Performance Budgets | PurgeCSS + tree-shaking mixins + CI gate <180KB gzip | Media | Fácil | 3 pts | Pendiente |
| #BKL-012 | 11 | Lighthouse CI (LHCI) | CI gate: Perf ≥90, a11y ≥95, Best ≥90, SEO ≥90; necesita .github/workflows | Media | Medio | 3 pts | Pendiente |
| #BKL-013 | 12 | PurgeCSS Integration | Eliminada capa global muerta (17 parciales); CSS 143→104 KB; guardia en main.test.ts | Media | Fácil | 2 pts | Hecho |
| #BKL-014 | 13 | Bundle Analysis en CI | Gate en CI si bundle > 180KB (@next/bundle-analyzer + threshold check) | Media | Fácil | 2 pts | Pendiente |
| #BKL-015 | 14 | Tree-shaking de Mixins SCSS | Refactorizar mixins SCSS a CSS Vars cuando sea posible | Baja | Medio | 3 pts | Pendiente |

---

## Resumen

- **Total items:** 14 (del SDD §11)
- **Pendiente:** 10
- **Parcial:** 2
- **Hecho:** 2 (#BKL-004 color_base, #BKL-013 PurgeCSS)
- **Total esfuerzo:** ~56 story points (~51 restantes estimados)
- **Alta:** 1 | **Media:** 9 | **Baja:** 4

**Prioridad recomendada:**
1. Accessibility Audit Final (Alta)
2. Filtrado por Material en Lluvia (2 pts, Quick win)
3. Outfit para Mañana (3 pts, Quick win)
4. Etiquetado color_base (3 pts, Bloqueante de #2)
