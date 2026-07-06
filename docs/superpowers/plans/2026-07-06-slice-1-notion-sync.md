# Slice 1 — Sync desde Notion + render de contenido · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un script de sincronización lee las novelas publicadas y sus capítulos publicados desde Notion vía API oficial, los escribe como content collections de Astro, y el sitio renderiza el listado de novelas, el detalle de cada novela y la lectura de capítulos.

**Architecture:** El script `scripts/notion-sync` (TypeScript, ejecutado con `tsx`) separa IO puro (llamadas a Notion) de transformación pura (mapear la respuesta de Notion a nuestro modelo tipado, que es lo que se prueba con fixtures). Escribe archivos en `web/src/content/{novels,chapters}/` (generados, ignorados por git). Astro los consume vía content collections tipadas con Zod y genera páginas estáticas. El contenido se sincroniza en tiempo de build (Cloudflare corre `npm run sync && npm run build`), no se commitea.

**Tech Stack:** TypeScript, `@notionhq/client`, `notion-to-md`, `tsx`, Vitest, Astro content collections.

## Global Constraints

- **Idioma:** contenido de cara al lector en español; sin i18n.
- **Alcance de este slice:** solo novelas con `Publicada = true` y capítulos con `Estado = "Publicado"`. Los capítulos `Programado`/`Borrador` se **excluyen** del build (el bloqueo por fecha + cuenta regresiva es Slice 5). Imágenes (portadas/ilustraciones) se difieren a Slice 2 — aquí las portadas usan un placeholder CSS.
- **Automatización de rebuild programado:** fuera de alcance (Slice 1.5). Aquí un redeploy es manual o por push.
- **Node:** 20 LTS (CI/Cloudflare). Local puede ser mayor.
- **Secreto:** `NOTION_TOKEN` (ya guardado en GitHub Actions y a configurar en Cloudflare Pages env). En local, `web/.env` (ignorado).
- **IDs de bases (no secretos):** Novelas `c03f5b38-513f-4c0f-8f91-1b69cad31673`, Capítulos `4ac20247-41d9-46b7-b9ca-cae507c3eaf2`.
- **Versión de API de Notion:** fijar `notionVersion: '2022-06-28'` (las bases son de fuente única; `databases.query({ database_id })` funciona).
- **Tipado fuerte, funciones puras testeadas, IO fino sin tests de red.**

---

### Task 1: Tooling de sync — dependencias, scripts y carga de entorno

**Files:**
- Modify: `web/package.json` (añadir deps y scripts)
- Create: `web/vitest.config.ts`
- Create: `web/.env.example`
- Modify: `.gitignore` (raíz del repo: ignorar contenido generado y `.env`)

**Interfaces:**
- Produces: scripts `npm run sync`, `npm run test`; deps `@notionhq/client`, `notion-to-md`, `tsx`, `vitest` instaladas; variable `NOTION_TOKEN` disponible vía `process.env` en scripts.

- [ ] **Step 1: Añadir deps y scripts en `web/package.json`**

Reemplaza los bloques `scripts`, `dependencies` y `devDependencies` por:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "sync": "tsx scripts/notion-sync/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^4.15.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@notionhq/client": "^2.2.15",
    "notion-to-md": "^3.1.1",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
```

- [ ] **Step 2: Crear `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Crear `web/.env.example`**

```
# Copia a .env y pega tu token de integración de Notion (Read content).
NOTION_TOKEN=ntn_xxx
```

- [ ] **Step 4: Actualizar `.gitignore` (raíz del repo)**

Añade estas líneas al `.gitignore` existente:

```
# Contenido generado por el sync (build-time)
web/src/content/novels/
web/src/content/chapters/
web/.env
```

- [ ] **Step 5: Instalar dependencias**

Run desde `web/`:
```bash
cd web && npm install
```
Expected: instala sin errores; `web/package-lock.json` se actualiza.

- [ ] **Step 6: Verificar que vitest corre (sin tests aún)**

Run desde `web/`:
```bash
npx vitest run
```
Expected: termina sin error indicando "No test files found" (o 0 tests). Es válido en este paso.

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.ts web/.env.example .gitignore
git commit -m "chore(sync): add notion sync tooling and deps"
```

---

### Task 2: Modelo de datos y transformación pura (TDD)

**Files:**
- Create: `web/scripts/notion-sync/types.ts`
- Create: `web/scripts/notion-sync/transform.ts`
- Create: `web/scripts/notion-sync/transform.test.ts`

**Interfaces:**
- Produces:
  - `interface NovelData { slug, title, synopsis, status, categories, tags, featured }`
  - `interface ChapterMeta { novelSlug, number, title, slug, publishedAt }`
  - `chapterSlug(n: number): string` → `"capitulo-<n>"`
  - `parseNovel(page: NotionPage): NovelData`
  - `parseChapterMeta(page: NotionPage, novelSlugById: Map<string,string>): ChapterMeta | null` (null si la relación apunta a una novela ausente/no publicada)
- Consumes: nada (funciones puras sobre objetos plano tipo respuesta de Notion).

- [ ] **Step 1: Crear `web/scripts/notion-sync/types.ts`**

```ts
// Forma mínima de las propiedades de Notion que consumimos.
// No dependemos del SDK aquí para poder testear con fixtures simples.
export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export interface NovelData {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  categories: string[];
  tags: string[];
  featured: boolean;
}

export interface ChapterMeta {
  novelSlug: string;
  number: number;
  title: string;
  slug: string;
  publishedAt: string; // ISO 8601
}

export interface ChapterData extends ChapterMeta {
  bodyMarkdown: string;
}
```

- [ ] **Step 2: Escribir el test que falla — `web/scripts/notion-sync/transform.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseNovel, parseChapterMeta, chapterSlug } from './transform';
import type { NotionPage } from './types';

const novelPage: NotionPage = {
  id: 'novel-1',
  properties: {
    'Título': { title: [{ plain_text: 'El Heraldo Gris' }] },
    'Slug': { rich_text: [{ plain_text: 'el-heraldo-gris' }] },
    'Sinopsis': { rich_text: [{ plain_text: 'Una carta reescribe el destino.' }] },
    'Estado': { select: { name: 'En progreso' } },
    'Categorías': { multi_select: [{ name: 'Fantasía' }, { name: 'Aventura' }] },
    'Etiquetas': { multi_select: [{ name: 'Magia' }] },
    'Destacada': { checkbox: true },
    'Publicada': { checkbox: true },
  },
};

const chapterPage: NotionPage = {
  id: 'chapter-1',
  properties: {
    'Título': { title: [{ plain_text: 'Capítulo 1: La carta' }] },
    'Novela': { relation: [{ id: 'novel-1' }] },
    'Número': { number: 1 },
    'Estado': { select: { name: 'Publicado' } },
    'Fecha de publicación': { date: { start: '2026-06-01T09:00:00.000-05:00' } },
  },
};

describe('chapterSlug', () => {
  it('formatea el número como slug', () => {
    expect(chapterSlug(3)).toBe('capitulo-3');
  });
});

describe('parseNovel', () => {
  it('mapea todas las propiedades de una novela', () => {
    expect(parseNovel(novelPage)).toEqual({
      slug: 'el-heraldo-gris',
      title: 'El Heraldo Gris',
      synopsis: 'Una carta reescribe el destino.',
      status: 'En progreso',
      categories: ['Fantasía', 'Aventura'],
      tags: ['Magia'],
      featured: true,
    });
  });

  it('usa un slug derivado del título si falta Slug', () => {
    const noSlug: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Slug': { rich_text: [] } },
    };
    expect(parseNovel(noSlug).slug).toBe('el-heraldo-gris');
  });
});

describe('parseChapterMeta', () => {
  const map = new Map([['novel-1', 'el-heraldo-gris']]);

  it('mapea un capítulo y resuelve el slug de su novela', () => {
    expect(parseChapterMeta(chapterPage, map)).toEqual({
      novelSlug: 'el-heraldo-gris',
      number: 1,
      title: 'Capítulo 1: La carta',
      slug: 'capitulo-1',
      publishedAt: '2026-06-01T09:00:00.000-05:00',
    });
  });

  it('devuelve null si la novela relacionada no está en el mapa', () => {
    expect(parseChapterMeta(chapterPage, new Map())).toBeNull();
  });
});
```

- [ ] **Step 3: Ejecutar el test para verlo fallar**

Run desde `web/`:
```bash
npx vitest run scripts/notion-sync/transform.test.ts
```
Expected: FAIL — `transform.ts` no existe / funciones no definidas.

- [ ] **Step 4: Implementar `web/scripts/notion-sync/transform.ts`**

```ts
import type { NotionPage, NovelData, ChapterMeta } from './types';

const plainText = (prop: any): string =>
  (prop?.title ?? prop?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const chapterSlug = (n: number): string => `capitulo-${n}`;

export function parseNovel(page: NotionPage): NovelData {
  const p = page.properties;
  const title = plainText(p['Título']);
  const rawSlug = plainText(p['Slug']);
  return {
    slug: rawSlug || slugify(title),
    title,
    synopsis: plainText(p['Sinopsis']),
    status: p['Estado']?.select?.name ?? null,
    categories: (p['Categorías']?.multi_select ?? []).map((o: any) => o.name),
    tags: (p['Etiquetas']?.multi_select ?? []).map((o: any) => o.name),
    featured: Boolean(p['Destacada']?.checkbox),
  };
}

export function parseChapterMeta(
  page: NotionPage,
  novelSlugById: Map<string, string>,
): ChapterMeta | null {
  const p = page.properties;
  const novelId = p['Novela']?.relation?.[0]?.id;
  const novelSlug = novelId ? novelSlugById.get(novelId) : undefined;
  if (!novelSlug) return null;

  const number = p['Número']?.number ?? 0;
  return {
    novelSlug,
    number,
    title: plainText(p['Título']),
    slug: chapterSlug(number),
    publishedAt: p['Fecha de publicación']?.date?.start ?? '',
  };
}
```

- [ ] **Step 5: Ejecutar el test para verlo pasar**

Run desde `web/`:
```bash
npx vitest run scripts/notion-sync/transform.test.ts
```
Expected: PASS (todos los casos).

- [ ] **Step 6: Commit**

```bash
git add web/scripts/notion-sync/types.ts web/scripts/notion-sync/transform.ts web/scripts/notion-sync/transform.test.ts
git commit -m "feat(sync): add typed model and pure Notion transforms with tests"
```

---

### Task 3: Capa de IO con Notion

**Files:**
- Create: `web/scripts/notion-sync/notion.ts`

**Interfaces:**
- Consumes: `NOTION_TOKEN` (env), IDs de bases (constantes), `parseNovel`/`parseChapterMeta` (Task 2), `NotionPage`/`NovelData`/`ChapterData` (Task 2).
- Produces:
  - `fetchPublishedNovels(): Promise<NovelData[]>`
  - `fetchPublishedChapters(novelSlugById: Map<string,string>): Promise<ChapterData[]>` (incluye `bodyMarkdown` vía notion-to-md)

- [ ] **Step 1: Implementar `web/scripts/notion-sync/notion.ts`**

```ts
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import type { NotionPage, NovelData, ChapterData } from './types';
import { parseNovel, parseChapterMeta } from './transform';

const NOVELS_DB = 'c03f5b38-513f-4c0f-8f91-1b69cad31673';
const CHAPTERS_DB = '4ac20247-41d9-46b7-b9ca-cae507c3eaf2';

const token = process.env.NOTION_TOKEN;
if (!token) throw new Error('Falta NOTION_TOKEN en el entorno.');

const notion = new Client({ auth: token, notionVersion: '2022-06-28' });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function queryAll(database_id: string, filter?: any): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...(res.results as unknown as NotionPage[]));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

export async function fetchPublishedNovels(): Promise<NovelData[]> {
  const pages = await queryAll(NOVELS_DB, {
    property: 'Publicada',
    checkbox: { equals: true },
  });
  return pages.map(parseNovel);
}

export async function fetchPublishedChapters(
  novelSlugById: Map<string, string>,
): Promise<ChapterData[]> {
  const pages = await queryAll(CHAPTERS_DB, {
    property: 'Estado',
    select: { equals: 'Publicado' },
  });

  const chapters: ChapterData[] = [];
  for (const page of pages) {
    const meta = parseChapterMeta(page, novelSlugById);
    if (!meta) continue; // capítulo de una novela no publicada → se omite
    const blocks = await n2m.pageToMarkdown(page.id);
    const bodyMarkdown = n2m.toMarkdownString(blocks).parent ?? '';
    chapters.push({ ...meta, bodyMarkdown });
  }
  return chapters;
}
```

- [ ] **Step 2: Verificación de tipos (no hay test de red — es IO fino)**

Run desde `web/`:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: 0 errores de tipos en `notion.ts`. (La correctitud funcional se valida de extremo a extremo en Task 4 Step 4 contra tu Notion real.)

- [ ] **Step 3: Commit**

```bash
git add web/scripts/notion-sync/notion.ts
git commit -m "feat(sync): add Notion IO layer for novels and chapters"
```

---

### Task 4: Escritor de content collections + orquestador

**Files:**
- Create: `web/scripts/notion-sync/writeContent.ts`
- Create: `web/scripts/notion-sync/index.ts`

**Interfaces:**
- Consumes: `NovelData`, `ChapterData` (Task 2); `fetchPublishedNovels`, `fetchPublishedChapters` (Task 3).
- Produces: al ejecutar `npm run sync`, escribe `web/src/content/novels/<slug>.json` y `web/src/content/chapters/<novelSlug>--<chapterSlug>.md` (frontmatter + cuerpo). Limpia esos directorios antes de escribir.

- [ ] **Step 1: Implementar `web/scripts/notion-sync/writeContent.ts`**

```ts
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NovelData, ChapterData } from './types';

const CONTENT = join(process.cwd(), 'src', 'content');
const NOVELS_DIR = join(CONTENT, 'novels');
const CHAPTERS_DIR = join(CONTENT, 'chapters');

function frontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export async function writeContent(novels: NovelData[], chapters: ChapterData[]): Promise<void> {
  await rm(NOVELS_DIR, { recursive: true, force: true });
  await rm(CHAPTERS_DIR, { recursive: true, force: true });
  await mkdir(NOVELS_DIR, { recursive: true });
  await mkdir(CHAPTERS_DIR, { recursive: true });

  for (const n of novels) {
    await writeFile(join(NOVELS_DIR, `${n.slug}.json`), JSON.stringify(n, null, 2));
  }

  for (const c of chapters) {
    const fm = frontmatter({
      novelSlug: c.novelSlug,
      number: c.number,
      title: c.title,
      slug: c.slug,
      publishedAt: c.publishedAt,
    });
    const file = join(CHAPTERS_DIR, `${c.novelSlug}--${c.slug}.md`);
    await writeFile(file, `${fm}\n${c.bodyMarkdown}\n`);
  }
}
```

- [ ] **Step 2: Implementar `web/scripts/notion-sync/index.ts`**

```ts
import { fetchPublishedNovels, fetchPublishedChapters } from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const novels = await fetchPublishedNovels();
  const novelSlugById = new Map<string, string>();
  // Reconstruimos el id→slug: fetchPublishedNovels no expone ids, así que
  // los capítulos se resuelven por relación usando el id de página de Notion.
  // Para el mapa necesitamos ids; los obtenemos re-consultando en notion.ts.
  // (Ver nota de diseño abajo — el mapa se construye dentro de fetch.)
  const chapters = await fetchPublishedChapters(novelSlugById);
  await writeContent(novels, chapters);
  console.log(`Sync OK: ${novels.length} novelas, ${chapters.length} capítulos.`);
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
```

> **Nota de diseño (resolver en implementación):** `parseChapterMeta` necesita un `Map<pageId, slug>` de novelas, pero `fetchPublishedNovels` devuelve `NovelData` sin el id de página. Ajuste mínimo: en `notion.ts`, cambiar `fetchPublishedNovels` para devolver también los ids, o exponer una función `fetchNovelSlugMap(): Promise<Map<string,string>>` que consulte las novelas publicadas y devuelva `id → slug`. Implementar **`fetchNovelSlugMap`** y usarla en `index.ts` para construir el mapa antes de `fetchPublishedChapters`. Actualizar `index.ts`:

```ts
import { fetchPublishedNovels, fetchNovelSlugMap, fetchPublishedChapters } from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const [novels, novelSlugById] = await Promise.all([
    fetchPublishedNovels(),
    fetchNovelSlugMap(),
  ]);
  const chapters = await fetchPublishedChapters(novelSlugById);
  await writeContent(novels, chapters);
  console.log(`Sync OK: ${novels.length} novelas, ${chapters.length} capítulos.`);
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
```

Y añadir en `notion.ts`:

```ts
export async function fetchNovelSlugMap(): Promise<Map<string, string>> {
  const pages = await queryAll(NOVELS_DB, {
    property: 'Publicada',
    checkbox: { equals: true },
  });
  const map = new Map<string, string>();
  for (const page of pages) map.set(page.id, parseNovel(page).slug);
  return map;
}
```

- [ ] **Step 3: Crear `web/.env` con el token (local, no se commitea)**

Crea `web/.env` (el autor pega su token; ya está en `.gitignore`):
```
NOTION_TOKEN=<tu-token-ntn_...>
```
Si estás ejecutando como agente sin el token, PARA aquí y pide al autor que corra los pasos 4–5 en su máquina.

- [ ] **Step 4: Ejecutar el sync real contra Notion**

Run desde `web/`:
```bash
npm run sync
```
Expected: `Sync OK: 1 novelas, 1 capítulos.` y aparecen:
- `web/src/content/novels/el-heraldo-gris.json`
- `web/src/content/chapters/el-heraldo-gris--capitulo-1.md`
(El Cap. 2 está `Programado` → correctamente omitido.)

- [ ] **Step 5: Commit**

```bash
git add web/scripts/notion-sync/writeContent.ts web/scripts/notion-sync/index.ts
git commit -m "feat(sync): write Notion content into Astro collections"
```

---

### Task 5: Content collections + páginas de Astro

**Files:**
- Create: `web/src/content/config.ts`
- Create: `web/src/pages/novelas/index.astro`
- Create: `web/src/pages/novela/[slug].astro`
- Create: `web/src/pages/novela/[slug]/[capitulo].astro`
- Modify: `web/src/pages/index.astro` (enlazar al catálogo)
- Modify: `web/src/styles/global.css` (estilos base de tarjetas y lectura)

**Interfaces:**
- Consumes: archivos generados por el sync (Task 4). Requiere haber corrido `npm run sync` antes de `build`/`dev`.
- Produces: rutas `/novelas`, `/novela/<slug>`, `/novela/<slug>/<capitulo>`.

- [ ] **Step 1: Crear `web/src/content/config.ts`**

```ts
import { defineCollection, reference, z } from 'astro:content';

const novels = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    synopsis: z.string(),
    status: z.string().nullable(),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    featured: z.boolean(),
  }),
});

const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    novelSlug: z.string(),
    number: z.number(),
    title: z.string(),
    slug: z.string(),
    publishedAt: z.string(),
  }),
});

export const collections = { novels, chapters };
```

- [ ] **Step 2: Crear `web/src/pages/novelas/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const novels = (await getCollection('novels')).sort((a, b) =>
  a.data.title.localeCompare(b.data.title, 'es'),
);
---

<BaseLayout title="Novelas — Draveir">
  <main class="container">
    <h1>Novelas</h1>
    <ul class="novel-grid">
      {novels.map((n) => (
        <li class="novel-card">
          <a href={`/novela/${n.data.slug}`}>
            <span class="cover" aria-hidden="true">{n.data.title.charAt(0)}</span>
            <h2>{n.data.title}</h2>
            <p>{n.data.synopsis}</p>
            <span class="status">{n.data.status}</span>
          </a>
        </li>
      ))}
    </ul>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Crear `web/src/pages/novela/[slug].astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

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
---

<BaseLayout title={`${novel.data.title} — Draveir`}>
  <main class="container">
    <a href="/novelas">← Novelas</a>
    <h1>{novel.data.title}</h1>
    <p>{novel.data.synopsis}</p>
    <div class="tags">
      {novel.data.categories.map((c) => <span class="tag">{c}</span>)}
    </div>
    <h2>Capítulos</h2>
    <ol class="chapter-list">
      {chapters.map((c) => (
        <li>
          <a href={`/novela/${slug}/${c.data.slug}`}>{c.data.title}</a>
        </li>
      ))}
    </ol>
  </main>
</BaseLayout>
```

- [ ] **Step 4: Crear `web/src/pages/novela/[slug]/[capitulo].astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const chapters = await getCollection('chapters');
  return chapters.map((c) => ({
    params: { slug: c.data.novelSlug, capitulo: c.data.slug },
    props: { id: c.id },
  }));
}

const { id } = Astro.props;
const { slug } = Astro.params;
const chapter = await getEntry('chapters', id);
if (!chapter) return Astro.redirect(`/novela/${slug}`);
const { Content } = await chapter.render();

const siblings = (await getCollection('chapters'))
  .filter((c) => c.data.novelSlug === slug)
  .sort((a, b) => a.data.number - b.data.number);
const idx = siblings.findIndex((c) => c.id === id);
const prev = siblings[idx - 1];
const next = siblings[idx + 1];
---

<BaseLayout title={`${chapter.data.title} — Draveir`}>
  <main class="container reading">
    <a href={`/novela/${slug}`}>← Índice</a>
    <h1>{chapter.data.title}</h1>
    <article><Content /></article>
    <nav class="chapter-nav">
      {prev && <a href={`/novela/${slug}/${prev.data.slug}`}>← Anterior</a>}
      {next && <a href={`/novela/${slug}/${next.data.slug}`}>Siguiente →</a>}
    </nav>
  </main>
</BaseLayout>
```

- [ ] **Step 5: Enlazar el catálogo desde `web/src/pages/index.astro`**

Reemplaza el `<main>` por:

```astro
  <main class="container">
    <h1>Draveir</h1>
    <p>Una plataforma de lectura en construcción. Pronto, historias que valdrá la pena esperar.</p>
    <p><a href="/novelas">Ver novelas →</a></p>
  </main>
```

- [ ] **Step 6: Añadir estilos base en `web/src/styles/global.css`**

Añade al final del archivo:

```css
a { color: inherit; }

.novel-grid {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.novel-card a {
  display: block;
  text-decoration: none;
}

.novel-card .cover {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  font-size: 3rem;
  font-weight: bold;
  background: linear-gradient(135deg, #6b7280, #374151);
  color: #fff;
  margin-bottom: 0.75rem;
}

.tag, .status {
  display: inline-block;
  font-size: 0.8rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.2);
  margin-right: 0.4rem;
}

.chapter-list a { line-height: 2; }

.reading article {
  font-size: 1.125rem;
}

.chapter-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(127, 127, 127, 0.3);
}
```

- [ ] **Step 7: Sync, check y build de extremo a extremo**

Run desde `web/`:
```bash
npm run sync && npm run check && npm run build
```
Expected: sync escribe el contenido; `astro check` 0 errores; build genera `/novelas/index.html`, `/novela/el-heraldo-gris/index.html` y `/novela/el-heraldo-gris/capitulo-1/index.html`.

- [ ] **Step 8: Verificar el HTML generado**

Run desde `web/`:
```bash
grep -l "El Heraldo Gris" dist/novela/el-heraldo-gris/index.html && grep -q "carta sin remitente" dist/novela/el-heraldo-gris/capitulo-1/index.html && echo "OK render"
```
Expected: `OK render`.

- [ ] **Step 9: Commit**

```bash
git add web/src/content/config.ts web/src/pages web/src/styles/global.css
git commit -m "feat(web): render novels catalog, detail and chapter reading"
```

---

### Task 6: Integrar el sync en CI y en el build de Cloudflare

**Files:**
- Modify: `.github/workflows/ci.yml` (correr sync + tests en el CI de PR; requiere `NOTION_TOKEN` secreto)

**Interfaces:**
- Consumes: script `sync`, `test`, `check`, `build` (tareas previas); secreto `NOTION_TOKEN` en Actions.
- Produces: CI que valida tipos, tests y build con contenido real; documentación del cambio de build command en Cloudflare.

- [ ] **Step 1: Actualizar `.github/workflows/ci.yml`**

Reemplaza los `run` steps del job `build` por:

```yaml
      - run: npm ci
      - run: npm run test
      - run: npm run check
      - run: npm run sync
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
      - run: npm run build
```

- [ ] **Step 2: Verificar sintaxis del workflow**

Run desde la raíz del repo:
```bash
cat .github/workflows/ci.yml
```
Expected: el job `build` corre `test`, `check`, `sync` (con env `NOTION_TOKEN`) y `build` en ese orden.

- [ ] **Step 3: (Autor) Configurar el build de Cloudflare Pages**

En Cloudflare Pages → proyecto `draveir` → Settings → Builds & deployments:
- **Build command:** `npm run sync && npm run build`
- **Environment variables:** añadir `NOTION_TOKEN` con el mismo valor del secreto.
(Root directory `web` ya está configurado del Slice 0.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run sync and tests before build"
```

---

## Self-Review

**Cobertura del spec (Slice 1 = §12 rebanada 1):**
- Sync Notion API oficial ✓ (Task 3).
- Solo lectura publicada ✓ (filtros `Publicada`/`Publicado`, Task 3; Cap. `Programado` omitido).
- Listado + detalle + lectura ✓ (Task 5).
- Transformación tipada y testeada ✓ (Task 2).
- Integración CI ✓ (Task 6).
- Fuera de alcance declarado: imágenes/portadas (Slice 2), buscador/categorías-filtro (Slice 3), estado local (Slice 4), gating/countdown (Slice 5), rebuild programado (Slice 1.5). Coherente con el roadmap.

**Placeholders:** ninguno. La única "nota de diseño" (Task 4) incluye el código completo del ajuste (`fetchNovelSlugMap`), no es un TODO abierto.

**Consistencia de tipos:** `NovelData`/`ChapterMeta`/`ChapterData` definidos en Task 2 y usados igual en Tasks 3–5. `chapterSlug(n) → "capitulo-<n>"` consistente entre transform, escritura de archivos (`<novelSlug>--<slug>.md`) y rutas de Astro. El esquema Zod de `chapters` (Task 5) coincide con el frontmatter escrito (Task 4): `novelSlug, number, title, slug, publishedAt`. El de `novels` coincide con `NovelData`.

**Nota de pruebas (ponytail):** la lógica no trivial (mapeo Notion→modelo) está cubierta por tests puros con fixtures (Task 2). El IO de red (Task 3) y el render (Task 5) se validan de extremo a extremo contra tu Notion real (Task 4 Step 4, Task 5 Step 8) — no se mockea la red, que sería test de andamiaje sin valor.
