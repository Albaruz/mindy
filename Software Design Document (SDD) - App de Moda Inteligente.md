# 👗 Mindy Smart Closet — Software Design Document

**App de Moda Inteligente | MVP Full-Feature Deployed**

> **Revisión post-deploy** — Estado verificado contra código en la raíz del repositorio | Next 16.3.8 • React 19.2.8 • Vercel Serverless
> **Fecha:** 2026-10-12

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Experiencia de Usuario](#experiencia-de-usuario)
4. [Base de Datos](#base-de-datos)
5. [Navegación y Vistas](#navegación-y-vistas)
6. [Reglas de Negocio](#reglas-de-negocio)
7. [Arquitectura del Sistema](#arquitectura-del-sistema)
8. [Seguridad y Privacidad](#seguridad-y-privacidad)
9. [Diseño y Accesibilidad](#diseño-y-accesibilidad)
10. [Nuevas Funcionalidades](#nuevas-funcionalidades)
11. [Backlog Restante](#backlog-restante)
12. [Estado del Deploy](#estado-del-deploy)

---

## 🎯 Visión General

**Mindy** es una aplicación PWA inteligente para la gestión del armario digital que:

- 📸 **Digitaliza tu guardarropa** con eliminación automática de fondo
- 🤖 **Recomienda outfits** basados en clima, estilo y colorimetría personal
- 🎨 **Aprende tus preferencias** a través de interacciones (descarte, uso, combinaciones)
- 📱 **Funciona offline** con sincronización inteligente
- 🌍 **Multiidioma** (Español • Inglés) con preferencias locales

**Tecnología base:** Vercel Serverless • Next.js App Router • React 19 • TypeScript • Supabase

---

## 🛠️ Stack Tecnológico

### Core Framework
| Herramienta | Versión | Función |
|---|---|---|
| **Next.js** | 16.3.8 | App Router, SSR, Route Handlers seguros |
| **React** | 19.2.8 | UI declarativa, componentes |
| **TypeScript** | ^5 | Strict mode, seguridad de tipos |
| **pnpm** | 12.8.1 | Gestor de paquetes |

**Scripts disponibles:**
```bash
pnpm dev              # Desarrollo (Turbopack)
pnpm build            # Producción (webpack obligatorio para PWA)
pnpm lint             # ESLint
pnpm typecheck        # TypeScript strict
pnpm test             # Vitest (90% umbral)
pnpm test:e2e         # Playwright
pnpm analyze          # Bundle analysis (<180KB gzip)
```

### Frontend & Estilos

**Sistema de Tokens Automatizado** ✅ (Completado)
- 📁 Definición: `src/styles/tokens/*.json` (11 ficheros)
  - Colors, spacing, typography, radius, shadows, breakpoints, zIndex, durations, easings, touchTargets, layout
- 🔄 Generación: `scripts/build-tokens.ts` → `src/styles/core/_tokens.scss`
- 📌 **Single source of truth:** Todos los valores centralizados

**Arquitectura CSS:**
- SCSS Modules + CSS Custom Properties
- Constantes en `src/constants/*.ts` (11 módulos)
  - ❌ Prohibidos: magic strings en features
- BEM parcial implementado en componentes principales

**Librerías UI:**
| Librería | Versión | Uso |
|---|---|---|
| Swiper | 14.3.0 | Carruseles coverflow |
| Framer Motion | 14.0.0 | Animaciones, Showcase drag-x, celebración |
| Lottie React | 3.1.2 | Micro-animación BottomActionBar |
| Lucide React | 1.49.0 | Iconografía |

### Estado y Datos

**Zustand** (v5.0.15) — State management local
```
useGeneratorStore      // Máquina de estados del generador
useNotificationStore   // Notificaciones (auto-dismiss)
themeStore             // Tema (system/light/dark)
onboardingStore        // Progreso del onboarding
```

**TanStack Query** (v5.104.0) — Caché y sincronización
- Persistencia: IndexedDB (`mindy-query-cache`)
- Expiración: 24h máximo, 30s stale
- Modo: `offlineFirst` (funciona sin conexión)
- Clima: refetch cada 10min
- `refetchOnFocus: false` (no agresivo)
- Adaptadores: `persist-client` + `async-storage-persister` + `idb-keyval`

### Backend & Base de Datos

**Supabase** (PostgreSQL + Auth + Storage)
```
@supabase/ssr       ^0.12.7   // Server-side rendering
@supabase/js        ^2.117.2  // Cliente
```

**Migraciones** (7 en total, 2026-10-02 a 2026-10-08)
1. `create_wardrobe_schema` — Tablas base
2. `garment_storage` — Bucket `garments`
3. `auto_create_profile` — Trigger automático
4. `garment_feedback` — Señales de descarte
5. `closed_vocabularies` — Vocabularios normalizados
6. `bucket_hardening` — Políticas de seguridad
7. `extra_tags_shape` — JSONB para tags IA

### Internacionalización (i18n)

**next-intl** (v4.14.9)
- 🌐 Locales: `en` (default) • `es`
- 📍 Rutas: `[locale]/...` con prefijo siempre
- 🍪 Cookie: `NEXT_LOCALE`
- 📖 Diccionarios: 12 namespaces en `messages/{en,es}.json`
- ⚡ Traducción runtime para atributos DB (ej: nombres de colores)

**Middleware** (`proxy.ts`)
- Auth guard + onboarding guard
- `updateSession` en cada request
- i18n middleware integrado

### PWA & Offline

**next-pwa** (v5.6.0)
```
Manifest: Mindy — Smart Closet
Mode: standalone
Theme: #c87966 (terracota)
Desactivado: en desarrollo
```

**Service Worker + Workbox**
- **Estrategia CacheFirst** para imágenes de prendas
  - Caché: `garment-images` (200 entries, 30 días)
  - Origen: `https://*.supabase.co/storage/*`
- **IndexedDB** para armario sin conexión
- **Persistencia TanStack Query** sincroniza al volver online

### APIs Externas (3 Route Handlers activos)

#### 1️⃣ Clima — `GET /api/weather?lat&lon`
```javascript
Proveedor: OpenWeather API
Datos: current + forecast (8 días)
Paralelo: Promise.all (sin waterfall)
Timeout: 8000ms
Cache: 10 minutos
Rate: 30/hora
Fallback: {fallback: true, temp: 20°C}
Auth: 401 si no hay usuario
```

**Umbrales de negocio:**
- Calor (>25°C) → nunca `winter` al LLM
- Frío (<15°C) o lluvia → fuerza abrigo exterior
- Lluvia (prob >50%) → solo abrigo, NO filtra materiales (pendiente)

#### 2️⃣ Motor de Recomendación — `POST /api/recommender`
```javascript
Proveedor: Groq (openai/gpt-oss-20b)
Modelo: GROQ_MODEL config
Temperatura: 0.3 (determinístico)
Tokens: 1000 máximo
Response: JSON estricto
Timeout: 30000ms
Reintentos: 3 (con Retry-After)
Rate: 5/minuto
Error 422: INSUFFICIENT_STYLE_GARMENTS
```

**Fallback local** (rule-based)
- Trigger: Si falla Groq
- Ratios: [60, 55, 50] suitability
- Headers informativos: `x-groq-model`, `x-fallback`, `x-options-count`
- Amnesia: Los IDs fallback no se persisten (no aprenden)

#### 3️⃣ Análisis de Visión — `POST /api/analyze`
```javascript
Proveedor: Groq Vision (qwen/qwen3.8-27b)
Temperatura: 0 (exacto)
Tokens: 500 máximo (`VISION_MAX_TOKENS`)
Entrada: imageBase64 (máx 7M chars; copia redimensionada)
Timeout: 30000ms
Rate: 30/10 minutos
Salida JSON: {
  category, garmentType, // Categorías cerradas
  style, cutLength,      // Estilo y corte
  color, material, season,
  visualDescription,     // Descripción textual breve para etiquetado/fase 2
  cutoutDifficulty,      // easy / hard / desconocido
  qualityNote            // Motivo breve si la foto es difícil
}
```

Groq Vision analiza y etiqueta la prenda, devuelve una descripción visual
concisa y evalúa la dificultad de recorte. No genera imágenes. La descripción
se obtiene durante la fase 1 y se reutilizará en la fase 2. La imagen original
no se enviará al proveedor de generación.

### Generación de imagen alternativa (PLANIFICADA — fase 2)

La búsqueda de fotografías en catálogos externos queda descartada: no se
integrarán Unsplash, Wikimedia Commons, Pixabay ni otros proveedores de
imágenes de catálogo como fallback. La alternativa prevista será generada a
partir de una descripción de la prenda, no seleccionada de un catálogo.

| Componente | Tecnología prevista | Responsabilidad |
|---|---|---|
| Análisis y descripción | Groq Vision | Etiquetar la prenda y devolver una descripción visual breve, limitada a rasgos observables |
| Generación | Cloudflare Workers AI, modelo `@cf/black-forest-labs/flux-1-schnell` | Crear una imagen de producto de estudio a partir del texto |
| Persistencia | Supabase Storage (`garments`) | Guardar la imagen solo después de que la persona revise y acepte la vista previa |
| Orquestación | Route Handler autenticado de Next.js (propuesta: `POST /api/studio-generate`) | Validar texto/tags, aplicar límite de uso, mantener credenciales en servidor y llamar a Cloudflare |

Cloudflare Workers AI publica una asignación gratuita diaria de 10.000 Neurons
en el plan Free (documentación consultada en octubre de 2026). No equivale a
un número garantizado de imágenes: el consumo depende del modelo/parámetros y
la cuota y sus condiciones pueden cambiar. La feature debe manejar límites,
errores de proveedor y falta de configuración sin bloquear las otras opciones
de subida.

**Privacidad y límites:** solo se enviará la descripción de Groq y atributos
cerrados de la prenda; nunca la foto original. `CLOUDFLARE_ACCOUNT_ID` y
`CLOUDFLARE_API_TOKEN` serán secretos server-only, nunca `NEXT_PUBLIC_*`. La
generación requerirá sesión, validación de entrada, límite de solicitudes y
respuesta no cacheable. La imagen generada se presentará como interpretación
de IA y requerirá confirmación explícita antes de guardarse.

### Quality & Testing

| Tool | Versión | Cobertura |
|---|---|---|
| **Vitest** | 3.2.4 | 90% (líneas/ramas/funciones) |
| **Testing Library** | - | Componentes |
| **Playwright** | 1.49.1 | E2E (Pixel 7, es-ES) |
| **axe-core** | + @axe-core/playwright | a11y |
| **k6** | - | Load testing |

**Specs E2E:**
- `generator.spec.ts` — Flujo completo
- `closet.spec.ts` — Subida y búsqueda
- `laundry.spec.ts` — Cesto y lavado
- `onboarding.spec.ts` — 5 pasos
- `offline.spec.ts` — Modo sin conexión
- `a11y.spec.ts` — Accesibilidad (actualmente skip)
- `auth.setup.ts` — Autenticación

**Performance Baseline** (`PERFORMANCE_BASELINE.md` - 2026-10-10)
```
Recomendador (pre-auth): p95 = 41ms
Clima (pre-auth): p95 = 35ms

K6 Recomendador: 1→5→10 VUs, p50<3s p95<8s, <5% errores, fallback <30%
K6 Clima: 5→20→50 VUs, p50<500ms p95<1500ms, <2% errores
```

### Seguridad en Headers

**next.config.js:**
- HSTS (Strict-Transport-Security)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- CSP (Content Security Policy)

---

## 👥 Experiencia de Usuario

### 🧙 Onboarding (Wizard de 5 Pasos)

```
Paso 1: Welcome         → Introducción + arte SVG
Paso 2: Identity        → Nombre + foto de perfil
Paso 3: Morphology      → Medidas (pecho, cintura, cadera)
Paso 4: Colorimetry     → Dos vías:
                          a) Directa: piel/ojo/pelo
                          b) Indirecta: tipo de joyería (oro/plata)
Paso 5: Fine Tuning     → Preferencias (fit, lifestyle, estilo)
        
Resultado: Paleta estacional (spring/summer/autumn/winter)
Visualización: PaletteFan + MorphoIcon
```

**Inferencia indirecta de colorimetría:**
- Pregunta: "¿Qué metal te favorece más? (Oro / Plata)"
- Lógica: `inferColorimetry(skinTone, jewelry) → SEASON_PALETTES`
- Legacy: `inferProfile(skin/eye/hair + measures)` aún activo
- Pendiente: Test de venas, preguntas indirectas de morfología

### 👕 Digital Closet

**Pipeline de subida:**
1. 📷 Captura/selecciona foto
2. 🎯 Análisis automático con vision IA
   - Envía: `POST /api/analyze` con imagen redimensionada
   - Recibe: tags de prenda y evaluación de dificultad/calidad de la foto
3. ✅ Si Vision considera que el recorte es fácil, se elimina el fondo automáticamente.
   - El original se reduce a un máximo de 1024 px por lado antes de ejecutar
     `@imgly/background-removal`, para reducir memoria y tiempo de proceso.
   - Primero se usa el Web Worker; si falla, se usa el fallback en el hilo
     principal. El resultado final se normaliza a 300 px de ancho para Storage.
4. ⚠️ Si Vision marca la foto como difícil, detener la subida y abrir la modal
   con el motivo (si está disponible) y consejos breves:
   - fondo neutro que contraste con la prenda;
   - luz uniforme, sin sombras fuertes;
   - prenda completa, enfocada y sin nada que la tape.
5. La modal ofrece estas acciones, en este orden:
   - **Elegir otra (Recomendado):** cierra la modal y abre la selección de
     cámara o galería; no persiste la selección pendiente.
   - **Usar la foto tal cual:** conserva el fondo, normaliza la imagen y la
     guarda como PNG.
   - **Probar a quitar el fondo:** ejecuta el mismo procesamiento; si los dos
     intentos fallan, mantiene la modal abierta para que la persona elija otra
     acción.
   - La generación de imagen con IA todavía no se muestra ni ejecuta. Su
     implementación queda anotada como TODO en el código para la fase 2.
6. Cerrar con Escape o con el botón de cierre descarta la foto pendiente. No se
   guarda ni se sustituye una imagen sin una decisión explícita.
7. 💾 Almacenamiento: `garments/user_id/uuid.png` en Supabase Storage
8. 🏷️ Edición de tags
   - Tags IA automáticos: `aiCategory`, `specificType`, `colorShade`
   - Tags extra: key/value customizados (límites configurables)
   - Editor visual con chips `ExtraTagsEditor`

**Fase 2 — generación de alternativa con IA (pendiente):**
1. Reutilizar la descripción concisa, solo textual, que Groq Vision produjo
   durante el etiquetado en la fase 1: rasgos visibles de la prenda (tipo,
   silueta, color, material, patrón y detalles relevantes; sin persona, pose
   ni fondo).
2. Al elegir **Generar alternativa con IA**, el servidor envía la descripción
   obtenida por Groq en la fase de etiquetado y tags validados a Cloudflare
   Workers AI / FLUX.1 Schnell; no envía la foto.
3. Mostrar la imagen generada en una vista previa, claramente identificada
   como generada por IA. Permitir aceptarla, generar otra o volver a las
   opciones anteriores. No sustituir ni guardar nada automáticamente.
4. Al aceptar, guardar la imagen generada en Supabase Storage y asociar
   metadatos de procedencia; conservar las etiquetas de la prenda original.
5. Si el proveedor no está configurado, agota su cuota o falla, informar sin
   perder la posibilidad de usar la foto original, eliminar el fondo o cambiar
   la foto.

**Accesibilidad y pruebas de la modal:** foco gestionado y contenido anunciado
por lector de pantalla; operable con teclado; acciones con nombres inequívocos;
mensajes de carga/error; traducciones EN/ES. Cubrir fotos fáciles/difíciles,
cada elección, cancelación, fallo de eliminación de fondo y cambio de foto.

**Búsqueda y filtrado:**
- 🔍 Buscador cliente (sin servidor)
- Tokens AND, tolerante a plurales/guiones
- Insensible a mayúsculas y tildes
- Busca en: tipo, color (incluido `color_base`), estilo, material, categoría
- Clasificación bilingüe EN/ES automática

**Ordenamiento:**
- Por fecha (más reciente primero)
- Por frecuencia de uso
- Segmentado por estado (todos/limpios/sucios)

### ⚙️ Generador (Máquina de 5 Estados)

```
[Zero State] → [Auto-select] → [Loading] → [Showcase] → [Manual]
                                                   ↓
                                        [Celebrate] (confetti)
```

**Zero State:**
- Diálogo conversacional
- Muestra clima actual + próximos 8 días
- Pregunta: "¿Qué estilo te apetece hoy?"
- Link a "Mi Armario" si está vacío

**Auto-select:**
- Selecciona estilo deseado
- `LOOK_STYLE_TO_MOOD` mapping
- Valida stock de prendas limpias

**Loading:**
- SmartSkeleton contextuales (top/bottom/footwear/outerwear/brand)
- SVG `THREAD_PATHS` para coherencia visual
- `role=status` para screen readers

**Showcase:**
- Tarjetas deslizables (Swiper coverflow)
- Gestos: 
  - Derecha → "Me lo pongo hoy" (positivo)
  - Izquierda → "Cambiar" (negativo)
- Overlays: ✓ (verde) / ✗ (rojo)
- Muestra `reason` (por qué lo recomienda)
- Presupuesto de descartes: `MAX_DISCARD_COUNT` (para evitar frustración)
- Empty state si se agota: "No hay más combinaciones"

**Manual:**
- 4 carruseles paralelos: Top • Bottom • Footwear • Outerwear
- Swiper con opciones (2-3 por carrusel si hay lock)
- Lock/unlock por prenda
- Edit-in-manual: toma los carruseles actuales como look inicial
- Reset: limpia todo

### 🎉 Celebración

- Confetti terracota con framer-motion (no Lottie)
- `OutfitCelebrationScreen`
- Retroalimentación positiva de UX

### 📅 Historial (Calendario)

- Agrupado por mes (`Intl.DateTimeFormat en-US/es-ES`)
- Join: `outfit_history + garments`
- Tarjetas con preview de prendas usadas
- Empty state si no hay historial

### ⚙️ Perfil & Ajustes

**Bento Layout:**
- PaletteFan (paleta estacional)
- MorphoIcon (representación de medidas)
- Preferencias (fit/lifestyle)

**Controles:**
- **Idioma:** Píldoras EN/ES (solo dispositivo)
- **Tema:** system/light/dark (iconos Monitor/Sun/Moon)
- Ambas preferencias en localStorage (`mindy-theme-mode`)

**Cesto de Ropa Sucia:**
- Integrado en perfil + acceso desde closet
- Visualización de prendas sucias
- Lavar individual: `useWashGarment` (descuenta 1)
- Lavar todo: `useDoLaundry` (marca `is_dirty=false` en todos)

### Interacciones Clave

#### ✅ "Me lo pongo hoy"
- **Acción:** Refuerzo positivo
- **Efecto:** 
  - Inserta en `outfit_history {user_id, garment_ids, worn_date}`
  - Marca `is_dirty=true` (excepto footwear/outerwear)
  - Invalida caché (GARMENTS + HISTORY)
  - Muestra celebración
- **Datos:** Look completo con `withoutHiddenBottom()`

#### ❌ "Cambiar Prenda"
- **Acción:** Refuerzo negativo
- **Efecto:**
  - Exclusión efímera (`dismissedGarmentIds` en estado)
  - Inserta en `garment_feedback {signal: 'dismissed'}`
  - IDs fallback no se persisten (amnesia)
- **Presupuesto:** `MAX_DISCARD_COUNT` antes de EmptyState

#### 🔒 Fijar/Combinar
- **Prenda fijada:** IA recarga carruseles (2-3 opciones cada uno)
- **Cálculo:** Ranking por `suitabilityRatio` (0-100 clamped)
- **Lock:** `toggleLock`, `toggleLockGarment`, `unlockAll`
- **Combinación:** `useCombineLocked` con `lockedGarmentIds+fixed_garments`

#### 🔄 Reset
- `resetFlow`: cero + limpia todo (slots, aiLooks, descarte, celebración, fallback)
- `resetCanvas`: solo slots (manteniendo estado)
- `unlockAll`: desbloquea prendas

---

## 💾 Base de Datos (PostgreSQL)

### Tablas Principales

#### `profiles`
```sql
user_id (PK → auth.users)
skin_tone              text
eye_color              text
hair_color             text
chest_cm, waist_cm, hip_cm  integer
colorimetry            text (spring/summer/autumn/winter)
morphology             text
preferred_fit          text
lifestyle              text
extra_preferences      jsonb
-- RLS: Solo filas propias
-- Trigger: auto-create al registrarse
```

#### `garments`
```sql
garment_id (PK)        uuid
user_id (FK)           → profiles
image_url              text (Supabase Storage)
garment_type           text (enum normalizado)
style                  text
cut_length             text
color                  text
material               text
season                 text (summer/winter/mid_season/all)
is_dirty               boolean (default false)
is_external_garment    boolean (starter wardrobe)
last_worn_date         timestamp
extra_tags             jsonb {
                         aiCategory: string
                         specificType: string
                         colorShade: string
                         color_base?: string  // pendiente escritura
                         [key: string]: any
                       }
-- RLS: Solo filas propias
-- Índice GIN en extra_tags
```

#### `outfit_history`
```sql
look_id (PK)           uuid
user_id (FK)           → profiles
garment_ids            uuid[]
worn_date              date
created_at             timestamp
-- RLS: Solo filas propias
```

#### `garment_feedback` (Nueva)
```sql
feedback_id (PK)       uuid
user_id (FK)           → profiles
garment_id (FK)        → garments
signal                 enum ('dismissed')
created_at             timestamp
-- Uso: Registra descartes (solo escritura, lectura pendiente)
-- Planned: Similitud, embeddings
```

### Políticas de Seguridad

- **RLS (Row Level Security):** Activo en las 4 tablas
  - Solo lectura/escritura de filas propias
- **Storage Hardening:**
  - Bucket `garments` con políticas endurecidas
  - Acceso solo a `garments/user_id/*`
- **Validación:**
  - Vocabularios cerrados para `garment_type`, `style`, etc.
  - `extra_tags` tipado con GarmentExtraTags

---

## 🗺️ Navegación y Vistas

### Estructura de Rutas
```
/[locale]
├── (auth)/
│   ├── login
│   ├── forgot-password
│   ├── reset-password
│   └── auth/callback
├── onboarding/
│   ├── step-1
│   ├── step-2
│   ├── step-3
│   ├── step-4
│   └── step-5
├── generator          (Home - Máquina de estados)
├── closet             (Mi Armario - Grid + Búsqueda)
├── calendar           (Historial por mes)
└── profile            (Perfil + Ajustes + Cesto)
```

### Guardias de Navegación

**`proxy.ts` middleware:**
1. ¿Está autenticado?
   - NO → Redirige a `/login` (excepto rutas públicas)
2. ¿Completó onboarding?
   - NO → Redirige a `/onboarding/step-1`
   - SÍ → Permite acceso a rutas privadas

**Rutas públicas (sin auth):**
- `/`, `/forgot-password`, `/reset-password`, `/auth/callback`

### Componentes de Navegación

#### AppHeader
- Logo `logo-mindy.svg`
- Skip-link: `#main-content`
- NotificationContainer
- Atributo `lang={locale}`

#### TopNavigation (Píldora animada)
```
[Generador] [Armario] [Calendario] [Perfil]
    ↑ active (motion.span layoutId)
```
- `role=tablist/tab`
- `aria-current="page"` en activo
- Animación fluida con Framer Motion

#### BottomActionBar (Centro de mandos)
- Lottie micro-animación
- Botones contextuales según vista
- Touch targets ≥44px

#### NotificationContainer
- Píldoras auto-dismiss (`NOTIFICATION_DURATION_MS`)
- `crypto.randomUUID` por notificación
- Animación slideDown
- Copys con personalidad

---

## 📏 Reglas de Negocio

### ☀️ Clima y Confección

| Condición | Acción | Notas |
|---|---|---|
| Calor (>25°C) | Nunca `winter` al LLM | `applyHeatRule` |
| Frío (<15°C) | Fuerza abrigo exterior | Si hay stock |
| Lluvia (prob>50%) | Fuerza abrigo exterior | Material NO se filtra (pendiente) |

**Funciones:**
- `isRainyWeather(condition, rainProb)` — Detecta lluvia
- `shouldShowOuterwear(stock)` — Valida disponibilidad
- `applyHeatRule(season)` — Excluye winter

### 👔 Estilo Estricto (Automático)

- **Keywords:** `casual`, `formal`, `sport`, `elegant`, `streetwear`, `party` + aliases legacy
- **Matching:** Insensible a tildes, case-insensitive
- **Pool:** `eligible.filter(locked || matches_style)`
- **Error:** Si pool < mínimo → `422 INSUFFICIENT_STYLE_GARMENTS`
- **Manual:** Ignora restricción de estilo (`style: null`)

### 👗 Una Sola Pieza

- **Detección:** `isOnePieceGarment(dress + ONE_PIECE_KEYWORDS)`
- **Keywords:** `dress`, `gown`, `jumpsuit`
- **Efecto:** 
  - Oculta carrusel "Bottom"
  - Excluye bottom de `firstLook`, guardado, fallback, `canBuildLook`

### 🧺 Cesto Selectivo (Laundry Exemption)

- **Exentos de ensuciarse:** Footwear + Outerwear
- **Efecto:**
  - NO se marcan `is_dirty=true` al "Me lo pongo hoy"
  - Se excluyen del cesto visual
  - Se excluyen de `cleanGarments` en el generador

### ⭐ Suitability Ratio

- **Cálculo:** LLM ordena opciones por score (0-100 clamped)
- **Persistencia:** Se guarda en `AiLook`
- **Visualización:** NO se muestra como % (solo se muestra `reason`)
- **Fallback:** Ratios estáticos [60, 55, 50]

---

## 🏗️ Arquitectura del Sistema

### Paradigma: Funcional Declarativa

**React 19 + TypeScript**
- Componentes puros (functional components)
- Props tipadas estrictamente
- Hooks custom bien documentados
- `use()` para suspense

### Estructura de Carpetas

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   ├── onboarding/
│   │   ├── generator/
│   │   ├── closet/
│   │   ├── calendar/
│   │   └── profile/
│   ├── api/
│   │   ├── weather/
│   │   ├── recommender/
│   │   └── analyze/
│   ├── layout.tsx          (Root)
│   └── globals.scss
├── features/               (Feature-Driven)
│   ├── generator/
│   ├── closet/
│   ├── profile/
│   └── onboarding/
├── components/             (UI Kit — Tonto)
│   ├── TopNavigation/
│   ├── BottomActionBar/
│   ├── GarmentCard/
│   └── ...
├── lib/
│   ├── ai/
│   │   ├── prompts/system/ (puras, versionadas *.v1.ts)
│   │   ├── engine.ts       (Groq SDK + retry + parsing)
│   │   └── ...
│   ├── db/                 (Supabase queries)
│   ├── hooks/              (Custom hooks)
│   ├── logger.ts           (Observabilidad)
│   └── utils/
├── types/                  (TypeScript interfaces)
├── constants/              (SSOT — 11 módulos)
│   ├── ai.ts
│   ├── profile.ts
│   ├── ui-config.ts
│   ├── validation.ts
│   ├── generator.ts
│   ├── animations.ts
│   ├── weather.ts
│   ├── api.ts
│   ├── query.ts
│   ├── geo.ts
│   └── storage.ts
└── styles/
    ├── tokens/            (Definiciones JSON)
    ├── core/
    │   └── _tokens.scss   (Generado)
    ├── components/        (SCSS Modules)
    └── mixins/
```

### Paradigma de Datos

**IA Desacoplada:**
```
src/lib/ai/
├── prompts/system/
│   ├── garmentAnalysis.v1.ts    (vision)
│   └── lookRecommender.v1.ts    (recomendación)
├── engine.ts                     (groq-sdk + parsing + retry)
└── route handlers
    ├── /api/analyze
    ├── /api/recommender
    └── Reglas clima/estilo + fallback
```

**Prompts puros (sin side effects):**
- Versionados (`*.v1.ts`)
- No contienen lógica de retry
- Strings interpolados seguramente

**Engine.ts:**
- Llamadas Groq SDK
- Parsing JSON estricto
- Retry con backoff exponencial
- Timeout configurable

**Route Handlers:**
- Controlador HTTP
- Aplica reglas de negocio
- Orchestrates fallback
- Returns JSON tipado

### Persistencia Offline

```
TanStack Query
    ↓
persist-client
    ↓
async-storage-persister
    ↓
idb-keyval (IndexedDB)
```

- Clave: `mindy-query-cache`
- Modo: `offlineFirst`
- Expiración: 24h
- Service Worker: CacheFirst para Storage

---

## 🔒 Seguridad y Privacidad

### Autenticación

- **Proveedor:** Supabase SSR
- **Requerida:** Desde login (sin anónimo)
- **Session:** `getUser()` + `updateSession()` en middleware
- **APIs:** 401 si no hay usuario

### Autorización

- **RLS:** Activo en todas las tablas
  - Solo lectura/escritura de filas propias
- **Storage:** Políticas endurecidas
  - Bucket `garments` con restricciones por `user_id`
- **Prompts:** Nunca expuestos al cliente (solo vía Route Handlers)

### Rate Limiting

| Endpoint | Límite | Timeout |
|---|---|---|
| `/api/weather` | 30/hora | 8000ms |
| `/api/recommender` | 5/minuto | 30000ms |
| `/api/analyze` | 30/10min | 30000ms |

**Validación de entrada:**
- `imageBase64 ≤ 7M` caracteres
- Tags: `TAG_KEY_MAX` / `TAG_VALUE_MAX`
- Medidas: `MEASUREMENT_MIN/MAX_CM`
- Contraseña: `PASSWORD_MIN` caracteres

### Headers de Seguridad

```javascript
// next.config.js
HSTS                       // Strict-Transport-Security
X-Content-Type-Options:    nosniff
X-Frame-Options:           DENY
CSP                        // Content Security Policy
```

---

## 🎨 Diseño y Accesibilidad

### Dirección de Arte

**Concepto:** Minimalista, protagonismo de la ropa

**Paleta "Refugio Cálido":**
| Color | Hex | Uso |
|---|---|---|
| Avena | `#F9F6F0` | Fondo claro + superficies en ambos modos |
| Cacao Oscuro | `#0A0A0A` | Fondo oscuro |
| Cacao Lienzo | `#1E1A18` | Lienzos/auth |
| Terracota (Acento) | `#C87966` | Botones, acciones, confetti |
| Marrón Ceniza (Texto) | `#4A3F39` | Texto principal |

**Tipografía:**
- Serif alto contraste en encabezados
- Tipografía standard en body (legibilidad)

**Dark Mode:**
- Activado por `[data-theme]`
- CSS Custom Properties reactivas
- Reduce fatiga visual

### Componentes Accesibles

| Componente | ARIA | Notas |
|---|---|---|
| TopNavigation | `role=tablist/tab`, `aria-current` | Indicador activo animado |
| BottomActionBar | `aria-label` | Botones contextuales |
| ShowcaseCard | `role=status` | Retroalimentación de gestos |
| CarouselSwiper | `aria-label`, `allowTouchMove` | Lock previene scroll accidental |
| SmartSkeleton | `role=status` | Indicador de carga |
| Dialog | `useDialogFocus` | Focus trap, ESC para cerrar |
| Progreso onboarding | `aria-valuenow` | % completado |

### Touch Targets

- Mínimo recomendado: **44px²** (tokens `touchTargets`)
- Implementado en: botones, carruseles, tabs, cards

### Prefiere Movimiento Reducido

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Skip Link

- ID: `#main-content`
- Visible al tabbing
- Salta navegación principal

### Accesibilidad Pendiente

- ✅ Infraestructura lista
- ⏳ Audit final WCAG 2.2 AA (spec axe en skip)
- Falta seed con auth para specs E2E a11y

---

## ✨ Nuevas Funcionalidades Añadidas

### 🧙 Onboarding Mejorado
- **Antes:** 3 pasos
- **Ahora:** 5 pasos completos
- **Nuevo:** Arte SVG contextuado
- **Nuevo:** Inferencia indirecta por joyería (oro/plata → paleta)
- **Visual:** `PaletteFan` + `MorphoIcon`

### 🎯 Generador Avanzado
- **Estados:** Zero → Auto-select → Loading → Showcase → Manual
- **Showcase:** Swipe left/right con overlays (✓/✗)
- **Presupuesto:** `MAX_DISCARD_COUNT` para evitar frustración
- **Edit-in-manual:** Toma look actual como punto de partida
- **Reset:** `resetFlow`, `resetCanvas`, `unlockAll`
- **Celebración:** Confetti con Framer Motion

### 📊 Historial de Looks
- **Visualización:** Calendario agrupado por mes
- **Query:** Join `outfit_history + garments`
- **Formato:** Tarjetas con miniaturas de prendas
- **Internacionalización:** Fechas en locale actual

### 🔍 Búsqueda Inteligente
- **Tipo:** Client-side (sin servidor)
- **Matching:** Tokens AND, tolerante a plurales/guiones
- **Case:** Insensible a mayúsculas y tildes
- **Campos:** Tipo, color, estilo, material, categoría
- **Bilingüe:** EN/ES automático

### 🏷️ Editor de Tags IA
- **Automáticos:** `aiCategory`, `specificType`, `colorShade`
- **Personalizados:** Key/value con límites configurables
- **UI:** Chips editables en modal `ExtraTagsEditor`
- **Validación:** Vocabularios cerrados

### 📷 Ayuda con fotos difíciles (fase 1 — completada)
- Groq Vision analiza la foto original antes de ejecutar la eliminación de fondo y devuelve etiquetas, una descripción breve y la dificultad de recorte.
- Si la foto es difícil, una modal accesible explica el problema y recomienda un fondo neutro con contraste, luz uniforme y mostrar la prenda completa y enfocada.
- Acciones, en orden: **Elegir otra (Recomendado)**, **Usar la foto tal cual** y **Probar a quitar el fondo**.
- Para fotos fáciles se mantiene la eliminación automática. Las fotos grandes se reducen a 1024 px para el procesamiento y a 300 px para Storage.
- Si fallan el worker y el fallback, la modal conserva las alternativas. La acción de generación IA no se muestra; queda como TODO de la fase 2.

### 🧺 Cesto Selectivo
- **Exentos:** Footwear + Outerwear (no se ensucian)
- **Individual:** `useWashGarment` (descuenta 1)
- **General:** `useDoLaundry` (marca todos como limpios)
- **Ubicación:** Accesible desde perfil + closet

### 🎨 Configuración de Tema
- **Opciones:** system / light / dark
- **Iconos:** Monitor / Sun / Moon
- **Persistencia:** localStorage (`mindy-theme-mode`)
- **Scope:** Solo dispositivo (sin sincronizar)

### 🌐 Multiidioma
- **Locales:** Español + Inglés
- **Diccionarios:** 12 namespaces
- **Traducción runtime:** Atributos DB bilingües
- **Clasificación:** Insensible a tildes

### ⚡ Performance
- **Tokens:** Pipeline automatizado (11 ficheros JSON → SCSS)
- **Background Removal:** Web Worker con CDN (zero bundle)
- **Cache:** CacheFirst en Storage (200 entries, 30d)
- **Offline:** IndexedDB + TanStack persist
- **Baseline:** Publicado en `PERFORMANCE_BASELINE.md`

### 📈 Observabilidad
- **Provider:** Vercel OTEL (`@vercel/otel`)
- **Logger:** `src/lib/logger.ts` centralizado
- **Load Testing:** k6 scripts (recommender + weather)
- **Bundle:** `@next/bundle-analyzer` (<180KB gzip)

---

## 📋 Backlog Restante

### 🎯 Funcionalidades de Negocio

#### 1. Filtrado por Material en Lluvia (PENDIENTE)
```
Situación actual: Lluvia → fuerza abrigo, NO filtra materiales
Necesidad: isRainy → excluir suede, silk, etc.
Estimación: 2 puntos
```

#### 2. Generación de alternativa con IA (PENDIENTE — fase 2)
```
Estado: pendiente; la fase 1 de evaluación de calidad e interacción ya está implementada.
Objetivo: generar una fotografía alternativa de producto cuando la persona no quiera usar la foto difícil.
Tecnología: Groq Vision → Cloudflare Workers AI / FLUX.1 Schnell (`@cf/black-forest-labs/flux-1-schnell`) → Supabase Storage.
Entrada: reutilizar la descripción de la prenda guardada en el resultado de Groq y sus tags validados. Nunca enviar la foto original al generador.
Interacción: volver a añadir una acción «Generar alternativa con IA» en la modal; generar y mostrar una vista previa etiquetada como IA; permitir aceptar, generar otra o volver a las opciones.
Persistencia: guardar en Supabase Storage y registrar procedencia solo tras la aceptación explícita.
Seguridad: credenciales `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` solo en servidor; endpoint autenticado, validación y límite por usuario.
Resiliencia: gestionar timeout, cuota gratuita diaria, falta de configuración y errores sin desactivar las opciones de fase 1.
Nota: la cuota de 10.000 Neurons/día publicada por Cloudflare puede cambiar y no define una cantidad fija de imágenes.
Estimación: por determinar.
```

#### 3. Similitud en Descartes (PENDIENTE)
```
Situación: garment_feedback escrito pero nunca leído
Necesidad: Evitar combinaciones similares usando historial
Técnica: Embeddings + cosine similarity
Estimación: 8 puntos
```

#### 4. Etiquetado de color_base (PENDIENTE)
```
Situación: Leído en búsqueda/recomendador, pero no escrito
Necesidad: Vision IA debe extraer color_base en extra_tags
Dependencia: #3 (similitud) usa color_base como atributo
Estimación: 3 puntos
```

#### 5. Starter Wardrobe (PENDIENTE - NUEVO)
```
Concepto: Set de prendas básicas en onboarding
Beneficio: Generador funciona desde día 1
Detalles:
  - Catálogo: 8-12 prendas neutras + esenciales
  - Flag: is_external_garment=true
  - Opt-in/out: Usuario decide
  - Métrica: No ensucia datos reales
Estimación: 5 puntos
```

#### 6. Outfit para Mañana (PENDIENTE - NUEVO)
```
Concepto: Generar look basado en clima del día siguiente
Ventaja: Planificación anticipada
Cambios:
  - Selector: "Hoy / Mañana" en ZeroState
  - Datos: forecast[day] en vez de current
  - Copy: "Mañana hará X°C"
Estimación: 3 puntos
```

### 🎨 Arquitectura CSS

#### Container Queries (PENDIENTE)
```
Estado: 7 hits @container vs 41 @media
Componentes: TopNavigation, AppHeader, ConfirmDialog, ShowcaseCard
Beneficio: Diseño responsive intrinsic
Estimación: 5 puntos
```

#### Visual Regression (PENDIENTE)
```
Herramienta: Playwright snapshots (toHaveScreenshot)
Estado: 0 snapshots en e2e/
Cobertura: Crítica (home, closet, profile, dialogs)
Estimación: 8 puntos
```

#### BEM Completo (PARCIAL)
```
Implementado: ConfirmDialog, BottomActionBar, EmptyState, TopNavigation
Pendiente:
  - WeatherThreadIcon
  - MorphoIcon
  - OptionPills
  - ColorSwatches
  - LazyImage
  - SmartSkeleton
  - Pasos wizard
Estimación: 3 puntos
```

### 🛡️ Quality Gates

#### Accessibility Audit Final (PENDIENTE)
```
Checklist WCAG 2.2 AA:
  - Foco visible: ✅ (ready)
  - Contraste dark/light: ⏳
  - Touch targets ≥44px: ✅ (tokens)
  - ARIA: ✅ (carousels, dropdowns ready)
  - Reduced motion: ✅ (media query)
Spec: e2e/a11y.spec.ts (actualmente skip, necesita seed auth)
Estimación: 5 puntos
```

#### Performance Budgets (PENDIENTE)
```
Estado: Solo medición, sin gate
Meta: <180KB gzip
Falta: PurgeCSS, tree-shaking mixins, CI gate
Estimación: 3 puntos
```

#### Lighthouse CI (PENDIENTE)
```
Herramienta: lighthouserc + LHCI
Umbrales:
  - Performance: ≥90
  - Accessibility: ≥95
  - Best Practices: ≥90
  - SEO: ≥90
Infraestructura: `.github/workflows` (no existe aún)
Estimación: 3 puntos
```

### ⚡ Performance & Optimización

#### PurgeCSS (PENDIENTE)
```
Beneficio: Eliminar CSS no usado
Bundle actual: <180KB gzip (sin PurgeCSS)
Herramienta: purgecss + webpack plugin
Estimación: 2 puntos
```

#### Bundle Analysis en CI (PENDIENTE)
```
Estado: Local (`pnpm analyze`) solamente
Necesidad: Gate en CI (fallar si >180KB)
Herramienta: @next/bundle-analyzer + threshold check
Estimación: 2 puntos
```

#### Tree-shaking de Mixins (PENDIENTE)
```
Situación: Mixins SCSS no se tree-shake
Impacto: Pequeño (pero acumulativo)
Solución: Refactorizar a CSS Vars cuando sea posible
Estimación: 3 puntos
```

---

## 🚀 Estado del Deploy

### Ubicación
- **Proveedor:** Vercel Serverless (native)
- **Rama:** `main` (limpia)
- **Commit:** `3c41951` (2026-10-10)
  - Observability + cache + bundle + load test baseline
- **Configuración:** Sin `vercel.json`, sin Docker
  - Usa defaults de Vercel

### CI/CD
- ❌ **No hay:** `.github/workflows` automatizado
- ✅ **Gates locales:**
  - `eslint` — Linting
  - `tsc --noEmit` — Type checking
  - `vitest` — Unit tests (90% cobertura)
  - `playwright` — E2E (Pixel 7, es-ES)
  - `k6` — Load testing
  - `@next/bundle-analyzer` — Bundle (presupuesto <180KB)

### Cómo Verificar

**Build & Type Check:**
```bash
pnpm tokens:build && pnpm build --webpack
pnpm typecheck && pnpm lint
```

**Testing:**
```bash
pnpm test                    # Vitest (90% threshold)
pnpm test:e2e                # Playwright (Pixel 7)
k6 run k6-weather.js          # Load test (5→20→50 VUs)
k6 run k6-recommender.js      # Load test (1→5→10 VUs)
pnpm analyze                 # Bundle analysis
```

### Métricas Pre-Deploy (2026-10-10)

| Métrica | Valor | Status |
|---|---|---|
| Bundle (gzip) | <180KB | ✅ Pass |
| Test Coverage | 90%+ | ✅ Pass |
| E2E (Pixel 7) | All passing | ✅ Pass |
| Recommender p95 | 41ms | ✅ Pass |
| Weather p95 | 35ms | ✅ Pass |
| Lighthouse Perf | ≥90 | ✅ (baseline) |

### Deuda Conocida Post-Deploy

**Prioridad Alta (Sprint siguiente):**
1. Lluvia → filtrado de materiales
2. Audit final a11y WCAG 2.2 AA
3. Snapshots visuales E2E

**Prioridad Media (2-3 sprints):**
4. Similitud en descartes (embeddings)
5. Starter wardrobe + onboarding mejorado
6. Outfit para mañana
7. Container queries
8. CI/CD automation (`.github/workflows`)

**Prioridad Baja (nice-to-have):**
- Storybook
- PurgeCSS
- LHCI
- BEM completo

---

## 📞 Contacto y Referencias

**Repositorio:** raíz del workspace
**Deployment:** Vercel native serverless
**Database:** Supabase project
**Observability:** Vercel OTEL + local logger
**Baseline:** `PERFORMANCE_BASELINE.md` (2026-10-10)

---

**Documento actualizado:** 2026-10-11  
**Versión:** 1.0 (MVP Full-Feature Deployed)  
**Audiencia:** PO • Negocio • Desarrollo
