# Slice 6 — Endurecimiento (seguridad, SEO, deps) · Registro

**Goal:** Cabeceras de seguridad + CSP, SEO (sitemap, meta/OG, datos estructurados con autoría), higiene de dependencias y marca de agua con nombre real.

## Entregado
1. **Cabeceras de seguridad** (`web/public/_headers`, servidas por Cloudflare Pages):
   CSP estricta (`default-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; `img-src 'self' data:`; `script/style-src 'self' 'unsafe-inline'` — necesario por los scripts/estilos inline de Astro; `connect-src 'self'` cubre el fetch de la Function), + `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `HSTS`.
2. **`robots.txt`** — permite todo salvo `/biblioteca` y `/buscar`; apunta al sitemap.
3. **Sitemap** (`@astrojs/sitemap@3.2.1`, compatible con Astro 4) filtrando utilidad; `sitemap-index.xml`.
4. **SEO en `BaseLayout`**: `description`, `canonical`, `author=Draveir`, Open Graph (`og:*`), Twitter card, `noindex` opcional; slot `head` para datos por página.
5. **`noindex`** en `/biblioteca` y `/buscar`.
6. **Datos estructurados** JSON-LD `Book` en el detalle de novela, con `author: Draveir`, género e idioma.
7. **Dependencias:** `npm audit fix` + **Wrangler v4** (elimina la cadena vulnerable miniflare/ws/undici). Vulnerabilidades restantes: solo herramientas de build/dev (vite/vitest/astro-dev), **no** se envían al lector.
8. **Marca de agua** de la Function: payload codificado (base64) con **Félix Llerena (Draveir)** + id único + timestamp, invisible en la respuesta del capítulo desbloqueado.

## Notas / futuro
- CSP usa `'unsafe-inline'` para script/style por los inline de Astro 4; endurecible con hashes/nonce si se migra a Astro 5 (feature CSP nativa).
- Marca de agua: base64 = ofuscación, no cifrado. Cifrado real (clave secreta en la Function) posible si se desea.
- Imagen Open Graph por defecto: pendiente (no hay portadas reales aún).
- Re-promoción a estático de capítulos ya desbloqueados vía cron (SEO/perf): Slice 5.1.
