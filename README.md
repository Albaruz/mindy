# 👗 App de Moda Inteligente

Una Progressive Web App (PWA) diseñada para gestionar tu armario digital y generar combinaciones de ropa (*outfits*) inteligentes. La aplicación utiliza Inteligencia Artificial para recomendar el conjunto perfecto basándose en tu colorimetría personal, tu morfología, tu estado de ánimo y las condiciones climáticas en tiempo real.

## ✨ Características Principales

*   🤖 **Generador de Looks con IA:** Carruseles interactivos que proponen conjuntos calculando un "Suitability Ratio" (Porcentaje de idoneidad) impulsado por Llama 3.
*   🌦️ **Conciencia Climática:** Filtrado automático y estricto de prendas según la temperatura y precipitación local mediante la API de OpenWeather.
*   📸 **Armario Digital (Digital Closet):** Subida de fotografías con eliminación automática de fondo ejecutada localmente en el dispositivo del usuario.
*   🧺 **Gestión del Ciclo de Ropa:** Calendario integrado y "Cesto de ropa sucia" para evitar recomendar prendas que ya han sido utilizadas.
*   📱 **Experiencia Offline (PWA):** Interfaz instalable en dispositivos móviles con navegación ágil y acceso a tu catálogo sin conexión a internet.
*   🎨 **Accesibilidad y Modo Oscuro:** Interfaz minimalista, soporte nativo para temas del sistema y áreas táctiles optimizadas para móviles.

## 🛠️ Stack Tecnológico

**Frontend & Orquestación:**
*   **Core:** Next.js 14 (App Router), React 18, TypeScript.
*   **Estilos:** SCSS Modules (Arquitectura atómica y Custom Properties).
*   **Estado y Datos:** Zustand (estado global) y TanStack Query (sincronización y caché).
*   **UI/UX:** Swiper.js (carruseles táctiles), Lucide React (iconografía).

**Backend (BaaS) & APIs:**
*   **Base de Datos & Auth:** Supabase (PostgreSQL con RLS, Storage y Autenticación).
*   **Procesamiento Local:** `@imgly/background-removal` (WebAssembly).
*   **Inteligencia Artificial:** Groq API (LLMs de código abierto - Llama 3).
*   **Clima:** OpenWeather API.

## 🚀 Instalación y Despliegue Local

### Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (v18 o superior) y **pnpm** como gestor de paquetes.

### 1. Clonar el repositorio
```bash
git clone [https://github.com/tu-usuario/app-moda-inteligente.git](https://github.com/tu-usuario/app-moda-inteligente.git)
cd app-moda-inteligente
```

### 2. Instalar dependencias
```bash
pnpm install
```

### 3. Configuración de Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto copiando el formato de `.env.example`. Necesitarás registrarte en Supabase, Groq y OpenWeather para obtener estas claves de capa gratuita:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_clave_anonima"

# APIs Externas (Gestionadas de forma segura vía Server Route Handlers)
GROQ_API_KEY="tu_clave_de_groq"
OPENWEATHER_API_KEY="tu_clave_de_openweather"
```

### 4. Configurar la Base de Datos
Ejecuta el script SQL proporcionado en el Documento de Diseño del Sistema (SDD) directamente en el editor SQL de tu panel de Supabase. Esto creará las tablas (`perfiles`, `prendas`, `historial_looks`) y configurará las Políticas de Seguridad de Nivel de Fila (RLS).

### 5. Iniciar el Servidor de Desarrollo
```bash
pnpm dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## 📁 Arquitectura del Proyecto

El proyecto sigue una arquitectura **Feature-Driven** (orientada a funcionalidades) para maximizar la escalabilidad:

*   `/src/app`: Enrutador de Next.js, Layouts y vistas principales.
*   `/src/features`: Módulos de dominio de negocio encapsulados (ej. `armario`, `generador`, `perfil`).
*   `/src/components`: UI Kit global y agnóstico (Botones, Skeletons, BottomTabBar).
*   `/src/api`: Route Handlers de Next.js que actúan como capa de servidor segura para orquestar la IA y el clima.
*   `/src/types`: Interfaces estrictas de TypeScript para los modelos de datos.

