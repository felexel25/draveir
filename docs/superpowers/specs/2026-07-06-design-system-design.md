# Draveir — Design System (Slice 2) · Documento de Diseño

- **Estado:** Propuesto — pendiente de revisión del usuario
- **Fecha:** 2026-07-06
- **Dirección:** Cinematográfico oscuro, familia pizarra (grises azulados), un acento azul acero.
- **Contexto:** géneros del autor — fantasía, ciencia ficción, terror cósmico, acción, aventura, misterio.

## 1. Principios
- **Dark-first, inmersivo.** El default es oscuro; el modo claro existe y es de primera clase.
- **Monocromático + un acento.** Todo vive en la familia pizarra; el azul acero es el único color de interacción. El ámbar cálido se reserva para estados de espera (bloqueo/cuenta regresiva, Slice 5).
- **El texto manda.** Tipografía y ritmo optimizados para lectura larga; la UI se aparta.
- **Tokens primero.** Ningún valor de color/espacio hardcodeado en componentes; todo por CSS custom properties. Cambiar la identidad = cambiar tokens.

## 2. Tokens de color

### Oscuro (default, `:root` y `[data-theme="dark"]`)
```
--bg:            #0E131B   /* pizarra profunda */
--surface:       #19212E   /* tarjetas, header */
--surface-2:     #202A39   /* hover, elementos elevados */
--border:        #2A3646
--text:          #E7ECF3
--text-muted:    #9AA6B6
--accent:        #6BA3F0   /* azul acero: enlaces, botones, foco */
--accent-strong: #8FBDF7   /* hover/activo */
--warm:          #F0A83A   /* SOLO bloqueo/cuenta regresiva (Slice 5) */
--focus-ring:    #6BA3F0
```

### Claro (`[data-theme="light"]`) — "pergamino frío"
```
--bg:            #EDF0F4
--surface:       #FFFFFF
--surface-2:     #E4E9F0
--border:        #D5DCE5
--text:          #1A222D
--text-muted:    #566072
--accent:        #2E6FD6
--accent-strong: #1E5AB8
--warm:          #B4740E
--focus-ring:    #2E6FD6
```

**Contraste:** texto/fondo cumple WCAG AA en ambos temas (verificar en implementación con las combinaciones reales).

### Tinte de portada por categoría (gradiente 135°, sobre familia fría)
```
Fantasía:          #26314A → #3B4E7A
Ciencia ficción:   #1E3340 → #2E6E7E
Terror:            #241A22 → #5A2431
Misterio:          #22283C → #3E3A66
Aventura / Acción: #2A2620 → #6E5326
Romance:           #2A2230 → #6E3450
(sin categoría):   #26303F → #3A4658
```
La inicial del título va centrada sobre el gradiente. Cuando el autor suba una portada real (diferido, ver §7), reemplaza al gradiente.

## 3. Tipografía
- **Lectura/cuerpo y títulos:** **Literata** (serif, OFL) — peso literario, excelente para texto largo.
- **UI (nav, etiquetas, botones):** **Inter** (sans, OFL) — neutra y limpia.
- **Self-hosted** (woff2 en `/public/fonts`, `@font-face`, `font-display: swap`). Sin peticiones externas → compatible con CSP estricta (Slice 6). El subsetting fino se difiere a Slice 6 (perf).
- **Escala** (base 18px, ratio ~1.25):
  ```
  --step--1: 0.8rem    (etiquetas)
  --step-0:  1.125rem  (cuerpo)
  --step-1:  1.406rem
  --step-2:  1.758rem
  --step-3:  2.197rem  (h1)
  ```
- **Lectura:** `line-height: 1.75`, medida `--measure: 66ch`, `text-wrap: pretty` en párrafos.

## 4. Espaciado y radios
```
--space-1: .25rem  --space-2: .5rem  --space-3: 1rem
--space-4: 1.5rem  --space-5: 2rem   --space-6: 3rem
--radius: 10px     --radius-sm: 6px
```

## 5. Modo oscuro/claro (sin parpadeo)
- **Default:** respeta `prefers-color-scheme`; si el usuario elige manualmente, se persiste en `localStorage` (clave `draveir-theme`).
- **Anti-FOUC:** un script inline mínimo en `<head>` fija `data-theme` en `<html>` **antes** del primer pintado.
- **Toggle:** isla interactiva mínima (único JS de la página) en el header; alterna `data-theme` y persiste. Respeta `prefers-reduced-motion` en la transición.

## 6. Componentes (Slice 2)
- **Header:** marca "Draveir" + enlace a Novelas + toggle de tema. Sticky, superficie translúcida.
- **Footer:** discreto, crédito.
- **NovelCard:** portada tintada por categoría, título (serif), sinopsis (2–3 líneas, `line-clamp`), estado y etiquetas.
- **NovelHero** (detalle): portada + título + sinopsis + metadatos + índice de capítulos.
- **Reading:** ancho `--measure`, tipografía de lectura, estilos para `blockquote`/`em`/`strong`/encabezados; nav anterior/siguiente.
- **Estados:** foco visible (`--focus-ring`), hover con `--surface-2`, `:focus-visible` en todo lo interactivo.

## 7. Fuera de alcance (Slice 2)
- **Portadas/ilustraciones reales desde Notion** (requiere pipeline de rehospedado de imágenes: descargar URLs firmadas que caducan, optimizar, servir). Se difiere hasta que el autor suba una portada real; hasta entonces, gradiente por categoría. *(ponytail: no construir el pipeline de imágenes sin una sola imagen que servir.)*
- Buscador/filtros (Slice 3), estado local (Slice 4), bloqueo/cuenta regresiva (Slice 5), animaciones avanzadas y subsetting de fuentes (Slice 6).

## 8. Accesibilidad (base en este slice)
- Contraste AA en ambos temas.
- Foco visible en todo elemento interactivo.
- `prefers-reduced-motion` respetado.
- Semántica correcta (`<nav>`, `<main>`, `<article>`, jerarquía de encabezados).
- Toggle de tema con `aria-label` y estado.
