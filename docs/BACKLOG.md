# Backlog - Mindy Smart Closet

Tabla con los items del backlog del documento SDD, ordenados por prioridad y dificultad.

| ID | # | Funcionalidad | Descripción | Prioridad | Dificultad | Esfuerzo | Status |
|---|---|---|---|---|---|---|---|
| #BKL-001 | 1 | Filtrado por Material en Lluvia | Rain filters silk/suede candidates (locked pins survive) + rain-safe prompt mandate + x-excluded-rain observability | Media | Fácil | 2 pts | Hecho |
| #BKL-003 | 2 | Similitud en Descartes | garment_feedback escrito pero no leído; evitar combinaciones similares con embeddings | Media | Muy Difícil | 8 pts | Pendiente |
| #BKL-004 | 3 | Etiquetado de color_base | Pipeline de visión escribe `color_base` en extra_tags (derivado del color cerrado) | Media | Fácil | 3 pts | Hecho |
| #BKL-005 | 4 | Starter Wardrobe | Set de 8-12 prendas básicas en onboarding; is_external_garment=true; opt-in/out | Media | Medio | 5 pts | Pendiente |
| #BKL-006 | 5 | Outfit para Mañana | Selector "Hoy/Mañana" en ZeroState; usar forecast[day] en vez de current | Media | Fácil | 3 pts | Pendiente |
| #BKL-007 | 6 | Container Queries | Migrated to @container: app-header nav, TopNavigation pill, dialog-shell, ShowcaseCard; viewport @media kept for PageHeader/header padding, theme and motion | Baja | Medio | 5 pts | Hecho |
| #BKL-008 | 7 | Visual Regression | 8 snapshots Playwright (generador, armario, perfil y diálogo; claro/oscuro) con gate CI | Baja | Medio | 8 pts | Hecho |
| #BKL-009 | 8 | BEM Completo | BEM en WeatherThreadIcon, MorphoIcon, OptionPills, ColorSwatches, LazyImage, SmartSkeleton y pasos wizard (modificadores --selected/--vetoed) | Baja | Fácil | 3 pts | Hecho |
| #BKL-010 | 9 | Accessibility Audit Final (WCAG 2.2 AA) | Axe 7 rutas × 2 temas + diálogos + targets 24px + reduced-motion; falta teclado completo y lector de pantalla | Alta | Medio | 5 pts | Parcial |
| #BKL-011 | 10 | Performance Budgets | Purga hecha (#BKL-013) + gate 180KB en CI pasando (140KB); tree-shaking mixins sigue en #BKL-015 | Media | Fácil | 3 pts | Hecho |
| #BKL-012 | 11 | Lighthouse CI (LHCI) | Gate en CI configurado y pasando (performance 92–94, a11y ≥95); falta histórico de métricas | Media | Medio | 3 pts | Parcial |
| #BKL-013 | 12 | PurgeCSS Integration | Eliminada capa global muerta (17 parciales); CSS 143→104 KB; guardia en main.test.ts | Media | Fácil | 2 pts | Hecho |
| #BKL-014 | 13 | Bundle Analysis en CI | Gate existe (budget script + job CI) y pasa: 140,2/180 KB | Media | Fácil | 2 pts | Hecho |
| #BKL-015 | 14 | Tree-shaking de Mixins SCSS | Pruned dead mixins in _mixins.scss, kept responsive/a11y/form system in use | Baja | Medio | 3 pts | Hecho |

---

## Resumen

- **Total items:** 14 (del SDD §11)
- **Pendiente:** 3
- **Parcial:** 2
- **Hecho:** 9 (#BKL-001, #BKL-004, #BKL-007, #BKL-008, #BKL-009, #BKL-011, #BKL-013, #BKL-014, #BKL-015)
- **Total esfuerzo:** ~56 story points (~46 restantes estimados)
- **Alta:** 1 | **Media:** 9 | **Baja:** 4

**Prioridad recomendada:**
1. Accessibility Audit Final (Alta)
2. Filtrado por Material en Lluvia (2 pts, Quick win)
3. Outfit para Mañana (3 pts, Quick win)
4. Completar Container Queries en Cards/Carousels/Forms (3 pts restantes estimados)
