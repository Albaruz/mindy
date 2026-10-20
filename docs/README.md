# 👗 Mindy Smart Closet


[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://mindy-closet.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-0070F3?style=flat-square&logo=nextjs)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19.2.8-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

---
## ✨ Descripción general del proyecto

**Mindy Smart Closet** es una **aplicación web progresiva (PWA)** para gestionar un **armario digital** y crear **conjuntos de ropa personalizados**. La aplicación permite registrar prendas, consultar el armario desde distintos dispositivos y recibir recomendaciones basadas en preferencias de estilo, colorimetría y condiciones meteorológicas.

El proyecto está diseñado para funcionar tanto en **navegadores de escritorio** como en **dispositivos móviles**, incluyendo capacidades de **uso sin conexión** y sincronización de datos cuando vuelve a estar disponible la conexión.

## 🛠️ Stack tecnológico utilizado

- **Frontend:** Next.js 16, React 19 y TypeScript.
- **Estilos:** SCSS Modules y variables CSS.
- **Estado cliente:** Zustand.
- **Estado del servidor y caché:** TanStack Query.
- **Backend y persistencia:** Supabase, PostgreSQL, Auth y Storage.
- **Inteligencia artificial:** Groq para recomendaciones y clasificación de prendas.
- **Información meteorológica:** OpenWeather API.
- **PWA:** Service Worker y Workbox.
- **Pruebas:** Vitest, Testing Library y Playwright.
- **Calidad de código:** ESLint y TypeScript en modo estricto.
- **Gestor de paquetes:** pnpm.

## 🚀 Información sobre su instalación y ejecución

### 📋 Requisitos previos

- **Node.js 18 o superior.**
- **pnpm 12.8 o superior.**
- **Una cuenta de Supabase.**
- **Credenciales de Groq y OpenWeather** para habilitar las integraciones externas.

### 📦 Instalación

**Clona el repositorio**, accede a la carpeta del proyecto e **instala las dependencias**:

```bash
git clone https://github.com/Albaruz/mindy.git
cd mindy
pnpm install
```

**Crea el archivo de variables de entorno** a partir de la plantilla disponible:

```bash
cp .env.example .env.local
```

Completa `.env.local` con las **credenciales correspondientes**. **No incluyas este archivo en el control de versiones.**

### ▶️ Ejecución en desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

La versión desplegada en producción está disponible en **[https://mindy-closet.vercel.app](https://mindy-closet.vercel.app)**.

### ⚙️ Comandos útiles

```bash
pnpm build          # Genera la compilación de producción
pnpm start          # Inicia la aplicación compilada
pnpm lint           # Ejecuta el análisis estático
pnpm typecheck      # Comprueba los tipos de TypeScript
pnpm test           # Ejecuta las pruebas unitarias
pnpm test:e2e       # Ejecuta las pruebas end-to-end
```

## 🗂️ Estructura de carpetas típica del proyecto

```text
.
├── public/                 # Recursos estáticos e iconos de la PWA
├── src/
│   ├── app/                # Rutas, layouts y Route Handlers de Next.js
│   ├── components/         # Componentes de interfaz reutilizables
│   ├── constants/          # Constantes compartidas del dominio
│   ├── features/           # Módulos funcionales del producto
│   ├── lib/                # Utilidades e integraciones compartidas
│   ├── stores/             # Estado global de la aplicación
│   ├── styles/             # Estilos globales y tokens visuales
│   └── types/              # Tipos e interfaces de TypeScript
├── e2e/                    # Pruebas end-to-end y de accesibilidad
├── scripts/                # Scripts auxiliares de desarrollo y build
├── .env.example            # Plantilla de variables de entorno
├── next.config.ts          # Configuración de Next.js
├── package.json            # Dependencias y scripts del proyecto
└── tsconfig.json           # Configuración de TypeScript
```

## 🌟 Funcionalidades principales

- **Registro y gestión de prendas** en un armario digital.
- **Carga de imágenes** con eliminación opcional del fondo.
- **Etiquetado y filtrado de prendas** por tipo, color y características.
- **Generación de conjuntos** mediante recomendaciones asistidas por inteligencia artificial.
- **Recomendaciones adaptadas al clima** y a la ubicación del usuario.
- **Perfil de estilo y colorimetría** configurado durante el onboarding.
- **Historial de conjuntos y calendario de uso.**
- **Gestión del estado de las prendas**, incluido el seguimiento de prendas en la colada.
- **Funcionamiento como PWA** con soporte para uso sin conexión.
- **Interfaz responsive, modo oscuro y soporte para español e inglés.**
