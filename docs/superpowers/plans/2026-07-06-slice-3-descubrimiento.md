# Slice 3 — Descubrimiento (buscador + filtros) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Permitir descubrir novelas: un buscador client-side (progresivo, sin JS muestra todo) y páginas de filtro por categoría y etiqueta.

**Architecture:** Lógica pura y testeada en `src/lib/` (slugify, normalización+match de búsqueda, recolección de taxonomías). Las páginas reutilizan `NovelCard`. El buscador renderiza todas las tarjetas con un atributo `data-search` normalizado en build y un `<script>` mínimo que muestra/oculta según el término. Filtros = páginas estáticas generadas de las categorías/etiquetas existentes. Sin librerías de búsqueda.

**Tech Stack:** Astro, Vitest, CSS. Cero JS de framework.

## Global Constraints
- Sin dependencias nuevas. Búsqueda propia (ceiling: si el catálogo crece a cientos, migrar a Pagefind).
- Accesibilidad: input con label, resultados anunciables, foco visible.
- Correr `npm run sync` (o usar contenido en disco) antes de build.

---

### Task 1: `slugify` (pura + TDD)
**Files:** Create `web/src/lib/slug.ts`, `web/src/lib/slug.test.ts`

- [ ] **Step 1: Test `web/src/lib/slug.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('normaliza acentos y espacios', () => {
    expect(slugify('Ciencia ficción')).toBe('ciencia-ficcion');
    expect(slugify('Fantasía')).toBe('fantasia');
    expect(slugify('  Terror  ')).toBe('terror');
  });
});
```
- [ ] **Step 2: Ver fallar** — `npx vitest run src/lib/slug.test.ts`.
- [ ] **Step 3: Implementar `web/src/lib/slug.ts`**
```ts
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
```
- [ ] **Step 4: Ver pasar.** **Commit** `feat(discovery): add slugify helper with tests`.

---

### Task 2: Búsqueda (pura + TDD)
**Files:** Create `web/src/lib/search.ts`, `web/src/lib/search.test.ts`

- [ ] **Step 1: Test `web/src/lib/search.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { normalizeText, novelMatchesQuery } from './search';

const novel = {
  title: 'El Heraldo Gris',
  synopsis: 'Una carta reescribe el destino en la niebla.',
  categories: ['Fantasía', 'Aventura'],
  tags: ['Magia'],
};

describe('normalizeText', () => {
  it('quita acentos y baja a minúsculas', () => {
    expect(normalizeText('Fantasía')).toBe('fantasia');
  });
});

describe('novelMatchesQuery', () => {
  it('query vacía coincide con todo', () => {
    expect(novelMatchesQuery(novel, '   ')).toBe(true);
  });
  it('coincide por título, sinopsis, categoría o etiqueta (sin acentos)', () => {
    expect(novelMatchesQuery(novel, 'heraldo')).toBe(true);
    expect(novelMatchesQuery(novel, 'niebla')).toBe(true);
    expect(novelMatchesQuery(novel, 'fantasia')).toBe(true);
    expect(novelMatchesQuery(novel, 'magia')).toBe(true);
  });
  it('exige todos los términos (AND)', () => {
    expect(novelMatchesQuery(novel, 'heraldo magia')).toBe(true);
    expect(novelMatchesQuery(novel, 'heraldo dragones')).toBe(false);
  });
});
```
- [ ] **Step 2: Ver fallar.**
- [ ] **Step 3: Implementar `web/src/lib/search.ts`**
```ts
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export interface SearchableNovel {
  title: string;
  synopsis: string;
  categories: string[];
  tags: string[];
}

export function novelHaystack(n: SearchableNovel): string {
  return normalizeText([n.title, n.synopsis, ...n.categories, ...n.tags].join(' '));
}

export function novelMatchesQuery(n: SearchableNovel, query: string): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const hay = novelHaystack(n);
  return q.split(/\s+/).every((term) => hay.includes(term));
}
```
- [ ] **Step 4: Ver pasar.** **Commit** `feat(discovery): add pure search matching with tests`.

---

### Task 3: Taxonomías (pura + TDD)
**Files:** Create `web/src/lib/taxonomy.ts`, `web/src/lib/taxonomy.test.ts`

- [ ] **Step 1: Test `web/src/lib/taxonomy.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { collectTaxonomy } from './taxonomy';

const novels = [
  { categories: ['Fantasía', 'Aventura'], tags: ['Magia'] },
  { categories: ['Fantasía', 'Misterio'], tags: ['Magia', 'Academia'] },
];

describe('collectTaxonomy', () => {
  it('agrupa categorías con slug y conteo, ordenadas', () => {
    expect(collectTaxonomy(novels, 'categories')).toEqual([
      { name: 'Aventura', slug: 'aventura', count: 1 },
      { name: 'Fantasía', slug: 'fantasia', count: 2 },
      { name: 'Misterio', slug: 'misterio', count: 1 },
    ]);
  });
  it('funciona con etiquetas', () => {
    expect(collectTaxonomy(novels, 'tags').map((t) => t.slug)).toEqual(['academia', 'magia']);
  });
});
```
- [ ] **Step 2: Ver fallar.**
- [ ] **Step 3: Implementar `web/src/lib/taxonomy.ts`**
```ts
import { slugify } from './slug';

export interface TaxoNovel {
  categories: string[];
  tags: string[];
}

export interface TaxoItem {
  name: string;
  slug: string;
  count: number;
}

export function collectTaxonomy(novels: TaxoNovel[], key: 'categories' | 'tags'): TaxoItem[] {
  const map = new Map<string, TaxoItem>();
  for (const n of novels) {
    for (const name of n[key]) {
      const slug = slugify(name);
      const item = map.get(slug) ?? { name, slug, count: 0 };
      item.count += 1;
      map.set(slug, item);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
```
- [ ] **Step 4: Ver pasar.** **Commit** `feat(discovery): add taxonomy collector with tests`.

---

### Task 4: NovelCard con chips enlazables y `data-search`
**Files:** Modify `web/src/components/NovelCard.astro`

- [ ] **Step 1: Añadir prop `searchText` y enlazar categorías**
Reemplaza el frontmatter y el bloque de meta:
```astro
---
import { coverGradient } from '../lib/covers';
import { slugify } from '../lib/slug';

interface Props {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  categories: string[];
  searchText?: string;
}

const { slug, title, synopsis, status, categories, searchText } = Astro.props;
const gradient = coverGradient(categories);
---

<li class="novel-card" data-search={searchText}>
  <a href={`/novela/${slug}`}>
    <span class="cover" style={`background:${gradient}`} aria-hidden="true">
      {title.charAt(0)}
    </span>
    <h2>{title}</h2>
    <p class="synopsis">{synopsis}</p>
  </a>
  <div class="meta">
    {status && <span class="status">{status}</span>}
    {categories.slice(0, 2).map((c) => (
      <a class="tag" href={`/categoria/${slugify(c)}`}>{c}</a>
    ))}
  </div>
</li>
```
(El `.meta` sale fuera del `<a>` principal para que los chips sean enlaces independientes.)

- [ ] **Step 2: `npm run check`** → 0 errores. **Commit** `feat(discovery): make novel card categories linkable and searchable`.

---

### Task 5: Página de búsqueda `/buscar`
**Files:** Create `web/src/pages/buscar.astro`

- [ ] **Step 1: Crear `web/src/pages/buscar.astro`**
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import NovelCard from '../components/NovelCard.astro';
import { novelHaystack } from '../lib/search';

const novels = (await getCollection('novels')).sort((a, b) =>
  a.data.title.localeCompare(b.data.title, 'es'),
);
---

<BaseLayout title="Buscar — Draveir">
  <main class="container wide" id="contenido">
    <h1>Buscar</h1>
    <input
      id="search-input"
      type="search"
      placeholder="Título, sinopsis, categoría o etiqueta…"
      aria-label="Buscar novelas"
      autocomplete="off"
    />
    <p id="search-empty" class="search-empty" hidden>Sin resultados.</p>
    <ul class="novel-grid" id="search-results">
      {novels.map((n) => (
        <NovelCard
          slug={n.data.slug}
          title={n.data.title}
          synopsis={n.data.synopsis}
          status={n.data.status}
          categories={n.data.categories}
          searchText={novelHaystack(n.data)}
        />
      ))}
    </ul>
  </main>
</BaseLayout>

<style>
  .wide { max-width: 72rem; }
  #search-input {
    width: 100%;
    padding: var(--space-3);
    margin-bottom: var(--space-5);
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: var(--step-0);
  }
  .search-empty { color: var(--text-muted); font-family: var(--font-sans); }
  .novel-grid {
    list-style: none; padding: 0; display: grid; gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  }
</style>

<script>
  import { normalizeText } from '../lib/search';

  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('#search-results [data-search]'));
  const empty = document.getElementById('search-empty');

  input?.addEventListener('input', () => {
    const terms = normalizeText(input.value).trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const hay = card.dataset.search ?? '';
      const match = terms.every((t) => hay.includes(t));
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
  });
</script>
```

- [ ] **Step 2: Build y verificar** — `npm run build && grep -q 'search-input' dist/buscar/index.html && echo OK`.
- [ ] **Step 3: Commit** `feat(discovery): add client-side search page`.

---

### Task 6: Páginas de filtro por categoría y etiqueta
**Files:** Create `web/src/pages/categoria/[slug].astro`, `web/src/pages/etiqueta/[slug].astro`

- [ ] **Step 1: Crear `web/src/pages/categoria/[slug].astro`**
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import NovelCard from '../../components/NovelCard.astro';
import { collectTaxonomy } from '../../lib/taxonomy';
import { slugify } from '../../lib/slug';

export async function getStaticPaths() {
  const novels = await getCollection('novels');
  const cats = collectTaxonomy(novels.map((n) => n.data), 'categories');
  return cats.map((c) => ({ params: { slug: c.slug }, props: { name: c.name } }));
}

interface Props { name: string; }
const { name } = Astro.props;
const { slug } = Astro.params;

const novels = (await getCollection('novels'))
  .filter((n) => n.data.categories.some((c) => slugify(c) === slug))
  .sort((a, b) => a.data.title.localeCompare(b.data.title, 'es'));
---

<BaseLayout title={`${name} — Draveir`}>
  <main class="container wide" id="contenido">
    <a href="/novelas">← Novelas</a>
    <h1>Categoría: {name}</h1>
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
    list-style: none; padding: 0; display: grid; gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  }
</style>
```

- [ ] **Step 2: Crear `web/src/pages/etiqueta/[slug].astro`** — idéntica pero con `'tags'` y `n.data.tags`:
```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import NovelCard from '../../components/NovelCard.astro';
import { collectTaxonomy } from '../../lib/taxonomy';
import { slugify } from '../../lib/slug';

export async function getStaticPaths() {
  const novels = await getCollection('novels');
  const tags = collectTaxonomy(novels.map((n) => n.data), 'tags');
  return tags.map((t) => ({ params: { slug: t.slug }, props: { name: t.name } }));
}

interface Props { name: string; }
const { name } = Astro.props;
const { slug } = Astro.params;

const novels = (await getCollection('novels'))
  .filter((n) => n.data.tags.some((t) => slugify(t) === slug))
  .sort((a, b) => a.data.title.localeCompare(b.data.title, 'es'));
---

<BaseLayout title={`#${name} — Draveir`}>
  <main class="container wide" id="contenido">
    <a href="/novelas">← Novelas</a>
    <h1>Etiqueta: {name}</h1>
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
    list-style: none; padding: 0; display: grid; gap: var(--space-5);
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  }
</style>
```

- [ ] **Step 3: Build y verificar** — `npm run build && grep -rq 'Categoría:' dist/categoria/ && echo OK`.
- [ ] **Step 4: Commit** `feat(discovery): add category and tag filter pages`.

---

### Task 7: Enlace "Buscar" en el header
**Files:** Modify `web/src/components/Header.astro`

- [ ] **Step 1: Añadir enlace antes del toggle**
En `.site-nav`, antes del `<button id="theme-toggle">`:
```astro
      <a href="/buscar">Buscar</a>
```
- [ ] **Step 2: Build y verificar** — `npm run build && grep -q '/buscar' dist/index.html && echo OK`.
- [ ] **Step 3: Commit** `feat(discovery): add search link in header`.

---

## Self-Review
- Buscador ✓ (Task 5), filtros categoría ✓ + etiqueta ✓ (Task 6), acceso desde header + chips ✓ (Tasks 4, 7).
- Lógica pura (slugify, match, taxonomía) testeada; páginas validadas por build+grep.
- `slugify` compartido entre taxonomía, NovelCard y páginas de filtro → slugs consistentes en URLs y filtrado.
- Progresivo: sin JS, `/buscar` muestra todas las novelas; el filtro es realce.
- Sin dependencias nuevas.
