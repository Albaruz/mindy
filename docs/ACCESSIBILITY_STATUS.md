# Accessibility Audit Status - Mindy Smart Closet

## 📊 Estado Actual

### ✅ LO QUE YA ESTÁ HECHO

**Tests de Accesibilidad:**
- ✅ `e2e/a11y.spec.ts` existe y está configurado
- ✅ Usa **Axe Core** (herramienta profesional de auditoría a11y)
- ✅ Pruebas Axe con etiquetas **WCAG 2.2 AA**
- ✅ Cubre 7 rutas de la app en tema claro y oscuro
- ✅ Axe también revisa los diálogos de alta, edición y confirmación del armario
- ✅ Teclado: el diálogo de alta mantiene el foco dentro, cierra con Escape y devuelve el foco al botón que lo abrió
- ✅ Objetivos táctiles: `e2e/a11y-targets-motion.spec.ts` mide los controles visibles en 5 rutas (mínimo WCAG 2.2 AA de 24×24 CSS px)
- ✅ Movimiento reducido: el mismo spec emula `prefers-reduced-motion` y verifica que las animaciones CSS colapsen
- ✅ Última ejecución: 19/19 pruebas Axe/teclado + 10/10 de objetivos/movimiento pasaron
- ✅ Ejecuta en CI/CD automáticamente
- ✅ El test falla y muestra nodos afectados ante cualquier infracción Axe

**ARIA & Semantic HTML:**
- ✅ `ColorSwatches.tsx` - `role="radiogroup"` + `aria-label`
- ✅ `FilterChips.tsx` - `role="group"` + `aria-pressed` + `aria-label`
- ✅ `Button.tsx` - `aria-busy`, `aria-disabled`
- ✅ `BottomActionBar.tsx` - `role="group"` + `aria-label` + `aria-hidden` (decorative)
- ✅ `TopNavigation.tsx` - `role="tablist"`, `role="tab"`, `aria-current="page"`
- ✅ Focus management: `useDialogFocus` hook con `tabIndex={-1}` en dialogs

**Tests Unitarios de a11y:**
- ✅ `FilterChips.test.tsx` - Verifica `aria-pressed`
- ✅ `ColorSwatches.coverage.test.tsx` - Verifica `aria-hidden`
- ✅ `Button.test.tsx` - Verifica `aria-busy`
- ✅ `useDialogFocus.test.tsx` - Verifica focus trap en dialogs

---

### ❌ LO QUE FALTA (Por Completar el Audit)

### 📋 Tareas pendientes: prioridad y complejidad

Las prioridades y complejidades son estimaciones para planificar el audit. Los puntos marcados **Por verificar** no implican que ya se haya confirmado un defecto; requieren revisión de la app.

| # | Tarea | Qué falta por hacer | Prioridad | Complejidad | Estado |
|---|---|---|---|---|---|
| 1 | Navegación por teclado | Recorrer las rutas clave con Tab, Shift+Tab, Enter, Espacio y Escape; corregir problemas de orden, activación o trampas de foco. | Alta | Media | Hecho (2026-10-15, Chrome MCP): recorrido Tab completo en /es/generator (skip-link → tabs → acciones, sin trampas); diálogos con focus trap en e2e |
| 2 | Indicadores de foco | Comprobar que el foco sea visible y no quede oculto, también en temas claro y oscuro; corregir los componentes que fallen. | Alta | Media | Hecho (2026-10-15, Chrome MCP): anillo :focus-visible verificado con captura en claro y oscuro |
| 3 | Contraste de color | Medir texto, controles y estados en temas claro y oscuro; corregir las combinaciones que no alcancen WCAG 2.2 AA. | Alta | Media | Hecho (2026-10-15, Chrome MCP): detectado 2.36 en pestaña activa dark; corregido `--navigation-text-active` a `--color-primary-contrast`; re-audit Lighthouse a11y 100 en 7 rutas |
| 4 | Prueba con lector de pantalla | Revisar nombres, roles, instrucciones, errores y anuncios dinámicos en los flujos principales con NVDA u otro lector disponible. | Alta | Alta | Pendiente de prueba manual |
| 5 | Cobertura de rutas | Identificar las rutas existentes que faltan y añadirlas a `e2e/a11y.spec.ts`; ejecutar el test con autenticación de prueba configurada. | Media | Media | Parcial: 7 rutas configuradas y probadas en ambos temas; quedan flujos no cubiertos por la lista de rutas |
| 6 | Tamaño de objetivos táctiles | Revisar controles pequeños en móvil y comprobar el mínimo WCAG 2.2 AA de 24×24 CSS px (44×44 px es una recomendación de comodidad); ajustar los que no cumplan. | Media | Media | Parcial: test automático en 5 rutas; corregidos los enlaces de navegación (medían 20×32px); falta revisar excepciones si aparecen casos nuevos |
| 7 | Movimiento reducido | Revisar animaciones y transiciones con `prefers-reduced-motion: reduce` y desactivar o reducir las no esenciales cuando corresponda. | Media | Media | Parcial: test automático en 5 rutas con la preferencia emulada, sin animaciones CSS supervivientes; el JS usa `MotionConfig reducedMotion="user"` |

---

#### 1. **Cobertura de Rutas**
Estas rutas tienen tests Axe en ambos temas:
```
✅ /es/generator
✅ /es/closet
✅ /es/calendar
✅ /es/profile
✅ /es/profile/onboarding
✅ /es/forgot-password
✅ /es/reset-password
```

La ruta de ajustes redirige al perfil y no se duplica. La ruta raíz muestra el flujo de acceso, pero redirige a usuarios autenticados; ese flujo no está cubierto por esta configuración autenticada.

---

#### 2. **Focus Visible (Indicator de Foco)**
La automatización ahora comprueba el destino del foco en algunos diálogos, pero no determina por sí sola si el indicador visual tiene contraste suficiente.
```
✅ Se prueba el foco inicial y la restauración en diálogos del armario
✅ Verificado visualmente con Chrome (2026-10-15): anillo `:focus-visible` visible en botón principal en claro y oscuro (capturas)
```

**Qué hacer:** 
- Revisar que TODOS los elementos interactivos (botones, inputs, links) tengan `outline` o `:focus-visible` visible
- Especialmente importante en **Dark Mode** (contraste)
- Test manual: navegar con TAB y confirmar que el indicador se ve y no queda oculto

---

#### 3. **Contraste de Colores (Dark/Light Mode)**
```
✅ Axe comprueba contraste automatizable en las 7 rutas, en claro y oscuro
✅ Revisión Chrome (2026-10-15): detectado 2.36 en pestaña activa dark (`#ededed` sobre terracotta); corregido `--navigation-text-active` → `--color-primary-contrast`; re-audit Lighthouse a11y 100
```

**Qué hacer:**
- Revisar `src/styles/core/` (variables de color)
- Verificar ratio de contraste en light/dark themes
- Usar herramienta: WebAIM Contrast Checker o axe DevTools

---

#### 4. **Touch Targets**
```
✅ Test automático en 5 rutas (e2e/a11y-targets-motion.spec.ts)
✅ Corregido: los enlaces de navegación medían 20×32px; ahora el enlace ocupa todo el objetivo de 44px
```
**Qué hacer si el test falla:**
- Revisar el elemento reportado (rol, nombre, tamaño)
- Valorar si aplica una excepción WCAG (en línea, esencial, espaciado suficiente)
- Ajustar el componente o documentar la excepción

---

#### 5. **Reduced Motion (Respeta Preferencias)**
```
✅ Fallback global en src/styles/base/_reset.scss + media queries por componente
✅ Test automático: con prefers-reduced-motion emulado, ninguna animación CSS supera 50ms en 5 rutas
✅ Framer Motion usa MotionConfig reducedMotion="user" en navegación, ajustes, armario y wizard
```
**Qué hacer:**
- Si se añade una animación nueva, cubrirla con el fallback global o su media query
- Revisar: OutfitCelebrationScreen, Swiper carousels, notificaciones (ya cubiertos, verificar al tocarlos)

---

#### 6. **Keyboard Navigation Completa**
```
✅ El diálogo de alta del armario mantiene el foco dentro y cierra con Escape
✅ Los diálogos de edición y confirmación cierran con Escape y restauran el foco
✅ Recorrido Tab completo en /es/generator con Chrome (2026-10-15): skip-link → tabs → acciones, orden lógico, sin trampas
```

**Qué hacer:**
- Test manual: Navegar SOLO con TECLADO (Tab, Shift+Tab, Enter, Escape)
- Verificar: botones, inputs, carousels, modals, dropdowns

---

#### 7. **Screen Reader Testing**
```
❌ axe detecta problemas pero NO prueba con screen readers reales
```

**Qué hacer:**
- Test con NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS)
- Verificar: labels, alt text, anuncios dinámicos, form errors
- Importante para: outfit generator, profile form

---

## 📋 Checklist para Completar el Audit

### Fase 1: Ampliar Tests
- [x] Añadir las rutas funcionales identificadas a `e2e/a11y.spec.ts`
- [x] Ejecutar Axe en claro y oscuro, recogiendo todos los impactos
- [x] Verificar las 14 combinaciones ruta/tema

### Fase 2: Focus Visible
- [x] Corregido: `:focus-visible` de navegación movido del `<li>` (nunca recibe foco) al enlace
- [x] Verificado visualmente con Chrome en claro y oscuro (2026-10-15, capturas del botón principal)
- [ ] Revisar el resto de componentes sin anillo explícito (hay fallback global en `_reset.scss`)

### Fase 3: Contraste
- [x] Corregir el contraste del texto secundario en tarjetas del armario
- [x] Ejecutar Axe en las 7 rutas y ambos temas
- [x] Revisión Chrome en 7 rutas (2026-10-15): corregida pestaña activa en dark (2.36 → pass); Lighthouse a11y 96–100

### Fase 4: Touch Targets
- [x] Test automático en 5 rutas (`e2e/a11y-targets-motion.spec.ts`, mínimo 24×24 CSS px)
- [x] Corregidos los enlaces de navegación (20×32px → objetivo completo de 44px)
- [ ] Revisar excepciones si aparecen casos nuevos (en línea, esencial, espaciado)

### Fase 5: Reduced Motion
- [x] Test automático en 5 rutas con la preferencia emulada (ninguna animación CSS supera 50ms)
- [x] Verificado: fallback global en `_reset.scss` + `MotionConfig reducedMotion="user"` en navegación, ajustes, armario y wizard
- [ ] Al añadir animaciones nuevas, cubrirlas con el fallback o su media query

### Fase 6: Keyboard Navigation (2 días)
- [x] Automatizar el ciclo de foco, Escape y restauración de foco en diálogos del armario
- [x] Ejecutar Axe en diálogos de alta, edición y confirmación
- [x] Recorrido Tab manual en /es/generator con Chrome (2026-10-15): orden lógico, sin trampas
- [ ] Extender las pruebas de teclado a otras rutas y componentes

### Fase 7: Screen Reader (2-3 días)
- [ ] Instalar NVDA (gratuito)
- [ ] Test con screen reader en rutas principales
- [ ] Revisar labels, alt text, anuncios

---

## 🎯 Esfuerzo Estimado

**Estado comprobado:** las 7 rutas pasan Axe en tema claro y oscuro; los diálogos de alta, edición y confirmación del armario pasan Axe; también pasan las pruebas de teclado del diálogo y su restauración de foco. Los objetivos táctiles cumplen 24px en 5 rutas y el movimiento reducido colapsa las animaciones CSS. Revisión manual Chrome (2026-10-15): teclado, foco visible y contraste verificados; Lighthouse a11y 96–100. Esto no equivale a una conformidad WCAG completa.
**Pendiente:** lector de pantalla (NVDA) y extender el recorrido de teclado a carruseles y resto de componentes.

Desglose restante (estimado):
- Screen reader testing: 1-2 pts (manual, puede necesitar especialista)

---

## 🚀 Recomendaciones

### Siguiente iteración
1. Probar los flujos principales con NVDA (único pendiente manual)
2. Extender el recorrido de teclado a carruseles y resto de componentes

### Opción B: Audit Exhaustivo (5-7 días)
1. Todas las fases anteriores
2. Screen reader testing completo
3. Documentación WCAG 2.2 AA compliance
4. Certificación potencial

---

## 📖 Referencias

- **axe DevTools:** Auditoría manual en dev tools
- **WAVE:** WebAIM Contrast Checker
- **Lighthouse:** Auditoría automática en Chrome DevTools
- **NVDA:** Screen reader gratuito
- **WCAG 2.2:** https://www.w3.org/WAI/WCAG22/quickref/

---

**Estado actual:** ✅ Auditoría automática ampliada (Axe + teclado + targets + movimiento) + revisión manual Chrome 2026-10-15 (teclado, foco, contraste; a11y 96–100); pendiente solo lector de pantalla  
**Prioridad:** Alta  
**Rutas automatizadas:** 7 en Axe (claro/oscuro) + 5 en targets/movimiento; diálogos del armario con teclado
