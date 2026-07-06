# Draveir — Plataforma de Lectura Premium · Documento de Diseño (Spec Vivo)

- **Estado:** Aprobado (arquitectura y modelo de datos) — pendiente de revisión final del usuario
- **Fecha:** 2026-07-05
- **Autor del producto:** Félix Llerena
- **Modo de trabajo:** Spec vivo + iteración por rebanadas (MVP primero)

> Este es un **documento vivo**. Sustituye a los 18 documentos en cascada por una sola fuente de verdad que evoluciona con el proyecto. Cada rebanada (slice) genera su propio plan de implementación derivado de este spec.

---

## 1. Visión del producto

Draveir es una plataforma web donde los lectores disfrutan las novelas de un autor con una experiencia de lectura de nivel profesional (comparable a Kindle/Wattpad en calidad, superior en diseño). El autor **escribe exclusivamente en Notion** y la plataforma se sincroniza sola: publicar un capítulo nuevo no requiere tocar código ni el sitio.

**Principio rector:** el autor controla el 100% del contenido desde Notion; la plataforma es un frontend de lectura rápido, bello, accesible y con protección real del contenido no liberado.

## 2. Objetivos y no-objetivos

### Objetivos
- Lectura excelente en PC y móvil (tipografía, ancho óptimo, modo claro/oscuro).
- Sincronización automática desde Notion vía API oficial.
- Múltiples novelas y capítulos, portadas, ilustraciones, categorías, etiquetas, buscador.
- Historial, favoritos y "continuar leyendo" **sin cuentas** (guardado local en el navegador).
- **Bloqueo real** de capítulos hasta una fecha, con cuenta regresiva y apertura automática.
- Costo total: **$0** (planes gratuitos de GitHub y Cloudflare).
- Rendimiento extremo (Lighthouse ~100) y SEO fuerte en lo público.

### No-objetivos (por ahora — YAGNI)
- Cuentas de usuario / login (se puede añadir después si los lectores lo piden).
- Sincronización de progreso entre dispositivos (consecuencia de no tener cuentas).
- Comentarios, comunidad, monetización, apps nativas.
- Impedir que un lector humano copie/fotografíe lo que ya está leyendo legítimamente (**físicamente imposible** — ver §10).

## 3. Usuarios y casos de uso clave

**Autor (Félix):**
- Escribe un capítulo en Notion, le pone fecha futura → aparece bloqueado con cuenta regresiva.
- Al llegar la fecha, el capítulo se abre solo, sin intervención.
- Edita/corrige en Notion → el sitio se actualiza en la siguiente sincronización.

**Lector:**
- Descubre novelas (destacadas, categorías, etiquetas, buscador).
- Lee con experiencia inmersiva; alterna claro/oscuro.
- Marca favoritos, ve su historial, retoma donde dejó ("continuar leyendo").
- Ve cuánto falta para un capítulo bloqueado.

## 4. Requisitos

### Funcionales
1. Listado y detalle de novelas (portada, sinopsis, estado, categorías, etiquetas).
2. Lectura de capítulos con navegación anterior/siguiente e índice.
3. Buscador (novelas y capítulos) del lado cliente sobre índice estático.
4. Filtros por categoría y etiqueta.
5. Favoritos, historial y "continuar leyendo" en `localStorage`.
6. Modo claro/oscuro con preferencia persistida y respeto a `prefers-color-scheme`.
7. Capítulos con fecha futura: bloqueados, con cuenta regresiva; apertura automática.
8. Ilustraciones dentro de capítulos y portadas de novela.

### No funcionales
- **Rendimiento:** LCP < 1.5s en 4G; CLS < 0.1; cero JS en páginas de lectura salvo islas necesarias.
- **Accesibilidad:** WCAG 2.1 AA (contraste, foco visible, navegación por teclado, semántica, `prefers-reduced-motion`).
- **SEO:** contenido público indexable, metadatos Open Graph, sitemap, datos estructurados de libro.
- **Seguridad:** ver §10.
- **Costo:** dentro de planes gratuitos.
- **Mantenibilidad:** SOLID/Clean Code donde aporte, tipado fuerte (TypeScript), módulos con responsabilidad única, pruebas en la lógica no trivial.

## 5. Arquitectura

```
Notion (fuente de verdad — el autor escribe)
   │
   │  API oficial de Notion
   ▼
GitHub Actions  (cron ~15 min + dispatch manual "Publicar ahora")
   ├─ lee novelas y capítulos desde Notion
   ├─ descarga y optimiza imágenes (las URLs de Notion caducan ~1h → rehospedar)
   ├─ genera páginas de capítulos PUBLICADOS como estáticos
   ├─ genera índice/metadatos de capítulos PROGRAMADOS (sin el texto)
   └─ despliega a Cloudflare Pages
        │
        ├─ Cloudflare Pages   → sirve el sitio estático (edge, rápido, SEO, bot mgmt gratis)
        │
        └─ Cloudflare Worker  → guarda el TEXTO de capítulos con fecha futura
              · compara fecha/hora del servidor con la fecha de liberación
              · antes de la fecha → responde "bloqueado" (el sitio muestra la cuenta regresiva)
              · en/después de la fecha → entrega el texto (sin reconstruir el sitio)
              · rate limiting + marca de agua por sesión
```

**Decisión elegante clave:** la publicación automática en la fecha **no requiere rebuild**. El Worker evalúa la fecha en cada request; la cuenta regresiva llega a cero y el capítulo se abre solo. Cero mantenimiento en el momento de lanzamiento.

**Componentes con responsabilidad única:**
- `notion-sync` (script en Actions): Notion → modelo de contenido normalizado (JSON + HTML + imágenes).
- `web` (Astro): consume el modelo estático; islas para buscador, tema, marcadores, cuenta regresiva.
- `worker` (Cloudflare): entrega gateada de capítulos bloqueados; rate limiting; marcas de agua.

## 6. Modelo de datos

### 6.1 Notion (fuente de verdad)

**DB `Novelas`:** Título (title), Slug (text), Sinopsis (text), Portada (files), Estado (select: En progreso/Completa/Pausada), Categorías (multi-select), Etiquetas (multi-select), Destacada (checkbox), Publicada (checkbox — interruptor maestro), Capítulos (relation → Capítulos).

**DB `Capítulos`:** Título (title), Novela (relation), Número (number, orden), **Contenido (cuerpo de la página — la prosa)**, Estado (select: Borrador/Programado/Publicado), Fecha de publicación (date — desbloqueo), Notas del autor (text, opcional).

**Vistas:** Kanban por Estado (flujo editorial), Calendario por Fecha de publicación (cronograma), Tabla filtrada por Publicada.

**Flujo editorial:** Borrador → fijar Fecha + Estado=Programado → sitio muestra cuenta regresiva → el Worker abre en la fecha.

### 6.2 Modelo de contenido generado (estático)
- `novels/[slug].json` — metadatos de novela + lista de capítulos (número, título, slug, estado, fecha).
- `chapters/[slug].html` — capítulos publicados (prosa renderizada).
- `search-index.json` — índice ligero para el buscador cliente.
- `assets/` — imágenes optimizadas (WebP/AVIF, múltiples tamaños).

### 6.3 Estado local del lector (`localStorage`, versionado)
```ts
type ReaderState = {
  version: 1;
  theme: 'light' | 'dark' | 'system';
  favorites: string[];              // slugs de novela
  history: { chapter: string; at: number; scroll: number }[];
  continueReading: Record<string, string>; // novelSlug -> chapterSlug
};
```

## 7. Arquitectura de Notion
Cubierta en §6.1. El autor no necesita conocer nada técnico: escribe, etiqueta, pone fecha. La API de integración de Notion se conecta en modo lectura con un token guardado como secreto de GitHub.

## 8. Arquitectura de GitHub
- **Repo:** `draveir` (público para el código; el contenido sensible no vive en el repo — el texto bloqueado está solo en el Worker/KV).
- **Estructura (monorepo simple):**
  ```
  /web         (Astro)
  /worker      (Cloudflare Worker)
  /scripts     (notion-sync)
  /docs        (este spec y siguientes)
  /.github/workflows
  ```
- **Ramas:** `main` (producción, protegida) + ramas de feature; PRs para integrar. Trunk-based ligero.
- **Actions:**
  - `sync-and-deploy.yml`: cron cada ~15 min + `workflow_dispatch` manual → sync Notion → build → deploy Pages.
  - `ci.yml`: en cada PR → lint, typecheck, tests, build.
- **Secretos:** `NOTION_TOKEN`, `CLOUDFLARE_API_TOKEN`, IDs de bases de datos.
- **Autoría de commits/PRs:** los commits que hagas tú (o que autorices) van firmados con tu nombre/email de git. Un agente no puede firmar legítimamente como tú; la práctica correcta es que **tú configures `git config user.name/email`** y que los PRs se abran desde tu cuenta. Los commits generados por automatización (Actions) usan un autor de bot claramente identificado. Detalle a resolver al montar el repo.
- **Versionado:** SemVer + GitHub Releases por hito.

## 9. Arquitectura Frontend (Astro)
- Rutas: `/` (home + destacadas), `/novelas`, `/novela/[slug]`, `/novela/[slug]/[capitulo]`, `/categoria/[slug]`, `/buscar`.
- **Islas interactivas** (única JS que se envía): buscador, toggle de tema, marcadores/favoritos, cuenta regresiva, fetch de capítulo bloqueado al Worker.
- Páginas de lectura: **cero JS** salvo la isla mínima de progreso/tema.
- Imágenes: `<Image>` de Astro (AVIF/WebP, `srcset`, lazy loading, dimensiones para evitar CLS).
- Fuentes: self-hosted, `font-display: swap`, subset.

## 10. Estrategia de seguridad y protección de contenido (análisis honesto)

**Límite real e ineludible:** cualquier texto que un lector puede leer, un lector puede copiar o fotografiar. Ninguna plataforma (Netflix, Kindle, Wattpad) lo impide. Por eso separamos lo que **sí** protege de lo que es **teatro de seguridad**.

### Sí implementamos (ROI positivo)
| Medida | Qué protege | Nivel real |
|---|---|---|
| **Gating por Worker** de capítulos con fecha futura | Acceso anticipado y extracción del repo | **Alto** (el texto no existe en el cliente hasta la fecha) |
| **Rate limiting** en el Worker | Scraping automatizado del contenido gateado | Medio-alto |
| **Bot management de Cloudflare** (gratis) | Bots y scraping masivo en todo el sitio | Medio |
| **CSP estricta** + headers de seguridad (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) | XSS, inyección, fugas | Alto (mitigación OWASP) |
| **`noindex` selectivo** en páginas que no deben indexarse | Indexación no deseada | Alto |
| **Marca de agua** (visible sutil + invisible por sesión en contenido gateado) | Disuasión y trazabilidad de filtraciones | Medio (disuasorio) |
| **Protección de imágenes** (marca de agua, sin original a resolución completa, servidas por edge) | Reuso de ilustraciones | Medio |

### NO implementamos (ROI negativo — daño > beneficio)
- Deshabilitar selección de texto, clic derecho, arrastre, detección de DevTools, ofuscación del texto plano.
- **Por qué:** en contenido que ya llegó al navegador son triviales de saltar (basta ver el HTML/JSON), y **rompen accesibilidad, SEO y UX** para el 99% de lectores honestos. El 1% que quiere copiar lo hace igual. Se documenta la decisión; si el autor insiste tras leer esto, se reconsidera con costes claros.

### OWASP (Top 10 aplicable a este stack estático + Worker)
- Sin login → sin superficie de autenticación/sesión (elimina categorías enteras del Top 10).
- Inyección: contenido de Notion se sanitiza al renderizar (allowlist de HTML).
- Config de seguridad: headers/CSP gestionados en Pages y Worker.
- Componentes vulnerables: Dependabot + `npm audit` en CI.
- SSRF/secret exposure: tokens solo en secretos de Actions y del Worker, nunca en el bundle.

## 11. Experiencia de lectura y Design System (resumen; DS completo en su propia rebanada)
- **Tipografía:** serif de lectura para el cuerpo (p. ej. familia tipo Literata/Source Serif), sans para UI. Escala tipográfica modular.
- **Ancho óptimo:** 60–75 caracteres por línea (`max-width` ~65ch).
- **Ritmo vertical** y `line-height` ~1.6–1.75 en cuerpo.
- **Tokens** (color, espaciado, radios, sombras, tipografía) como CSS custom properties; temas claro/oscuro por tokens.
- **Microinteracciones** sobrias, respetando `prefers-reduced-motion`.
- **Carga progresiva / prefetch** del siguiente capítulo; lazy loading de imágenes.

## 12. Roadmap (rebanadas)
- **Slice 0 — Cimientos:** repo, CI, Astro base, deploy a Cloudflare Pages con contenido de ejemplo. *(Sale un sitio en línea.)*
- **Slice 1 — Sync Notion (solo lectura publicada):** notion-sync genera novelas + capítulos publicados; listado y lectura reales.
- **Slice 2 — Experiencia de lectura + Design System + tema claro/oscuro.**
- **Slice 3 — Descubrimiento:** categorías, etiquetas, buscador cliente.
- **Slice 4 — Estado local:** favoritos, historial, continuar leyendo.
- **Slice 5 — Bloqueo real:** Worker de gating + cuenta regresiva + apertura automática + rate limiting + marcas de agua.
- **Slice 6 — Endurecimiento:** CSP/headers, SEO/sitemap/OG, accesibilidad AA, performance.

## 13. Backlog priorizado (inicial)
Prioridad = valor/lector ÷ esfuerzo. Slice 0→2 son P0 (sin ellos no hay producto). Slice 3–4 P1. Slice 5 P0 para el autor (es su requisito diferenciador) pero depende de 0–2. Slice 6 P1 continuo.

## 14. Riesgos técnicos
| Riesgo | Impacto | Mitigación |
|---|---|---|
| URLs de imagen de Notion caducan (~1h) | Imágenes rotas | Descargar y rehospedar en el sync |
| Límite de rate de la API de Notion | Sync falla en catálogos grandes | Paginación + backoff + caché incremental |
| Cuota gratuita del Worker (100k req/día) | Corte de servicio si crece mucho | Solo capítulos gateados pasan por Worker; caché en KV/edge |
| Reloj/zona horaria del desbloqueo | Capítulo abre a hora equivocada | Fechas en UTC; el Worker es la autoridad temporal |
| Deriva entre Notion y sitio (cambios sin re-sync) | Contenido desactualizado | Cron frecuente + dispatch manual "Publicar ahora" |

## 15. Riesgos de negocio
- **Filtración del contenido gateado** por un lector con acceso legítimo: mitigable (marca de agua/trazabilidad), no evitable. Expectativa realista comunicada.
- **Dependencia de terceros** (Notion/Cloudflare/GitHub): todos con planes gratuitos estables; el contenido original siempre vive en Notion (portabilidad).

## 16. Estimación de esfuerzo (orden de magnitud)
Slice 0: pequeño · Slice 1: mediano · Slice 2: mediano · Slice 3: pequeño-mediano · Slice 4: pequeño · Slice 5: mediano · Slice 6: continuo. Se afina en cada plan de implementación.

## 17. Plan de pruebas
- **Unidad:** lógica del sync (mapear Notion→modelo), utilidades de fecha/desbloqueo, estado local. Vitest.
- **Integración:** Worker de gating (antes/después de la fecha, rate limit). Miniflare/Wrangler.
- **E2E ligero:** flujos de lectura y bloqueo. Playwright, mínimo viable.
- **Calidad:** lint + typecheck + Lighthouse CI + checks de accesibilidad (axe) en CI.
- Filosofía: probar la lógica no trivial (fechas, gating, mapeo), no el andamiaje. Sin frameworks de test pesados donde no aporten.

## 18. Plan de despliegue
- `main` protegida; deploy automático a Cloudflare Pages vía Actions tras CI verde.
- Worker desplegado con Wrangler desde Actions.
- Rollback: Pages conserva despliegues previos (revert instantáneo).
- Preview deployments por PR.

## 19. Estrategia de mantenimiento
- Dependabot + `npm audit` en CI.
- El autor no mantiene nada técnico: escribe en Notion.
- Documentación mínima viva (este spec + README de operación).
- Monitoreo básico gratuito (analytics de Cloudflare, errores del Worker).

## 20. Registro de decisiones (ADR ligero)
1. **Cloudflare Pages en vez de GitHub Pages** — GitHub Pages estático no puede cumplir "bloqueo real por fecha" ni rate limiting; Cloudflare es gratis y sí puede. *(Aprobado)*
2. **Protección real, alcance A** — solo capítulos con fecha futura pasan por el Worker; los publicados se sirven estáticos. *(Aprobado)*
3. **Sin cuentas** — favoritos/historial/continuar en `localStorage`; elimina superficie OWASP de login. *(Aprobado)*
4. **Astro** como framework — cero JS por defecto, ideal para lectura/SEO. *(Propuesto, aprobado en arquitectura)*
5. **Spec vivo + iteración** en vez de 18 documentos en cascada. *(Aprobado)*
6. **Descartar anti-copia dañino** (deshabilitar selección/clic-derecho/DevTools) por ROI negativo. *(Aprobado)*
7. **Idioma:** solo español; sin i18n. *(Aprobado)*
8. **Hosting inicial:** subdominio gratuito `*.pages.dev`; sin dominio propio por ahora. *(Aprobado)*

---

## Preguntas abiertas
- Ninguna pendiente. Todas las decisiones de arquitectura están cerradas.
