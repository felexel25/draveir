# Slice 2 — Design System + experiencia de lectura · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vestir Draveir con la identidad "cinematográfico oscuro / pizarra": design tokens, tipografía self-hosted, modo oscuro/claro con toggle sin parpadeo, tarjetas de novela con portada tintada por categoría y una experiencia de lectura cuidada.

**Architecture:** Todo el color/espacio vive en CSS custom properties (`tokens.css`), consumidas por los componentes. Las fuentes se self-hospedan vía paquetes `@fontsource` (bundled por Vite → sin peticiones externas, compatible con CSP). La lógica pura (resolución de tema, mapeo categoría→gradiente) se extrae a `src/lib/` y se prueba con Vitest; el DOM/persistencia se maneja con un script mínimo inline (anti-FOUC) + un botón vanilla (sin framework islands).

**Tech Stack:** Astro, CSS custom properties, `@fontsource/literata` + `@fontsource-variable/inter`, Vitest.

**Referencia de diseño:** `docs/superpowers/specs/2026-07-06-design-system-design.md` (fuente de verdad de tokens y decisiones).

## Global Constraints

- **Dirección:** dark-first, familia pizarra, acento azul acero `#6BA3F0` (oscuro) / `#2E6FD6` (claro). Ámbar `#F0A83A` reservado para bloqueos (no usar aquí).
- **Sin peticiones externas** (fuentes self-hosted). Preparar el terreno para CSP de Slice 6.
- **Accesibilidad:** contraste AA en ambos temas, foco visible, `prefers-reduced-motion`.
- **Fuera de alcance:** portadas reales desde Notion (diferido; gradiente por categoría mientras tanto), buscador, estado local, bloqueo/cuenta regresiva.
- **Idioma:** español; **Node:** 20.
- Correr `npm run sync` (con `web/.env`) antes de `build`/`dev` para tener contenido; hay 2 novelas de ejemplo en Notion.

---

### Task 1: Design tokens y refactor de estilos globales

**Files:**
- Create: `web/src/styles/tokens.css`
- Modify: `web/src/styles/global.css` (consumir tokens)
- Modify: `web/vitest.config.ts` (incluir tests de `src/`)

**Interfaces:**
- Produces: variables CSS globales (`--bg`, `--surface`, `--text`, `--accent`, `--measure`, escala tipográfica, espaciados) para ambos temas; `global.css` sin colores hardcodeados.

- [ ] **Step 1: Crear `web/src/styles/tokens.css`**

```css
:root,
:root[data-theme='dark'] {
  --bg: #0e131b;
  --surface: #19212e;
  --surface-2: #202a39;
  --border: #2a3646;
  --text: #e7ecf3;
  --text-muted: #9aa6b6;
  --accent: #6ba3f0;
  --accent-strong: #8fbdf7;
  --warm: #f0a83a;
  --focus-ring: #6ba3f0;
}

:root[data-theme='light'] {
  --bg: #edf0f4;
  --surface: #ffffff;
  --surface-2: #e4e9f0;
  --border: #d5dce5;
  --text: #1a222d;
  --text-muted: #566072;
  --accent: #2e6fd6;
  --accent-strong: #1e5ab8;
  --warm: #b4740e;
  --focus-ring: #2e6fd6;
}

:root {
  --font-serif: 'Literata', Georgia, 'Times New Roman', serif;
  --font-sans: 'Inter Variable', 'Inter', system-ui, sans-serif;

  --step--1: 0.8rem;
  --step-0: 1.125rem;
  --step-1: 1.406rem;
  --step-2: 1.758rem;
  --step-3: 2.197rem;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;

  --radius: 10px;
  --radius-sm: 6px;
  --measure: 66ch;
}
```

- [ ] **Step 2: Reescribir `web/src/styles/global.css`**

```css
@import './tokens.css';

* { box-sizing: border-box; }

html { color-scheme: dark light; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-serif);
  font-size: var(--step-0);
  line-height: 1.75;
}

h1, h2, h3 { font-family: var(--font-serif); line-height: 1.2; }
h1 { font-size: var(--step-3); }
h2 { font-size: var(--step-2); }

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-strong); }

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.container {
  max-width: var(--measure);
  margin-inline: auto;
  padding: var(--space-5) var(--space-3);
}

.tag, .status {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: var(--step--1);
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  margin-right: var(--space-2);
}

@media (prefers-reduced-motion: no-preference) {
  a, button { transition: color 0.15s ease, background 0.15s ease; }
}
```

- [ ] **Step 3: Ampliar `web/vitest.config.ts` para tests en `src/`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Sync, check y build**

Run desde `web/`:
```bash
npm run sync && npm run check && npm run build
```
Expected: 0 errores; build genera las páginas (2 novelas ahora). El sitio se ve en pizarra oscura.

- [ ] **Step 5: Commit**

```bash
git add web/src/styles/tokens.css web/src/styles/global.css web/vitest.config.ts
git commit -m "feat(design): add design tokens and refactor global styles"
```

---

### Task 2: Tipografía self-hosted

**Files:**
- Modify: `web/package.json` (deps `@fontsource/literata`, `@fontsource-variable/inter`)
- Modify: `web/src/layouts/BaseLayout.astro` (importar fuentes)

**Interfaces:**
- Consumes: tokens `--font-serif`/`--font-sans` (Task 1).
- Produces: fuentes Literata e Inter servidas desde el propio origen (bundled por Vite).

- [ ] **Step 1: Instalar los paquetes de fuentes**

Run desde `web/`:
```bash
npm install @fontsource/literata@^5 @fontsource-variable/inter@^5
```
Expected: se añaden a `dependencies` sin errores.

- [ ] **Step 2: Importar las fuentes en `web/src/layouts/BaseLayout.astro`**

En el frontmatter (bloque `---`), añade los imports junto al de estilos:

```astro
---
import '@fontsource/literata/400.css';
import '@fontsource/literata/600.css';
import '@fontsource/literata/400-italic.css';
import '@fontsource-variable/inter';
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
```

- [ ] **Step 3: Build y verificar que las fuentes se emiten localmente**

Run desde `web/`:
```bash
npm run build && ls dist/_astro/*.woff2 | head -3
```
Expected: aparecen archivos `.woff2` en `dist/_astro/` (fuentes self-hosted, no externas).

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/package-lock.json web/src/layouts/BaseLayout.astro
git commit -m "feat(design): self-host Literata and Inter fonts"
```

---

### Task 3: Sistema de tema oscuro/claro (lógica pura + TDD)

**Files:**
- Create: `web/src/lib/theme.ts`
- Create: `web/src/lib/theme.test.ts`

**Interfaces:**
- Produces:
  - `type Theme = 'dark' | 'light'`
  - `resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme` — usa `stored` si es válido, si no cae al esquema del sistema.
  - `nextTheme(current: Theme): Theme` — alterna.
  - `THEME_KEY = 'draveir-theme'`

- [ ] **Step 1: Escribir el test que falla — `web/src/lib/theme.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveInitialTheme, nextTheme, THEME_KEY } from './theme';

describe('resolveInitialTheme', () => {
  it('respeta la preferencia guardada si es válida', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
    expect(resolveInitialTheme('dark', false)).toBe('dark');
  });

  it('cae al esquema del sistema si no hay preferencia válida', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
    expect(resolveInitialTheme('banana', true)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('alterna entre dark y light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});

describe('THEME_KEY', () => {
  it('es la clave de localStorage', () => {
    expect(THEME_KEY).toBe('draveir-theme');
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run desde `web/`:
```bash
npx vitest run src/lib/theme.test.ts
```
Expected: FAIL — `./theme` no existe.

- [ ] **Step 3: Implementar `web/src/lib/theme.ts`**

```ts
export type Theme = 'dark' | 'light';

export const THEME_KEY = 'draveir-theme';

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'dark' || stored === 'light') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
```

- [ ] **Step 4: Ejecutar el test para verlo pasar**

Run desde `web/`:
```bash
npx vitest run src/lib/theme.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/theme.ts web/src/lib/theme.test.ts
git commit -m "feat(design): add pure theme resolution logic with tests"
```

---

### Task 4: Header, toggle de tema (anti-FOUC) y footer

**Files:**
- Create: `web/src/components/Header.astro`
- Create: `web/src/components/Footer.astro`
- Modify: `web/src/layouts/BaseLayout.astro` (script anti-FOUC en `<head>`, montar Header/Footer)

**Interfaces:**
- Consumes: `resolveInitialTheme`, `nextTheme`, `THEME_KEY` (Task 3); tokens (Task 1).
- Produces: header con marca + enlace a Novelas + botón de tema que persiste en `localStorage` sin parpadeo.

- [ ] **Step 1: Crear `web/src/components/Header.astro`**

```astro
---
---
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="brand">Draveir</a>
    <nav class="site-nav">
      <a href="/novelas">Novelas</a>
      <button id="theme-toggle" type="button" aria-label="Cambiar tema" title="Cambiar tema">
        <span aria-hidden="true">◐</span>
      </button>
    </nav>
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }
  .header-inner {
    max-width: 72rem;
    margin-inline: auto;
    padding: var(--space-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    font-family: var(--font-serif);
    font-size: var(--step-1);
    font-weight: 600;
    color: var(--text);
  }
  .site-nav {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    font-family: var(--font-sans);
  }
  #theme-toggle {
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    font-size: 1rem;
  }
  #theme-toggle:hover { background: var(--surface-2); }
</style>

<script>
  import { nextTheme, THEME_KEY, type Theme } from '../lib/theme';

  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', () => {
    const current = (document.documentElement.dataset.theme as Theme) ?? 'dark';
    const next = nextTheme(current);
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  });
</script>
```

- [ ] **Step 2: Crear `web/src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <p>Draveir · {year} · Escrito con niebla y relojes.</p>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--border);
    margin-top: var(--space-6);
    padding: var(--space-4) var(--space-3);
    text-align: center;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: var(--step--1);
  }
</style>
```

- [ ] **Step 3: Actualizar `web/src/layouts/BaseLayout.astro`**

Reemplaza el `<html>…</html>` por (mantén el frontmatter con los imports de Task 2):

```astro
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
    <script is:inline>
      // Anti-FOUC: fija el tema antes del primer pintado.
      (function () {
        try {
          var stored = localStorage.getItem('draveir-theme');
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
          document.documentElement.dataset.theme = theme;
        } catch (e) {
          document.documentElement.dataset.theme = 'dark';
        }
      })();
    </script>
  </head>
  <body>
    <Header />
    <slot />
    <Footer />
  </body>
</html>
```

Y añade los imports de componentes al frontmatter:

```astro
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
```

- [ ] **Step 4: Build y verificar el script anti-FOUC**

Run desde `web/`:
```bash
npm run sync && npm run build && grep -q "draveir-theme" dist/index.html && echo "OK anti-FOUC inline"
```
Expected: `OK anti-FOUC inline` (el script inline está en el HTML).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Header.astro web/src/components/Footer.astro web/src/layouts/BaseLayout.astro
git commit -m "feat(design): add header with no-flash theme toggle and footer"
```

---

### Task 5: NovelCard con portada tintada por categoría (lógica pura + TDD)

**Files:**
- Create: `web/src/lib/covers.ts`
- Create: `web/src/lib/covers.test.ts`
- Create: `web/src/components/NovelCard.astro`
- Modify: `web/src/pages/novelas/index.astro` (usar NovelCard)

**Interfaces:**
- Consumes: colección `novels` (Slice 1), tokens (Task 1).
- Produces:
  - `coverGradient(categories: string[]): string` — devuelve un `linear-gradient(...)` CSS según la primera categoría conocida, con fallback neutro.

- [ ] **Step 1: Escribir el test que falla — `web/src/lib/covers.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { coverGradient } from './covers';

describe('coverGradient', () => {
  it('devuelve el gradiente de la primera categoría conocida', () => {
    expect(coverGradient(['Terror'])).toContain('#5a2431');
    expect(coverGradient(['Ciencia ficción'])).toContain('#2e6e7e');
  });

  it('usa el fallback neutro si no hay categorías o no se reconocen', () => {
    expect(coverGradient([])).toContain('#3a4658');
    expect(coverGradient(['Inexistente'])).toContain('#3a4658');
  });

  it('siempre produce un linear-gradient', () => {
    expect(coverGradient(['Fantasía'])).toMatch(/^linear-gradient\(/);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verlo fallar**

Run desde `web/`:
```bash
npx vitest run src/lib/covers.test.ts
```
Expected: FAIL — `./covers` no existe.

- [ ] **Step 3: Implementar `web/src/lib/covers.ts`**

```ts
const GRADIENTS: Record<string, [string, string]> = {
  'Fantasía': ['#26314a', '#3b4e7a'],
  'Ciencia ficción': ['#1e3340', '#2e6e7e'],
  'Terror': ['#241a22', '#5a2431'],
  'Misterio': ['#22283c', '#3e3a66'],
  'Aventura': ['#2a2620', '#6e5326'],
  'Acción': ['#2a2620', '#6e5326'],
  'Romance': ['#2a2230', '#6e3450'],
};

const FALLBACK: [string, string] = ['#26303f', '#3a4658'];

export function coverGradient(categories: string[]): string {
  const match = categories.map((c) => GRADIENTS[c]).find(Boolean);
  const [from, to] = match ?? FALLBACK;
  return `linear-gradient(135deg, ${from}, ${to})`;
}
```

- [ ] **Step 4: Ejecutar el test para verlo pasar**

Run desde `web/`:
```bash
npx vitest run src/lib/covers.test.ts
```
Expected: PASS.

- [ ] **Step 5: Crear `web/src/components/NovelCard.astro`**

```astro
---
import { coverGradient } from '../lib/covers';

interface Props {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  categories: string[];
}

const { slug, title, synopsis, status, categories } = Astro.props;
const gradient = coverGradient(categories);
---

<li class="novel-card">
  <a href={`/novela/${slug}`}>
    <span class="cover" style={`background:${gradient}`} aria-hidden="true">
      {title.charAt(0)}
    </span>
    <h2>{title}</h2>
    <p class="synopsis">{synopsis}</p>
    <div class="meta">
      {status && <span class="status">{status}</span>}
      {categories.slice(0, 2).map((c) => <span class="tag">{c}</span>)}
    </div>
  </a>
</li>

<style>
  .novel-card a { display: block; color: inherit; }
  .novel-card .cover {
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 4;
    border-radius: var(--radius);
    font-family: var(--font-serif);
    font-size: 3rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: var(--space-3);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .novel-card h2 { font-size: var(--step-1); margin: 0 0 var(--space-2); }
  .synopsis {
    color: var(--text-muted);
    font-size: var(--step-0);
    margin: 0 0 var(--space-3);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  @media (prefers-reduced-motion: no-preference) {
    .novel-card .cover { transition: transform 0.2s ease; }
    .novel-card a:hover .cover { transform: translateY(-4px); }
  }
</style>
```

- [ ] **Step 6: Usar NovelCard en `web/src/pages/novelas/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import NovelCard from '../../components/NovelCard.astro';

const novels = (await getCollection('novels')).sort((a, b) =>
  a.data.title.localeCompare(b.data.title, 'es'),
);
---

<BaseLayout title="Novelas — Draveir">
  <main class="container wide">
    <h1>Novelas</h1>
    <ul class="novel-grid">
      {novels.map((n) => (
        <NovelCard
          slug={n.data.slug}
          title={n.data.title}
          synopsis={n.data.synopsis}
          status={n.data.status}
          categories={n.data.categories}
        />
      ))}
    </ul>
  </main>
</BaseLayout>

<style>
  .wide { max-width: 72rem; }
  .novel-grid {
    list-style: none;
    padding: 0;
    display: grid;
    gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  }
</style>
```

- [ ] **Step 7: Sync, check, build y verificar**

Run desde `web/`:
```bash
npm run sync && npm run check && npm run build && grep -q "El Jardín de los Relojes" dist/novelas/index.html && echo "OK 2 novelas con tarjetas"
```
Expected: `OK 2 novelas con tarjetas`.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/covers.ts web/src/lib/covers.test.ts web/src/components/NovelCard.astro web/src/pages/novelas/index.astro
git commit -m "feat(design): add novel cards with category-tinted covers"
```

---

### Task 6: Detalle de novela y experiencia de lectura

**Files:**
- Modify: `web/src/pages/novela/[slug].astro` (hero + índice estilizados)
- Modify: `web/src/pages/novela/[slug]/[capitulo].astro` (tipografía de lectura + nav)
- Modify: `web/src/styles/global.css` (estilos de `.reading` y listas de capítulos)

**Interfaces:**
- Consumes: tokens (Task 1), `coverGradient` (Task 5).
- Produces: página de novela con hero (portada tintada + metadatos) y vista de lectura con ritmo tipográfico cuidado.

- [ ] **Step 1: Añadir estilos de lectura al final de `web/src/styles/global.css`**

```css
.reading article {
  font-size: var(--step-0);
  line-height: 1.8;
}
.reading article p { margin: 0 0 var(--space-4); text-wrap: pretty; }
.reading article blockquote {
  margin: var(--space-4) 0;
  padding-left: var(--space-3);
  border-left: 3px solid var(--accent);
  color: var(--text-muted);
  font-style: italic;
}
.reading h1 { margin-bottom: var(--space-5); }

.chapter-list {
  list-style: none;
  padding: 0;
  font-family: var(--font-sans);
}
.chapter-list li { border-bottom: 1px solid var(--border); }
.chapter-list a { display: block; padding: var(--space-3) 0; }

.chapter-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
  font-family: var(--font-sans);
}

.novel-hero {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--space-5);
  align-items: start;
  margin-bottom: var(--space-5);
}
.novel-hero .cover {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  font-family: var(--font-serif);
  font-size: 2.5rem;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
@media (max-width: 560px) {
  .novel-hero { grid-template-columns: 100px 1fr; }
}
```

- [ ] **Step 2: Reescribir `web/src/pages/novela/[slug].astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { coverGradient } from '../../lib/covers';

export async function getStaticPaths() {
  const novels = await getCollection('novels');
  return novels.map((n) => ({ params: { slug: n.data.slug } }));
}

const { slug } = Astro.params;
const novel = await getEntry('novels', slug);
if (!novel) return Astro.redirect('/novelas');

const chapters = (await getCollection('chapters'))
  .filter((c) => c.data.novelSlug === slug)
  .sort((a, b) => a.data.number - b.data.number);

const gradient = coverGradient(novel.data.categories);
---

<BaseLayout title={`${novel.data.title} — Draveir`}>
  <main class="container wide">
    <a href="/novelas">← Novelas</a>
    <div class="novel-hero">
      <span class="cover" style={`background:${gradient}`} aria-hidden="true">
        {novel.data.title.charAt(0)}
      </span>
      <div>
        <h1>{novel.data.title}</h1>
        <p>{novel.data.synopsis}</p>
        <div class="meta">
          {novel.data.status && <span class="status">{novel.data.status}</span>}
          {novel.data.categories.map((c) => <span class="tag">{c}</span>)}
        </div>
      </div>
    </div>
    <h2>Capítulos</h2>
    <ol class="chapter-list">
      {chapters.map((c) => (
        <li><a href={`/novela/${slug}/${c.data.chapterSlug}`}>{c.data.title}</a></li>
      ))}
    </ol>
  </main>
</BaseLayout>

<style>
  .wide { max-width: 60rem; }
</style>
```

- [ ] **Step 3: Verificar el bloque de lectura en `[capitulo].astro`**

El archivo ya usa `class="container reading"` (Slice 1). Confirma que sigue así; los estilos de Step 1 le dan la tipografía. No requiere cambios de lógica.

Run desde `web/`:
```bash
grep -q 'container reading' "src/pages/novela/[slug]/[capitulo].astro" && echo "OK reading class presente"
```
Expected: `OK reading class presente`.

- [ ] **Step 4: Sync, check, build y verificación de extremo a extremo**

Run desde `web/`:
```bash
npm run sync && npm run check && npm run build \
  && grep -q "novel-hero" dist/novela/el-heraldo-gris/index.html \
  && grep -q "Lo que se entrega" dist/novela/el-heraldo-gris/capitulo-1/index.html \
  && echo "OK detalle + lectura"
```
Expected: `OK detalle + lectura`.

- [ ] **Step 5: Commit**

```bash
git add "web/src/pages/novela/[slug].astro" "web/src/pages/novela/[slug]/[capitulo].astro" web/src/styles/global.css
git commit -m "feat(design): style novel detail hero and reading experience"
```

---

## Self-Review

**Cobertura del design doc (`2026-07-06-design-system-design.md`):**
- Tokens de color (dark/light) ✓ Task 1.
- Tipografía self-hosted (Literata/Inter) ✓ Task 2.
- Modo oscuro/claro sin parpadeo + toggle ✓ Tasks 3–4.
- Escala tipográfica, espaciados, radios ✓ Task 1.
- NovelCard + tinte por categoría ✓ Task 5.
- Hero de detalle + experiencia de lectura ✓ Task 6.
- Accesibilidad (foco, contraste, reduced-motion) ✓ Tasks 1, 5, 6.
- Fuera de alcance (portadas reales, subsetting) declarado y respetado.

**Placeholders:** ninguno; todo el CSS/TS/Astro está completo.

**Consistencia de tipos y nombres:** `Theme`, `resolveInitialTheme`, `nextTheme`, `THEME_KEY` ('draveir-theme') usados igual en Task 3 (lógica), Task 4 (toggle + script inline con la misma clave literal). `coverGradient(categories)` definido en Task 5 y consumido en NovelCard (Task 5) y detalle (Task 6). Las categorías del mapa (`Fantasía`, `Ciencia ficción`, `Terror`, `Misterio`, `Aventura`, `Acción`, `Romance`) coinciden con las opciones de la base `Novelas` en Notion. Clase `.reading` compartida entre Slice 1 y los estilos de Task 6.

**Pruebas (ponytail):** la lógica no trivial y pura (resolución de tema, mapeo categoría→gradiente) tiene tests unitarios; el DOM/persistencia y el render se validan por build + grep de extremo a extremo. No se testea CSS ni framework — sería andamiaje sin valor.
