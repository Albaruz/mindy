# **Software Design Document (SDD)**

# **App de Moda Inteligente**

## **1\. Visión General del Sistema**

Aplicación PWA enfocada en la gestión inteligente de armario, recomendación de outfits basada en contexto (clima local mediante OpenWeather, estado de ánimo) y características biométricas y de colorimetría del usuario.

## **2\. Stack Tecnológico**

* **Frontend**: React con TypeScript y SCSS (Sass). Empaquetado como PWA para instalación en dispositivos móviles y uso en navegador web. Soporte multidioma (i18n) implementado con `next-intl` mediante rutas dinámicas y diccionarios JSON. La preferencia de idioma del usuario se persiste de forma local en el dispositivo (mediante cookies) y el sistema incluye la traducción dinámica en tiempo de ejecución de los atributos de la base de datos.  
* **Backend**: Supabase (BaaS Open Source).  
* **Almacenamiento y Privacidad**: Enfoque "Cloud-First" usando Supabase Auth. El registro es obligatorio desde el inicio (email/contraseña o proveedor social) para prevenir abusos y simplificar la gestión; los datos se guardan en la nube para evitar pérdida de información en cachés locales, pero sin exigir más PII (Información de Identificación Personal) hasta que el usuario decida completarla.  
* **APIs Externas**:  
  * **Clima**: OpenWeather API (detección de clima basada en geolocalización).  
  * **Computer Vision**: Groq Vision API (modelo `qwen/qwen3.8-27b`, configurable con `GROQ_VISION_MODEL`, invocado desde un Route Handler del servidor que devuelve JSON estricto con los atributos de la prenda) y eliminación local de fondos (`@imgly/background-removal`) para estilizar las fotos del catálogo.  
  * **Motor de Recomendación**: LLM Open Source (`openai/gpt-oss-20b`, configurable con `GROQ_MODEL`) para calcular el "Suitability Ratio" de los conjuntos y cruzar variables complejas (estado de ánimo, clima, colorimetría). Las llamadas reintentan hasta 3 veces ante fallos transitorios del modelo (p. ej. `json_validate_failed`) y devuelven 502 si el servicio no responde.

  ## **3\. Lógica de Negocio y Experiencia de Usuario**

* **Deducción del Perfil de Usuario (Onboarding)**: Formulario interactivo (Wizard) de 3 pasos que recoge rasgos físicos (tono de piel, color de pelo/ojos), medidas corporales (pecho, cintura, cadera) y preferencias (estilo de vida, fit). A través de estos datos, la aplicación deduce la colorimetría y morfología del usuario automáticamente.  
* **Digital Closet**: Eliminación del fondo de las imágenes subidas por el usuario de forma automática, mostrando las prendas limpias estilo catálogo profesional.  
* **Flujo de Interacción (Entrenamiento de la IA)**:  
  * **Botón "Me lo pongo hoy"**: Refuerzo positivo. Registra el conjunto en el calendario y mueve las prendas al "cesto de ropa sucia" actualizando su estado a `is_dirty = true`.  
  * **Botón "Cambiar prenda"**: Refuerzo negativo para evitar futuras combinaciones similares.

  ## **4\. Estructura de Datos (Esquema PostgreSQL en Inglés)**

La base de datos utiliza estrictamente nomenclatura en inglés (snake\_case). Las tablas principales vinculadas al `user_id` son:

* **`profiles`**: Almacena `skin_tone`, `eye_color`, `hair_color`, `colorimetry` (ENUM 4 estaciones), `chest_measurement_cm`, `waist_measurement_cm`, `hip_measurement_cm`, `morphology` (ENUM tipos corporales), `preferred_fit`, `lifestyle` y `extra_preferences` (JSONB).  
* **`garments`**: Atributos principales generados por la IA en la subida de foto y editables por el usuario.  
  * **Identificadores**: `garment_id`, `user_id`.  
  * **Multimedia**: `image_url` (enlace a la imagen procesada sin fondo almacenada en Storage).  
  * **Atributos Descriptivos**: `garment_type`, `style`, `cut_length`, `color`, `material`, `season`.  
  * **Estado y Sistema**: `is_dirty` (booleano), `last_worn_date`, `is_external_garment`, `extra_tags` (JSONB).  
* **`outfit_history`**: Almacena `look_id`, `user_id`, `garment_ids` (array) y `worn_date`.

  ## **5\. Mapa de Navegación y Vistas (i18n)**

Todas las rutas operan bajo un segmento dinámico `[lang]` para interceptar el idioma mediante middleware.

1. **Login / Onboarding**: Acceso anónimo o registrado, seguido del wizard de deducción biométrica.  
2. **Generador de Looks (Home):** Pantalla principal que inicia en un "Estado Cero" inmersivo y conversacional ofreciendo contexto climático. El **Modo Manual** revela carruseles interactivos a pantalla completa. El **Modo Automático** solicita el estilo deseado y presenta una pantalla de *Showcase* (tarjeta única agrupada por look). Para garantizar la accesibilidad cognitiva de todos los usuarios, esta vista mantiene una botonera inferior visible con acciones explícitas que convive con los gestos de deslizamiento físicos (swiping).   
3. **Mi Armario**: Vista general en cuadrícula (grid) con todas las prendas y buscador inteligente por texto en el cliente mediante input `search` (insensible a mayúsculas y tildes; busca en tipo, color, estilo, material y color base). Opción de editar manualmente los tags asignados por la IA.  
4. **Calendario**: Visor donde se guardan históricamente los looks marcados como "Me lo pongo hoy".  
5. **Perfil / Ajustes**: Gestión de la cuenta (registro opcional en la nube), revisión/modificación del perfil deducido, y acceso al "Cesto de la Ropa Sucia" con un botón general para "hacer la colada" y devolverlas al armario de ropa limpia (mutación `is_dirty = false`). Esta vista cuenta con selectores tipo píldora (Segmented Control) con el color de acento para alternar el Idioma (ES/EN) y el Tema (Claro/Oscuro), cuya selección solo se guarda en el dispositivo actual.  
6. **Navegación Principal:** El menú principal (Generador, Armario, Calendario, Perfil) se reubica en la parte superior de la pantalla utilizando un selector tipo píldora (Segmented Control). Este menú convive con el logotipo de la aplicación para liberar el espacio inferior.   
7. 

   ## **6\. Reglas de Negocio y Flujos Avanzados**

* **Filtrado Estricto por Clima**: Pre-procesamiento de las combinaciones. Si OpenWeather detecta calor extremo (ej. \>25ºC), el backend descarta mostrar ropa de invierno automáticamente. Si detecta lluvia, evitará materiales que se estropeen.  
* **Filtrado Estricto por Estilo**: Pre-procesamiento de las combinaciones en el Modo Automático. Al solicitar un estilo específico (ej. Casual, Formal), el backend filtrará strictly el inventario de prendas enviado al LLM, asegurando que solo se incluyan aquellas cuyo atributo `style` sea compatible. Si el inventario resultante es insuficiente para formar un look completo, el sistema no rellenará el conjunto por descarte con prendas de otros estilos. En su lugar, abortará la inferencia y devolverá un error específico para que el frontend muestre un Empty State (ej. "No hay suficientes prendas limpias de este estilo").  
* **Carruseles Interactivos y Múltiples Opciones**: El usuario puede deslizar y bloquear/fijar una prenda concreta (ej. unos pantalones). Al pulsar generar, la IA no impone un solo look, sino que recarga los demás carruseles con 2 o 3 opciones ideales que combinan específicamente con esa prenda fijada.  
* **Botón de Reset**: Opción rápida para reiniciar el lienzo, desbloquear prendas y empezar un look completamente distinto.  
* **Alcance de la Versión Inicial**: El MVP será Full-Feature, incluyendo desde el primer día todas las vistas descritas.

  ## **7\. Arquitectura del Sistema (BaaS & Serverless)**

* **Paradigma**: Programación Funcional Declarativa con React y TypeScript. Arquitectura Feature-Driven (agrupación por dominio de negocio).  
* **Frontend, Orquestación y Despliegue**: Next.js (App Router). Las peticiones a APIs externas (Groq, OpenWeather) se realizarán de forma segura desde el servidor mediante Route Handlers (API Routes) para ocultar las credenciales. El despliegue del MVP se realizará de forma nativa en Vercel (arquitectura Serverless), lo que permite aprovechar su capa gratuita, optimización de imágenes y despliegue continuo (CI/CD) automatizado sin necesidad de configuración DevOps, descartando la contenedorización manual con Docker en esta fase inicial.  
* **Arquitectura de IA Desacoplada**: El motor agéntico divide la lógica en `prompts.ts` (Instrucciones puras), `engine.ts` (Lógica de llamadas y parsing estructurado JSON) y el `route.ts` que actúa como controlador.  
* **Gestión de Estado**: TanStack Query para el estado del servidor (sincronización con Supabase y caché offline) y Zustand para el estado global del cliente (`useGeneradorStore` para los carruseles y `useNotificationStore` para avisos).  
* **Soporte Offline (PWA)**: Generación de Service Worker mediante `next-pwa` y persistencia de caché con IndexedDB, permitiendo acceder al armario sin conexión.

  ## **8\. Seguridad y Privacidad**

* **Autenticación**: Registro obligatorio desde el inicio (email/contraseña o proveedor social) para prevenir abusos de bots y simplificar la gestión.  
* **Autorización**: Políticas de Seguridad a Nivel de Fila (RLS) en PostgreSQL y Supabase Storage para garantizar que cada usuario solo acceda a sus propios datos.  
* **Sanitización y Límites**: Validación estricta de inputs en los atributos editables manualmente (prevención XSS) y limitación de tamaño/frecuencia en la subida de imágenes del Digital Closet. Los Prompts de la IA no se exponen al cliente.

  ## **9\. UX, Diseño Visual y Accesibilidad (a11y)**

* **Navegación:** Menú principal superior en formato píldora y un centro de mandos flotante en la parte inferior para las acciones directas sobre la ropa. Se mantienen áreas táctiles accesibles (mínimo 44x44px).  
* **Dirección de Arte:** Interfaz minimalista que cede el protagonismo cromático a la ropa, elevada con tipografía Serif de alto contraste en los encabezados. Soporte nativo para Modo Oscuro gestionado mediante CSS Custom Properties.  
* **Paleta de Colores (Estética 'Refugio Cálido')**: Se aplicará una paleta acogedora que cede el protagonismo a la ropa: Fondo Modo Claro (Avena: \#F9F6F0), Superficies y burbujas flotantes (Avena: \#F9F6F0, también en modo oscuro), Fondo Modo Oscuro (\#0A0A0A, con Cacao Oscuro \#1E1A18 en lienzos y superficies de autenticación), Color de Acento (Terracota: \#C87966) y Texto/Líneas (Marrón Ceniza: \#4A3F39).  
* **Retroalimentación Visual:** Uso de animaciones Lottie en la botonera flotante principal para generar microinteracciones dinámicas. Sistema global de notificaciones flotantes (burbujas tipo píldora animadas con CSS slideDown) con copys descarados y con personalidad. Uso de *Smart Skeletons* contextuales durante las inferencias de la IA. 

  ## **10\. Funcionalidades Extra Implementadas**

* **Prenda de una pieza**: si la parte de arriba es un vestido (u otra prenda de una pieza: *dress, gown, jumpsuit, vestido*), el carousel de la parte de abajo se oculta y esa parte no entra en el look guardado.  
* **Cesto selectivo**: los zapatos y la ropa de exterior no se marcan como sucios al usar "Me lo pongo hoy" (se pueden reutilizar aunque se hayan usado); el historial guarda el look completo igualmente. La cesta y el generador los excluyen aunque consten sucios de antes.  
* **Clasificación bilingüe**: el mapeo de tipos a categorías acepta inglés (etiquetas de la IA) y español (entradas manuales: camisa, pantalón, zapatillas, abrigo…), insensible a mayúsculas y tildes. Se implementa una utilidad de mapeo dinámico en el frontend que intercepta los datos de Supabase (guardados en inglés por el LLM) y los traduce al idioma de la interfaz del usuario en tiempo real.  
* **Buscador inteligente del armario**: sustituye a los filtros por selects; filtra en cliente por tipo, color (incluido el color base genérico `color_base` de `extra_tags`), estilo y material.  
* **Campo reservado `color_base`**: clave prevista dentro del JSONB `extra_tags` para el color genérico de la prenda (p. ej. "rojo" frente a un color específico "burdeos"). Actualmente ningún proceso lo escribe; queda reservado para el futuro etiquetado de color.

  ## **11\. Próximas Implementaciones**

* **Regla de lluvia por materiales**: si OpenWeather detecta lluvia, evitar materiales que se estropeen con el agua, además de mostrar el abrigo.  
* **Onboarding indirecto**: deducir colorimetría y morfología con preguntas indirectas (color de venas, paletas que favorecen) en lugar de rasgos directos; sustituir las reglas estáticas actuales por el modelo biométrico o una llamada LLM.  
* **Refuerzo negativo por similitud**: usar el historial de `garment_feedback` ("Cambiar prenda") para evitar futuras combinaciones similares, no solo excluir la prenda descartada.  
* **Etiquetado de color base**: extender el pipeline de visión/subida para escribir `color_base` en `extra_tags` y activar la búsqueda por color genérico.

