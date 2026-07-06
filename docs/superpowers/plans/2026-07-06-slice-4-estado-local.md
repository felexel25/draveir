# Slice 4 — Estado local del lector · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Favoritos, "continuar leyendo" e historial, todo guardado en el navegador del lector (sin cuentas), con una página "Mi biblioteca".

**Architecture:** Un reductor puro `reader.ts` maneja el `ReaderState` (favoritos, continueReading, historial) y se prueba con Vitest. Un script mínimo por página lee/escribe `localStorage` (clave `draveir-reader`) usando ese reductor. La UI se hidrata en cliente (progresivo): los botones y listas se muestran/rellenan según el estado guardado. La página "Mi biblioteca" renderiza todas las novelas como tarjetas (ocultas) y el cliente muestra las favoritas; continuar/historial se arman desde un catálogo JSON embebido.

**Tech Stack:** Astro, Vitest, localStorage. Cero JS de framework, sin dependencias nuevas.

## Global Constraints
- Sin cuentas; datos solo en el navegador (privacidad; sin superficie OWASP de login).
- Progresivo: sin JS el sitio sigue funcionando (los extras simplemente no aparecen).
- Clave `localStorage`: `draveir-reader` (el tema usa `draveir-theme`, aparte).
- Correr `npm run sync` (o usar contenido en disco) antes de build.

---

### Task 1: Reductor de estado `reader.ts` (puro + TDD)

**Files:** Create `web/src/lib/reader.ts`, `web/src/lib/reader.test.ts`

**Interfaces:**
- `interface ReaderState { version: 1; favorites: string[]; continueReading: Record<string,string>; history: HistoryEntry[] }`
- `interface HistoryEntry { novelSlug: string; chapterSlug: string; title: string; at: number }`
- `READER_KEY = 'draveir-reader'`
- `emptyState()`, `parseState(raw)`, `isFavorite(s, slug)`, `toggleFavorite(s, slug)`, `recordRead(s, entry)`

- [ ] **Step 1: Test `web/src/lib/reader.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { emptyState, parseState, isFavorite, toggleFavorite, recordRead } from './reader';

describe('parseState', () => {
  it('vacío para null o JSON inválido o versión distinta', () => {
    expect(parseState(null)).toEqual(emptyState());
    expect(parseState('no-json')).toEqual(emptyState());
    expect(parseState(JSON.stringify({ version: 9 }))).toEqual(emptyState());
  });
  it('conserva un estado válido', () => {
    const s = { version: 1, favorites: ['a'], continueReading: { a: 'capitulo-1' }, history: [] };
    expect(parseState(JSON.stringify(s))).toEqual(s);
  });
});

describe('favorites', () => {
  it('alterna y consulta', () => {
    let s = emptyState();
    expect(isFavorite(s, 'a')).toBe(false);
    s = toggleFavorite(s, 'a');
    expect(isFavorite(s, 'a')).toBe(true);
    s = toggleFavorite(s, 'a');
    expect(isFavorite(s, 'a')).toBe(false);
  });
});

describe('recordRead', () => {
  it('actualiza continueReading y encabeza el historial sin duplicar', () => {
    let s = emptyState();
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-1', title: 'A · 1', at: 1 });
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-2', title: 'A · 2', at: 2 });
    s = recordRead(s, { novelSlug: 'a', chapterSlug: 'capitulo-1', title: 'A · 1', at: 3 });
    expect(s.continueReading.a).toBe('capitulo-1');
    expect(s.history.map((h) => h.chapterSlug)).toEqual(['capitulo-1', 'capitulo-2']);
    expect(s.history[0].at).toBe(3);
  });
});
```

- [ ] **Step 2: Ver fallar** — `npx vitest run src/lib/reader.test.ts`.

- [ ] **Step 3: Implementar `web/src/lib/reader.ts`**
```ts
export interface HistoryEntry {
  novelSlug: string;
  chapterSlug: string;
  title: string;
  at: number;
}
export interface ReaderState {
  version: 1;
  favorites: string[];
  continueReading: Record<string, string>;
  history: HistoryEntry[];
}

export const READER_KEY = 'draveir-reader';
const HISTORY_CAP = 50;

export function emptyState(): ReaderState {
  return { version: 1, favorites: [], continueReading: {}, history: [] };
}

export function parseState(raw: string | null): ReaderState {
  if (!raw) return emptyState();
  try {
    const o = JSON.parse(raw);
    if (!o || o.version !== 1) return emptyState();
    return {
      version: 1,
      favorites: Array.isArray(o.favorites) ? o.favorites : [],
      continueReading:
        o.continueReading && typeof o.continueReading === 'object' ? o.continueReading : {},
      history: Array.isArray(o.history) ? o.history : [],
    };
  } catch {
    return emptyState();
  }
}

export function isFavorite(s: ReaderState, slug: string): boolean {
  return s.favorites.includes(slug);
}

export function toggleFavorite(s: ReaderState, slug: string): ReaderState {
  const favorites = isFavorite(s, slug)
    ? s.favorites.filter((x) => x !== slug)
    : [slug, ...s.favorites];
  return { ...s, favorites };
}

export function recordRead(
  s: ReaderState,
  e: { novelSlug: string; chapterSlug: string; title: string; at: number },
): ReaderState {
  const continueReading = { ...s.continueReading, [e.novelSlug]: e.chapterSlug };
  const filtered = s.history.filter(
    (h) => !(h.novelSlug === e.novelSlug && h.chapterSlug === e.chapterSlug),
  );
  const history = [{ ...e }, ...filtered].slice(0, HISTORY_CAP);
  return { ...s, continueReading, history };
}
```

- [ ] **Step 4: Ver pasar.** **Commit** `feat(reader): add pure local reader-state reducer with tests`.

---

### Task 2: Botón de favorito en el detalle de novela

**Files:** Create `web/src/components/FavoriteButton.astro`; Modify `web/src/pages/novela/[slug].astro`

- [ ] **Step 1: Crear `web/src/components/FavoriteButton.astro`**
```astro
---
interface Props { slug: string; }
const { slug } = Astro.props;
---
<button class="fav" type="button" data-slug={slug} aria-pressed="false" hidden>
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 5 5.3 5c2 0 3.4 1.2 4.7 2.8C11.3 6.2 12.7 5 14.7 5 18 5 19.6 8.4 22 11.8 19.5 16.4 12 21 12 21z"/>
  </svg>
  <span class="fav-label">Guardar</span>
</button>

<style>
  .fav {
    display: inline-flex; align-items: center; gap: 0.5rem;
    font-family: var(--font-sans); font-size: 0.9rem; font-weight: 600;
    padding: 0.55rem 1rem; border-radius: var(--radius);
    border: 1px solid var(--line-bright); background: transparent; color: var(--text); cursor: pointer;
  }
  .fav:hover { border-color: var(--accent); }
  .fav[aria-pressed="true"] { color: var(--brass); border-color: var(--brass); }
  .fav[aria-pressed="true"] svg { fill: var(--brass); }
</style>

<script>
  import { parseState, toggleFavorite, isFavorite, READER_KEY } from '../lib/reader';

  document.querySelectorAll<HTMLButtonElement>('.fav').forEach((btn) => {
    const slug = btn.dataset.slug!;
    const paint = () => {
      const s = parseState(localStorage.getItem(READER_KEY));
      const on = isFavorite(s, slug);
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('.fav-label')!.textContent = on ? 'Guardada' : 'Guardar';
    };
    btn.hidden = false;
    paint();
    btn.addEventListener('click', () => {
      const s = toggleFavorite(parseState(localStorage.getItem(READER_KEY)), slug);
      localStorage.setItem(READER_KEY, JSON.stringify(s));
      paint();
    });
  });
</script>
```
(El botón arranca `hidden`; el script lo muestra — así sin JS no aparece un control que no funcionaría.)

- [ ] **Step 2: Insertar en `web/src/pages/novela/[slug].astro`** dentro del `<div class="meta">`, tras las etiquetas, añade el import y el componente:
```astro
import FavoriteButton from '../../components/FavoriteButton.astro';
```
Y en el hero, envuelve estado/etiquetas y el botón en una fila:
```astro
        <div class="meta">
          {novel.data.status && <span class="status">{novel.data.status}</span>}
          {novel.data.categories.map((c) => (
            <a class="tag" href={`/categoria/${slugify(c)}`}>{c}</a>
          ))}
        </div>
        <div class="detail-actions">
          <a class="btn btn-primary" id="continue-btn" href="#" hidden>Continuar leyendo</a>
          <FavoriteButton slug={novel.data.slug} />
        </div>
```
Añade al `<style>` del detalle:
```css
  .detail-actions { display: flex; gap: 0.75rem; margin-top: var(--space-4); flex-wrap: wrap; }
```

- [ ] **Step 3: `npm run check`** → 0 errores. **Commit** `feat(reader): favorite button on novel detail`.

---

### Task 3: Registrar progreso + "continuar leyendo"

**Files:** Modify `web/src/pages/novela/[slug]/[capitulo].astro`, `web/src/pages/novela/[slug].astro`

- [ ] **Step 1: Registrar lectura en la página de capítulo**
En `[capitulo].astro`, antes de `</BaseLayout>`, añade un script que guarde el progreso (usa datos ya disponibles):
```astro
  <script is:inline set:html={`window.__chapter=${JSON.stringify({
    novelSlug: slug,
    chapterSlug: entry.data.chapterSlug,
    title: `${novel?.data.title ?? 'Novela'} · ${entry.data.title}`,
  })};`}></script>
  <script>
    import { parseState, recordRead, READER_KEY } from '../../../lib/reader';
    const c = (window as any).__chapter;
    if (c) {
      const s = recordRead(parseState(localStorage.getItem(READER_KEY)), { ...c, at: Date.now() });
      localStorage.setItem(READER_KEY, JSON.stringify(s));
    }
  </script>
```

- [ ] **Step 2: Activar "Continuar leyendo" en el detalle**
En `[slug].astro`, antes de `</BaseLayout>`, añade:
```astro
  <script is:inline set:html={`window.__novelSlug=${JSON.stringify(novel.data.slug)};`}></script>
  <script>
    import { parseState, READER_KEY } from '../../lib/reader';
    const slug = (window as any).__novelSlug as string;
    const s = parseState(localStorage.getItem(READER_KEY));
    const ch = s.continueReading[slug];
    const btn = document.getElementById('continue-btn') as HTMLAnchorElement | null;
    if (btn && ch) {
      btn.href = `/novela/${slug}/${ch}`;
      btn.hidden = false;
    }
  </script>
```

- [ ] **Step 3: Sync/build y verificar** — `npm run build && grep -q 'continue-btn' dist/novela/el-heraldo-gris/index.html && echo OK`.
- [ ] **Step 4: Commit** `feat(reader): record reading progress and continue-reading link`.

---

### Task 4: Página "Mi biblioteca" + enlace en el header

**Files:** Create `web/src/pages/biblioteca.astro`; Modify `web/src/components/Header.astro`

- [ ] **Step 1: Crear `web/src/pages/biblioteca.astro`**
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import NovelCard from '../components/NovelCard.astro';
import { novelHaystack } from '../lib/search';

const novels = (await getCollection('novels')).sort((a, b) =>
  a.data.title.localeCompare(b.data.title, 'es'),
);
const chapterTitles: Record<string, string> = {};
for (const c of await getCollection('chapters')) {
  chapterTitles[`${c.data.novelSlug}/${c.data.chapterSlug}`] = c.data.title;
}
const novelTitles = Object.fromEntries(novels.map((n) => [n.data.slug, n.data.title]));
const catalog = { chapterTitles, novelTitles };
---

<BaseLayout title="Mi biblioteca — Draveir">
  <main class="container wide" id="contenido">
    <h1>Mi biblioteca</h1>
    <p class="hint" id="empty-all">Guarda novelas y lee capítulos: aparecerán aquí, solo en este navegador.</p>

    <section id="sec-continue" hidden>
      <div class="sec-head"><h2>Continuar leyendo</h2></div>
      <ul class="stack" id="list-continue"></ul>
    </section>

    <section id="sec-fav" hidden>
      <div class="sec-head"><h2>Favoritos</h2></div>
      <ul class="novel-grid" id="fav-grid">
        {novels.map((n) => (
          <NovelCard slug={n.data.slug} title={n.data.title} synopsis={n.data.synopsis}
            status={n.data.status} categories={n.data.categories} searchText={novelHaystack(n.data)} />
        ))}
      </ul>
    </section>

    <section id="sec-history" hidden>
      <div class="sec-head"><h2>Historial</h2></div>
      <ul class="stack" id="list-history"></ul>
    </section>
  </main>

  <script type="application/json" id="catalog" set:html={JSON.stringify(catalog)}></script>
  <script>
    import { parseState, READER_KEY } from '../lib/reader';

    const catalog = JSON.parse(document.getElementById('catalog')!.textContent!);
    const s = parseState(localStorage.getItem(READER_KEY));

    const link = (href: string, text: string, meta = '') =>
      `<li><a href="${href}">${text}</a>${meta ? `<span class="when">${meta}</span>` : ''}</li>`;

    // Continuar leyendo
    const contEntries = Object.entries(s.continueReading);
    if (contEntries.length) {
      document.getElementById('list-continue')!.innerHTML = contEntries
        .map(([novelSlug, chapterSlug]) => {
          const key = `${novelSlug}/${chapterSlug}`;
          const t = `${catalog.novelTitles[novelSlug] ?? 'Novela'} · ${catalog.chapterTitles[key] ?? 'Capítulo'}`;
          return link(`/novela/${novelSlug}/${chapterSlug}`, t);
        })
        .join('');
      document.getElementById('sec-continue')!.hidden = false;
    }

    // Favoritos: mostrar solo las tarjetas favoritas
    const favSet = new Set(s.favorites);
    let favCount = 0;
    document.querySelectorAll<HTMLElement>('#fav-grid [data-search]').forEach((li) => {
      const a = li.querySelector<HTMLAnchorElement>('a.cover-link');
      const slug = a?.getAttribute('href')?.split('/').pop() ?? '';
      const on = favSet.has(slug);
      li.style.display = on ? '' : 'none';
      if (on) favCount++;
    });
    if (favCount) document.getElementById('sec-fav')!.hidden = false;

    // Historial
    if (s.history.length) {
      document.getElementById('list-history')!.innerHTML = s.history
        .map((h) => link(`/novela/${h.novelSlug}/${h.chapterSlug}`, h.title,
          new Date(h.at).toLocaleDateString('es')))
        .join('');
      document.getElementById('sec-history')!.hidden = false;
    }

    if (contEntries.length || favCount || s.history.length) {
      document.getElementById('empty-all')!.hidden = true;
    }
  </script>
</BaseLayout>

<style>
  .wide { max-width: var(--page); }
  .hint { color: var(--text-muted); font-family: var(--font-sans); }
  .novel-grid { list-style: none; padding: 0; display: grid; gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .stack { list-style: none; padding: 0; font-family: var(--font-sans); }
  .stack li { display: flex; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-3) 0; border-bottom: 1px solid var(--border); }
  .stack .when { color: var(--text-muted); font-size: var(--step--1); white-space: nowrap; }
  section { margin-top: var(--space-6); }
</style>
```

- [ ] **Step 2: Enlace en el header** — en `web/src/components/Header.astro`, tras el enlace `Buscar`:
```astro
      <a href="/biblioteca">Biblioteca</a>
```

- [ ] **Step 3: Sync/build y verificar** — `npm run build && grep -q 'Mi biblioteca' dist/biblioteca/index.html && grep -q '/biblioteca' dist/index.html && echo OK`.
- [ ] **Step 4: Commit** `feat(reader): add "Mi biblioteca" page (favorites, continue, history)`.

---

## Self-Review
- Favoritos ✓ (T2), continuar leyendo ✓ (T3), historial + biblioteca ✓ (T4). Estado en `localStorage`, sin cuentas.
- Lógica pura (reductor) testeada; DOM/persistencia por scripts mínimos validados en build.
- Progresivo: botones/listas ocultos sin JS; el reductor descarta estado corrupto o de otra versión.
- `READER_KEY`/`ReaderState` consistentes entre reductor, FavoriteButton, scripts de capítulo/detalle y biblioteca.
- Fuera de alcance: restaurar posición de scroll dentro del capítulo (nivel capítulo basta); sincronizar entre dispositivos (requeriría cuentas — Slice futuro si se pide).
