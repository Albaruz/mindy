# 👗 Mindy - Tu armario inteligente

Una PWA orientada a la gestión inteligente del armario y a la recomendación personalizada de conjuntos mediante inteligencia artificial, contexto meteorológico y preferencias de estilo.

🌐 **Aplicación en producción:** [https://mindy-closet.vercel.app](https://mindy-closet.vercel.app)

[![Desplegado en Vercel](https://img.shields.io/badge/Desplegado%20en-Vercel-000000?style=flat-square&logo=vercel)](https://mindy-closet.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## a. ✨ Descripción general del proyecto

**Mindy Smart Closet** es una **aplicación web progresiva (PWA)** que transforma un armario físico en un inventario digital y ayuda a decidir qué ponerse. Su propuesta de valor combina tres fuentes de información: las prendas registradas por cada persona, su perfil de estilo y colorimetría, y las condiciones meteorológicas actuales o previstas.

El proyecto responde a un problema cotidiano: disponer de ropa no siempre facilita crear combinaciones adecuadas. Para ello, Mindy permite **digitalizar prendas a partir de fotografías**, clasificarlas mediante visión artificial y recibir propuestas de conjuntos generadas por IA. La persona mantiene el control del proceso: puede descartar opciones, fijar una prenda concreta, recombinar el resto del conjunto o construirlo manualmente.

La solución está concebida con una orientación **mobile-first**, pero funciona también en escritorio. Como PWA, incorpora persistencia local, caché de imágenes y soporte de consulta sin conexión, de forma que el armario siga siendo útil incluso ante una conectividad limitada.

### Objetivos académicos y técnicos

- Diseñar una experiencia de usuario personalizada mediante **IA generativa con mecanismos de respaldo deterministas**.
- Aplicar una arquitectura web moderna, modular, escalable y con **tipado estricto**.
- Integrar autenticación, base de datos, almacenamiento de imágenes y políticas de acceso por usuario.
- Considerar requisitos no funcionales: **accesibilidad, rendimiento, privacidad, internacionalización y resiliencia offline**.

---

## b. 🛠️ Stack tecnológico utilizado

| Capa | Tecnologías | Aportación al proyecto |
|---|---|---|
| **Framework web** | Next.js 16, React 19, TypeScript 5 | App Router, renderizado híbrido, interfaces declarativas y tipado estricto. |
| **Estilos y diseño** | SCSS Modules, CSS Custom Properties, tokens de diseño JSON | Estilos encapsulados, temas claro/oscuro y consistencia visual. |
| **Interfaz** | Swiper, Framer Motion, Lottie React, Lucide React | Carruseles, gestos, animaciones, microinteracciones e iconografía. |
| **Estado local** | Zustand | Estado transversal del generador, onboarding, notificaciones y cola de cargas. |
| **Datos y caché** | TanStack Query, IndexedDB, idb-keyval | Caché, sincronización, persistencia local y estrategia `offlineFirst`. |
| **Backend** | Supabase: PostgreSQL, Auth, Storage y RLS | Usuarios, perfiles, prendas, historial de conjuntos y almacenamiento seguro de imágenes. |
| **Inteligencia artificial** | Groq: `openai/gpt-oss-20b` y modelo de visión Qwen | Recomendación de looks y análisis/etiquetado automático de prendas. |
| **Meteorología** | OpenWeather API | Tiempo actual y previsión para adaptar las recomendaciones. |
| **PWA** | next-pwa, Workbox y Service Worker | Instalabilidad, caché de recursos y funcionamiento con conectividad limitada. |
| **Calidad** | ESLint, Vitest, Testing Library, Playwright, axe-core y k6 | Análisis estático, pruebas unitarias, E2E, accesibilidad y carga. |
| **Despliegue y observabilidad** | Vercel Serverless, Vercel Analytics y OTEL | Despliegue, telemetría y observación de errores y rendimiento. |

### Diseño y accesibilidad

La identidad visual sigue el concepto **“Refugio Cálido”**: una interfaz minimalista que da protagonismo a las prendas, con el color terracota como acento. Se emplea **Playfair Display** para titulares e **Inter** para texto funcional. La aplicación incorpora tema claro, oscuro y automático, objetivos táctiles de al menos **44 px**, navegación por teclado, foco gestionado en diálogos, etiquetas ARIA y reducción de movimiento cuando el sistema lo solicita.

---

## c. 🚀 Información sobre su instalación y ejecución

### Requisitos previos

- **Node.js 18** o superior.
- **pnpm 12.8** o superior.
- Un proyecto de **Supabase** configurado para autenticación, PostgreSQL y Storage.
- Credenciales de **Groq** y **OpenWeather** para habilitar IA y meteorología.

### Instalación

```bash
git clone https://github.com/Albaruz/mindy.git
cd mindy
pnpm install
```

### Configuración del entorno

Crea un archivo `.env.local` en la raíz del proyecto e introduce las variables necesarias. Los secretos nunca deben subirse al repositorio ni exponerse en variables `NEXT_PUBLIC_*`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-key>
GROQ_API_KEY=<groq-api-key>
OPENWEATHER_API_KEY=<openweather-api-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Ejecución local

```bash
pnpm dev
```

La aplicación quedará disponible en **[http://localhost:3000](http://localhost:3000)**.

### Comandos de verificación

```bash
pnpm build          # Genera la compilación de producción
pnpm start          # Ejecuta la aplicación compilada
pnpm lint           # Ejecuta ESLint
pnpm typecheck      # Valida TypeScript en modo estricto
pnpm test           # Ejecuta las pruebas unitarias
pnpm test:coverage  # Genera el informe de cobertura
pnpm test:e2e       # Ejecuta los flujos end-to-end con Playwright
pnpm test:a11y      # Ejecuta la prueba de accesibilidad
pnpm analyze        # Analiza el presupuesto de JavaScript compartido
```

### Calidad y rendimiento

La estrategia de validación combina pruebas unitarias, E2E, accesibilidad y carga. El objetivo de cobertura configurado es **90 %** en líneas, ramas, funciones y sentencias. Las pruebas E2E se ejecutan con un perfil **Pixel 7** y configuración regional `es-ES`.

Como referencia, el proyecto define un presupuesto de **menos de 180 KB gzip** para JavaScript compartido de primera carga. Las funcionalidades pesadas, como los carruseles o el procesamiento de imágenes, se cargan de forma diferida para reducir el impacto inicial.

---

## d. 🗂️ Estructura del proyecto

La organización sigue una arquitectura **Feature-Driven**: cada dominio de negocio se aísla en `features`, mientras que el código reutilizable se sitúa en capas compartidas. Esta separación evita dependencias directas entre funcionalidades y facilita la evolución del producto.

```text
.
├── docs/                         # Arquitectura, API, pruebas, backlog y guías
├── e2e/                          # Pruebas end-to-end, accesibilidad y regresión visual
├── public/                       # Recursos estáticos, manifest e iconos de la PWA
├── scripts/                      # Automatización de tokens y presupuesto de bundle
├── src/
│   ├── app/                      # Rutas, layouts y Route Handlers de Next.js
│   │   ├── [locale]/             # Rutas localizadas: español e inglés
│   │   │   ├── (auth)/           # Inicio de sesión, registro y recuperación
│   │   │   ├── onboarding/       # Entrada al asistente inicial de cinco pasos
│   │   │   ├── generator/        # Generador de conjuntos
│   │   │   ├── closet/           # Armario digital
│   │   │   ├── calendar/         # Historial de looks
│   │   │   └── profile/          # Perfil, preferencias y colada
│   │   └── api/                  # Endpoints seguros: weather, recommender y analyze
│   ├── components/               # Kit de interfaz reutilizable y agnóstico de dominio
│   ├── constants/                # Valores centralizados y vocabularios controlados
│   ├── features/                 # Dominios de negocio organizados por responsabilidad
│   │   ├── generator/
│   │   │   ├── api/recommender/
│   │   │   ├── components/{flow,manual,showcase,states,weather}/<component>/
│   │   │   ├── domain/recommendations/
│   │   │   ├── hooks/{generation,outfit-actions,weather}/
│   │   │   ├── state/generator-store/
│   │   │   └── views/home/
│   │   ├── closet/
│   │   │   ├── components/{garments,upload}/<component>/
│   │   │   ├── domain/{garments,inventory}/
│   │   │   ├── hooks/{garment-actions,inventory,laundry,queries,upload}/
│   │   │   └── services/{images,persistence}/
│   │   ├── history/               # components/history-card y hooks/queries
│   │   ├── profile/               # components/morpho-icon, domain/profile, hooks/{laundry,profile}
│   │   ├── onboarding/            # components/{onboarding-art,steps/<step>}, domain/inference, state/onboarding-store, views/onboarding-wizard
│   │   └── settings/              # components/settings-controls y state/theme-store
│   ├── lib/                      # Lógica compartida: IA, Supabase, reglas y utilidades
│   ├── stores/                   # Estado global con Zustand
│   ├── styles/                   # Tokens, estilos base, shells globales y SCSS Modules
│   └── types/                    # Interfaces y tipos compartidos de TypeScript
├── package.json                  # Dependencias y comandos de desarrollo
└── next.config.ts                # Configuración de Next.js, PWA y cabeceras
```

Los directorios de las features usan `kebab-case`. Cada componente y vista tiene
su propia carpeta para mantener juntos el archivo `.tsx`, sus estilos y sus
tests. Hooks, dominio, estado, API y servicios se agrupan por responsabilidad;
los tests de esos módulos permanecen junto a su implementación.

### Flujo de datos resumido

```text
Interacción de usuario
        ↓
Componente React + estado Zustand
        ↓
TanStack Query: caché local o petición
        ↓
Route Handler autenticado de Next.js
        ↓
Reglas de negocio + servicios externos (Groq / OpenWeather)
        ↓
Supabase y respuesta JSON tipada
        ↓
Persistencia en IndexedDB y caché de la PWA
```

Las tablas principales son `profiles`, `garments`, `outfit_history` y `garment_feedback`. Todas aplican **Row Level Security (RLS)**: cada persona únicamente puede acceder a sus propios datos y a sus imágenes dentro de Storage.

---

## e. 🌟 Funcionalidades principales

### 1. 🧙 Perfil personalizado y onboarding guiado

- Asistente de **cinco pasos** para recopilar identidad, medidas, morfología, preferencias de ajuste y estilo de vida.
- Estimación de la **colorimetría estacional** — primavera, verano, otoño o invierno — a partir de rasgos físicos o de la preferencia por joyería dorada o plateada.
- Preferencias de idioma (**español/inglés**) y tema (**claro/oscuro/sistema**).

### 2. 👕 Armario digital inteligente

- Registro individual o por lotes de hasta **diez fotografías** de prendas.
- Análisis de imagen con IA para sugerir tipo de prenda, estilo, corte, color, material y temporada.
- Edición manual de etiquetas y etiquetas adicionales personalizadas.
- Eliminación de fondo opcional en cliente mediante un Web Worker, sin bloquear la subida de la prenda.
- Buscador bilingüe tolerante a mayúsculas, tildes, guiones y plurales; filtros por categoría, estado y frecuencia de uso.
- Cola de subida persistente en IndexedDB, con reintentos y seguimiento de progreso.

### 3. 🤖 Generador de conjuntos con IA

- Recomendaciones basadas en las prendas limpias disponibles, el estilo elegido, el perfil de la persona y la situación meteorológica.
- Flujo guiado: **estado inicial → selección automática → carga → propuesta visual → edición manual**.
- Gestos de deslizamiento para aceptar o descartar propuestas, opción de fijar prendas y recombinación del resto del look.
- Modo manual con carruseles para las categorías superiores, inferiores, calzado y abrigo.
- Mecanismo de respaldo: si el proveedor de IA no está disponible, se generan combinaciones basadas en reglas para mantener la continuidad de la experiencia.
- Opción de crear un conjunto para **hoy o para mañana**, usando la previsión cuando está disponible.

### 4. 🌦️ Adaptación al contexto meteorológico

- Consulta del tiempo actual y previsión de hasta **ocho días** mediante OpenWeather.
- Reglas de negocio para evitar prendas invernales con calor, sugerir abrigo en frío o lluvia y condicionar los looks al contexto.
- Caché de datos meteorológicos para limitar peticiones externas y mejorar la respuesta.

### 5. 📅 Historial y ciclo de uso

- Registro de conjuntos utilizados o planificados en un calendario agrupado por meses.
- Al confirmar que se usará un conjunto, las prendas lavables se marcan como usadas; el calzado y el abrigo están exentos de pasar a la colada.
- Cesto de ropa sucia con acciones para lavar una prenda concreta o todas las prendas acumuladas.

### 6. 📱 Experiencia PWA, segura y accesible

- Uso sin conexión con datos previamente almacenados y sincronización al recuperar conectividad.
- Autenticación con Supabase, rutas protegidas, validación de entradas, límites de uso por endpoint y secretos alojados exclusivamente en servidor.
- Cabeceras de seguridad: HSTS, CSP, `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`.
- Interfaz responsive, navegación accesible por teclado, diálogos con gestión de foco y soporte de movimiento reducido.

---

## f. 🔐 Usuario y contraseña de prueba

El proyecto incluye **inicio de sesión obligatorio**. Para la presentación se ha definido la siguiente cuenta de demostración:

| Campo | Credencial |
|---|---|
| **Usuario** | `pruebasmindy@pruebasmindy.com` |
| **Contraseña** | `pruebas123456!` |

> ⚠️ **Uso exclusivo de demostración.** No emplees estas credenciales para cuentas reales ni las reutilices en otros servicios.

---

**Mindy Smart Closet** integra diseño centrado en las personas, arquitectura web moderna e inteligencia artificial aplicada a un caso de uso cotidiano: **vestirse mejor con lo que ya se tiene**.
