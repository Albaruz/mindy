# Backlog - Mindy Smart Closet

Fuente única de trabajo pendiente. El estado implementado y las decisiones técnicas se documentan en el [SDD](../Software%20Design%20Document%20(SDD)%20-%20App%20de%20Moda%20Inteligente.md).

## Prioridad alta

| ID | Funcionalidad | Pendiente | Esfuerzo | Estado |
|---|---|---|---:|---|
| #BKL-010 | Accesibilidad final | Probar los flujos principales con lector de pantalla (NVDA u otro disponible) y ampliar el recorrido de teclado a carruseles y componentes adicionales. | 2 pts | Pendiente |
| #BKL-016 | Filtrado de materiales con lluvia | Implementar `isRainy()`, excluir materiales incompatibles, cubrir escenarios meteorológicos y actualizar el prompt del recomendador. | 3 pts | Pendiente |

## Prioridad media

| ID | Funcionalidad | Pendiente | Esfuerzo | Estado |
|---|---|---|---:|---|
| #BKL-003 | Similitud en descartes | Leer `garment_feedback`, generar embeddings y evitar combinaciones similares mediante cosine similarity. | 8 pts | Pendiente |
| #BKL-005 | Starter Wardrobe | Crear 8–12 prendas básicas, usar `is_external_garment=true`, añadir opt-in/out en onboarding y excluirlas de las métricas reales. | 5 pts | Pendiente |
| #BKL-017 | Alternativa de prenda generada por IA | Integrar generación text-to-image usando la descripción de Groq Vision, con endpoint autenticado, límites por usuario, preview, procedencia y manejo de errores/cuota. Nunca enviar la foto original. | Por determinar | Pendiente |
| #BKL-012 | Historial de métricas Lighthouse | Guardar y mostrar la evolución de las métricas de cada ejecución de LHCI. | 1 pt | Pendiente |

## Prioridad baja

| ID | Funcionalidad | Pendiente | Esfuerzo | Estado |
|---|---|---|---:|---|
| #BKL-018 | Automatización CI/CD completa | Añadir workflows para lint, tests y build, previews por PR y despliegue automático de `main` a Vercel. | 5 pts | Pendiente |
| #BKL-019 | Storybook | Configurar Storybook, documentar APIs de componentes y publicar una referencia visual del sistema. | 8 pts | Pendiente |
| #BKL-020 | Optimización SCSS | Revisar mixins no utilizados y migrar a Custom Properties cuando reduzca el CSS generado. | 3 pts | Pendiente |

## Futuro / sin prioridad asignada

- Container Queries en componentes responsive.
- Completar la convención BEM en los componentes restantes.
- Color base editable y etiquetado completo por undertone.
- Recomendaciones basadas en morfología.
- Test de venas para colorimetría indirecta.
- Clustering de outfits.
- Exportar outfits como imagen.
- Imprimir el catálogo del armario.
- Wishlist de prendas.
- Integración con retailers.
- Prueba experimental de AR try-on.
- Comandos de voz.
- Sincronización con calendarios.
- Dashboard de analítica de uso.

## Decisiones archivadas

No se retomará la búsqueda de imágenes de catálogo (Unsplash, Wikimedia, Pixabay o similares). La dirección aprobada para alternativas visuales es la generación de imágenes basada únicamente en la descripción textual de Groq Vision.

## Resumen

- **Pendientes de prioridad alta:** 2
- **Pendientes de prioridad media:** 4
- **Pendientes de prioridad baja:** 3
- **Fuente de funcionalidades completadas:** SDD, sección 10 y secciones técnicas correspondientes

## ROI estimado de evolutivos de negocio

La siguiente tabla prioriza únicamente los evolutivos pendientes con impacto directo
en la experiencia de usuario, la calidad de las recomendaciones o la activación y
retención. El ROI es una estimación relativa (beneficio esperado frente al coste de
integración), no una previsión financiera: debe validarse con métricas reales después
de cada entrega.

| ID | Evolutivo | Beneficio de negocio esperado | ROI estimado | Esfuerzo de integración (Fibonacci) | Prioridad recomendada |
|---|---|---|---:|---:|---|
| #BKL-005 | Starter Wardrobe | Permite generar looks desde el primer día y reduce el abandono durante el onboarding. | **Muy alto** | **5 pts** | 1 |
| #BKL-016 | Filtrado de materiales con lluvia | Aumenta la relevancia y la confianza de las recomendaciones en un caso de uso frecuente. | **Alto** | **3 pts** | 2 |
| #BKL-003 | Similitud en descartes | Personaliza el recomendador con el feedback histórico y reduce propuestas repetitivas. | **Alto** | **8 pts** | 3 |
| #BKL-017 | Alternativa de prenda generada por IA | Reduce la fricción al cargar prendas y puede mejorar la finalización del armario, pero depende del coste, la cuota y la calidad de las imágenes. | **Medio-alto** | **13 pts** | 4 |

### Criterio de estimación

- **ROI muy alto:** beneficio amplio y cercano al flujo de activación, con esfuerzo bajo o medio.
- **ROI alto:** mejora clara de la utilidad o personalización con esfuerzo contenido.
- **ROI medio-alto:** oportunidad relevante, pero con incertidumbre técnica, coste operativo o riesgo de adopción.
- **Fibonacci:** 1, 2, 3, 5, 8 y 13 puntos representan tamaño relativo de integración,
  incluyendo desarrollo, datos, pruebas, seguridad y despliegue. No equivalen
  directamente a días.

El orden recomendado no sustituye a una priorización financiera: antes de implementar
`#BKL-017` conviene validar el coste por generación, los límites de cuota y una métrica
de éxito (por ejemplo, porcentaje de usuarios que aceptan la alternativa). Los
evolutivos técnicos (`#BKL-010`, `#BKL-012`, `#BKL-018`, `#BKL-019` y `#BKL-020`)
se mantienen fuera de esta tabla porque su retorno es principalmente de calidad,
operación o mantenibilidad, no de negocio directo.
