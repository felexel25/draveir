# Calendario de publicaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página `/calendario` que muestra todas las historias agrupadas en fases, en el orden que el autor decide, con su fecha o su ventana de lanzamiento, incluidas las que aún no tienen ningún capítulo.

**Architecture:** Una BD `Fases` nueva en Notion, gemela de la de Sagas que ya existe, y dos campos más en Novelas (`Fase`, `Orden en fase`, `Ventana de lanzamiento`). El sync reutiliza literalmente la fontanería de sagas. La página es Astro estático sin JavaScript. El cambio de fondo: `Publicada` en Notion pasa a significar *visible en la web*, y «¿se puede leer?» se deduce de tener o no capítulos publicados.

**Tech Stack:** Astro 4 (estático), TypeScript, Vitest, sync propio contra la API de Notion (`scripts/notion-sync`).

Spec: `docs/superpowers/specs/2026-07-16-formato-y-calendario-design.md` (Parte 2).

## Global Constraints

- Todos los comandos se ejecutan desde `web/`, no desde la raíz del repo.
- Tests: `npm test` (Vitest). Un archivo `*.test.ts` junto al código que prueba.
- Trabajo en la rama `feat/calendario`. Nunca commitear a `main`.
- La `Ventana de lanzamiento` es TEXTO LIBRE y se muestra tal cual. Nunca se parsea ni se ordena por ella.
- El orden dentro de una fase lo manda `Orden en fase`, no la fecha.
- Una fase sin historias no genera sección. Misma regla que las sagas.
- Fecha de una historia publicada: la de su capítulo 1, formateada `enero de 2026`, zona `America/Panama`.
- `/calendario` es indexable: sin `noindex`, al revés que `/buscar` y `/biblioteca`.
- Cero JavaScript en la página. Nada de lo que hace lo necesita.
- Textos de interfaz en español, con tildes.
- No añadir dependencias.

## Prerrequisitos (los hace Félix, no el implementador)

1. Crear en Notion la BD **`Fases`** con las mismas propiedades que la de Sagas:
   `Nombre` (title), `Slug` (text), `Descripción` (text), `Orden` (number).
2. En la BD de **Novelas**, crear: relación `Fase` (apunta a `Fases`), número
   `Orden en fase`, y texto `Ventana de lanzamiento`.
3. **Pasarle al implementador el ID de la BD `Fases`.** Se saca de la URL de la
   base en Notion: `notion.so/<workspace>/<ESTE_ES_EL_ID>?v=…`, y se escribe con
   guiones (formato UUID), como los tres IDs que ya hay en
   `scripts/notion-sync/notion.ts:7-9`. La Task 2 está bloqueada sin este dato:
   **no lo inventes, pídelo.**

## File Structure

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/saga.ts` | Generalizar `SagaNovel.sagaOrder` → `OrderedNovel.order` para que el mismo orden sirva a sagas y fases. |
| `src/lib/calendar.ts` (nuevo) | Lógica pura: la fecha que se muestra de cada historia. |
| `src/lib/calendar.test.ts` (nuevo) | Tests de lo anterior. |
| `src/lib/novels.ts` (nuevo) | `getReadableNovels()`: el único sitio que define qué novela es legible. |
| `scripts/notion-sync/types.ts` | `PhaseData`; `phase`, `phaseOrder`, `releaseWindow` en `NovelData`. |
| `scripts/notion-sync/transform.ts` | `parsePhase` y los campos nuevos en `parseNovel`. |
| `scripts/notion-sync/notion.ts` | `PHASES_DB`, `fetchPhases`, `fetchPhaseSlugMap`. |
| `scripts/notion-sync/index.ts` | Orquestar las fases. |
| `scripts/notion-sync/writeContent.ts` | Escribir `src/content/phases/*.json`. |
| `src/content/config.ts` | Colección `phases` y campos nuevos en `novels`. |
| `src/pages/calendario.astro` (nuevo) | La página. |
| `src/components/Header.astro` | Enlace en la navegación. |
| `src/pages/index.astro`, `novelas/index.astro`, `biblioteca.astro`, `buscar.astro`, `categoria/[slug].astro`, `etiqueta/[slug].astro`, `saga/[slug].astro`, `novela/[slug].astro` | Usar `getReadableNovels()` en vez de `getCollection('novels')`. |

---

### Task 1: Un solo criterio de orden para sagas y fases

Refactor previo. `readingOrder` ya hace exactamente lo que el calendario
necesita (ordenar por un número, los nulos al final, desempate alfabético). Lo
único que estorba es que su campo se llama `sagaOrder`. Se generaliza a `order`
en vez de duplicar la función.

**Files:**
- Modify: `web/src/lib/saga.ts`
- Modify: `web/src/lib/saga.test.ts`
- Modify: `web/src/pages/saga/[slug].astro:26-28`
- Modify: `web/src/pages/novela/[slug].astro:52-61`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface OrderedNovel { slug: string; title: string; order: number | null }`
  - `readingOrder(novels: OrderedNovel[]): OrderedNovel[]` — sin cambio de comportamiento.
  - `positionIn(slug: string, ordered: OrderedNovel[]): string | null` — sin cambio.

- [ ] **Step 1: Crear la rama**

```bash
git checkout main
git pull
git checkout -b feat/calendario
```

- [ ] **Step 2: Actualizar el test primero**

En `web/src/lib/saga.test.ts`, cambiar el import y el helper (líneas 2-5):

```ts
import { readingOrder, positionIn, type OrderedNovel } from './saga';

const n = (slug: string, order: number | null, title = slug): OrderedNovel =>
  ({ slug, title, order });
```

Y el nombre del primer test (línea 8), que menciona el campo viejo:

```ts
  it('ordena por order', () => {
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `cd web && npx vitest run src/lib/saga.test.ts`
Expected: FAIL — `OrderedNovel` no existe en `./saga`.

- [ ] **Step 4: Renombrar en la implementación**

Reemplazar `web/src/lib/saga.ts` entero por:

```ts
// El mismo criterio de orden sirve para la saga (orden de lectura) y para la
// fase (orden de anuncio): un número que decide el autor, y punto.
export interface OrderedNovel {
  slug: string;
  title: string;
  order: number | null;
}

// Las que no tienen orden van al final: una lista a medio numerar no debe
// colarse por delante de la primera novela.
export function readingOrder(novels: OrderedNovel[]): OrderedNovel[] {
  return [...novels].sort((a, b) => {
    if (a.order === null && b.order === null) {
      return a.title.localeCompare(b.title, 'es');
    }
    if (a.order === null) return 1;
    if (b.order === null) return -1;
    return a.order - b.order;
  });
}

export function positionIn(slug: string, ordered: OrderedNovel[]): string | null {
  if (ordered.length < 2) return null; // "1ª de 1" no le dice nada al lector
  const i = ordered.findIndex((n) => n.slug === slug);
  return i === -1 ? null : `${i + 1}ª de ${ordered.length}`;
}
```

- [ ] **Step 5: Arreglar los dos sitios que lo llaman**

En `web/src/pages/saga/[slug].astro`, línea 27:

```ts
  novels.map((n) => ({ slug: n.data.slug, title: n.data.title, order: n.data.sagaOrder })),
```

En `web/src/pages/novela/[slug].astro`, línea 58:

```ts
          .map((n) => ({ slug: n.data.slug, title: n.data.title, order: n.data.sagaOrder })),
```

Nota: el campo del contenido sigue llamándose `sagaOrder`. Lo que se generaliza
es la función, no el dato de la novela.

- [ ] **Step 6: Verificar que pasa todo**

Run: `cd web && npm test && npm run check && npm run build`
Expected: PASS, 0 errores de tipo, build OK. Ningún cambio visible en la web.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/saga.ts web/src/lib/saga.test.ts web/src/pages/saga/[slug].astro "web/src/pages/novela/[slug].astro"
git commit -m "Orden de lectura: generalizar para reutilizarlo en las fases"
```

---

### Task 2: El sync trae las Fases y los campos nuevos de la novela

**BLOQUEADA** hasta tener el ID de la BD `Fases` (ver Prerrequisitos). Pídeselo
a Félix antes de empezar.

**Files:**
- Modify: `web/scripts/notion-sync/types.ts`
- Modify: `web/scripts/notion-sync/transform.ts`
- Modify: `web/scripts/notion-sync/transform.test.ts`
- Modify: `web/scripts/notion-sync/notion.ts`
- Modify: `web/scripts/notion-sync/index.ts`
- Modify: `web/scripts/notion-sync/writeContent.ts`
- Modify: `web/src/content/config.ts`

**Interfaces:**
- Consumes: nada de la Task 1.
- Produces:
  - `interface PhaseData { slug: string; name: string; description: string; order: number }`
  - `parsePhase(page: NotionPage): PhaseData`
  - `fetchPhases(): Promise<PhaseData[]>`, `fetchPhaseSlugMap(): Promise<Map<string, string>>`
  - `NovelData.phase: string | null`, `NovelData.phaseOrder: number | null`, `NovelData.releaseWindow: string | null`
  - Colección de contenido `phases` con `slug`/`name`/`description`/`order`.

- [ ] **Step 1: Escribir los tests que fallan**

En `web/scripts/notion-sync/transform.test.ts`:

Añadir al fixture `novelPage` (línea 7) las propiedades nuevas:

```ts
    'Publicada': { checkbox: true },
    'Ventana de lanzamiento': { rich_text: [{ plain_text: 'Finales de 2027' }] },
```

Actualizar el objeto esperado de `'mapea todas las propiedades de una novela'`
(usa `toEqual`, así que las claves nuevas son obligatorias):

```ts
      saga: null,
      sagaOrder: null,
      phase: null,
      phaseOrder: null,
      releaseWindow: 'Finales de 2027',
      related: [],
```

Añadir el fixture de fase y su describe, al final del archivo:

```ts
const phasePage: NotionPage = {
  id: 'phase-1',
  properties: {
    'Nombre': { title: [{ plain_text: 'El despertar' }] },
    'Slug': { rich_text: [{ plain_text: 'el-despertar' }] },
    'Descripción': { rich_text: [{ plain_text: 'Donde todo empieza.' }] },
    'Orden': { number: 1 },
  },
};

describe('parsePhase', () => {
  it('mapea todas las propiedades de una fase', () => {
    expect(parsePhase(phasePage)).toEqual({
      slug: 'el-despertar',
      name: 'El despertar',
      description: 'Donde todo empieza.',
      order: 1,
    });
  });

  it('deriva el slug del nombre si falta Slug', () => {
    const noSlug: NotionPage = {
      id: 'p',
      properties: { ...phasePage.properties, 'Slug': { rich_text: [] } },
    };
    expect(parsePhase(noSlug).slug).toBe('el-despertar');
  });
});

describe('parseNovel con fases', () => {
  const phases = new Map([['phase-1', 'el-despertar']]);
  const enFase: NotionPage = {
    id: 'novel-3',
    properties: {
      ...novelPage.properties,
      'Fase': { relation: [{ id: 'phase-1' }] },
      'Orden en fase': { number: 2 },
    },
  };

  it('resuelve la fase y su orden', () => {
    const n = parseNovel(enFase, undefined, undefined, phases);
    expect(n.phase).toBe('el-despertar');
    expect(n.phaseOrder).toBe(2);
  });

  it('una novela sin fase sale con los campos vacíos', () => {
    const n = parseNovel(novelPage, undefined, undefined, phases);
    expect(n.phase).toBeNull();
    expect(n.phaseOrder).toBeNull();
  });

  it('deja la ventana de lanzamiento en null si está vacía', () => {
    const sinVentana: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Ventana de lanzamiento': { rich_text: [] } },
    };
    expect(parseNovel(sinVentana).releaseWindow).toBeNull();
  });
});
```

Añadir `parsePhase` al import de arriba (línea 2-4):

```ts
import {
  parseNovel, parseChapterMeta, chapterSlug, parseSaga, parsePhase, novelSlugOf, symmetrizeRelated,
} from './transform';
```

Y al helper `novel()` de `describe('symmetrizeRelated', ...)`, los campos nuevos:

```ts
  const novel = (slug: string, related: string[]): NovelData => ({
    slug, title: slug, synopsis: '', status: null, categories: [], tags: [],
    featured: false, saga: null, sagaOrder: null,
    phase: null, phaseOrder: null, releaseWindow: null, related,
  });
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd web && npx vitest run scripts/notion-sync/transform.test.ts`
Expected: FAIL — `parsePhase` no está exportado en `./transform`.

- [ ] **Step 3: Tipos**

En `web/scripts/notion-sync/types.ts`, añadir tras `SagaData`:

```ts
// Una fase agrupa historias por momento de publicación, no por mundo: es el eje
// del calendario, mientras que la saga es el eje narrativo.
export interface PhaseData {
  slug: string;
  name: string;
  description: string;
  order: number;
}
```

Y dentro de `interface NovelData`, tras `sagaOrder`:

```ts
  phase: string | null;         // slug de la fase del calendario, o null
  phaseOrder: number | null;    // posición dentro de la fase
  releaseWindow: string | null; // texto libre: "Finales de 2027", "Por anunciar"
```

- [ ] **Step 4: `parsePhase` y los campos en `parseNovel`**

En `web/scripts/notion-sync/transform.ts`, añadir el import del tipo:

```ts
import type { NotionPage, NovelData, ChapterMeta, SagaData, PhaseData } from './types';
```

Añadir tras `parseSaga`:

```ts
// Misma forma que una saga: nombre, slug, descripción y orden.
export function parsePhase(page: NotionPage): PhaseData {
  const p = page.properties;
  const name = plainText(p['Nombre']);
  const rawSlug = plainText(p['Slug']);
  return {
    slug: rawSlug || slugify(name),
    name,
    description: plainText(p['Descripción']),
    order: p['Orden']?.number ?? 0,
  };
}
```

Y reemplazar la firma y el cuerpo de `parseNovel`:

```ts
export function parseNovel(
  page: NotionPage,
  sagaSlugById?: Map<string, string>,
  novelSlugById?: Map<string, string>,
  phaseSlugById?: Map<string, string>,
): NovelData {
  const p = page.properties;
  return {
    slug: novelSlugOf(page),
    title: plainText(p['Título']),
    synopsis: plainText(p['Sinopsis']),
    status: p['Estado']?.select?.name ?? null,
    categories: (p['Categorías']?.multi_select ?? []).map((o: any) => o.name),
    tags: (p['Etiquetas']?.multi_select ?? []).map((o: any) => o.name),
    featured: Boolean(p['Destacada']?.checkbox),
    saga: relationSlugs(p['Saga'], sagaSlugById)[0] ?? null,
    sagaOrder: p['Orden en saga']?.number ?? null,
    phase: relationSlugs(p['Fase'], phaseSlugById)[0] ?? null,
    phaseOrder: p['Orden en fase']?.number ?? null,
    releaseWindow: plainText(p['Ventana de lanzamiento']) || null,
    related: relationSlugs(p['Relacionadas'], novelSlugById),
  };
}
```

Nota: si la rama `feat/formato-historia` ya está mergeada, este cuerpo también
lleva `format: p['Formato']?.select?.name ?? null` tras `status`. Mira el
archivo antes de pegar: **no borres el campo `format` si está.**

- [ ] **Step 5: Ejecutar y verificar que pasan**

Run: `cd web && npx vitest run scripts/notion-sync/transform.test.ts`
Expected: PASS.

- [ ] **Step 6: Consultar la BD de Fases**

En `web/scripts/notion-sync/notion.ts`, añadir la constante junto a las otras
tres (líneas 7-9), con el ID REAL que te dio Félix:

```ts
const PHASES_DB = '<el ID que te pasó Félix, con guiones>';
```

Añadir al import de tipos `PhaseData` y al de transform `parsePhase`:

```ts
import type { NotionPage, NovelData, ChapterData, SagaData, PhaseData } from './types';
import { parseNovel, parseChapterMeta, parseSaga, parsePhase, novelSlugOf, symmetrizeRelated } from './transform';
```

Añadir tras `fetchSagaSlugMap` (línea 46):

```ts
export async function fetchPhases(): Promise<PhaseData[]> {
  const pages = await queryAll(PHASES_DB);
  return pages.map((page) => parsePhase(page)).sort((a, b) => a.order - b.order);
}

export async function fetchPhaseSlugMap(): Promise<Map<string, string>> {
  const pages = await queryAll(PHASES_DB);
  return new Map(pages.map((page) => [page.id, parsePhase(page).slug]));
}
```

Y cambiar `fetchNovels` para que reciba y pase el mapa de fases:

```ts
export async function fetchNovels(
  sagaSlugById: Map<string, string>,
  phaseSlugById: Map<string, string>,
): Promise<{ novels: NovelData[]; novelSlugById: Map<string, string> }> {
  const pages = await queryAll(NOVELS_DB, PUBLISHED_NOVELS_FILTER);
  // El mapa se construye primero: `Relacionadas` apunta a estas mismas novelas.
  const novelSlugById = new Map(pages.map((page) => [page.id, novelSlugOf(page)]));
  const novels = symmetrizeRelated(
    pages.map((page) => parseNovel(page, sagaSlugById, novelSlugById, phaseSlugById)),
  );
  return { novels, novelSlugById };
}
```

- [ ] **Step 7: Orquestar**

Reemplazar `web/scripts/notion-sync/index.ts` entero por:

```ts
import './env'; // debe ir primero: carga .env antes de que notion.ts lea el token
import {
  fetchSagas, fetchSagaSlugMap, fetchPhases, fetchPhaseSlugMap, fetchNovels, fetchChapters,
} from './notion';
import { writeContent } from './writeContent';

async function main(): Promise<void> {
  const [sagas, sagaSlugById, phases, phaseSlugById] = await Promise.all([
    fetchSagas(),
    fetchSagaSlugMap(),
    fetchPhases(),
    fetchPhaseSlugMap(),
  ]);
  const { novels, novelSlugById } = await fetchNovels(sagaSlugById, phaseSlugById);
  const chapters = await fetchChapters(novelSlugById);
  const published = chapters.filter((c) => c.unlocked);
  const locked = chapters.filter((c) => !c.unlocked);
  await writeContent(sagas, phases, novels, published, locked);
  console.log(
    `Sync OK: ${sagas.length} sagas, ${phases.length} fases, ${novels.length} novelas, ` +
      `${published.length} capítulos publicados, ${locked.length} bloqueados.`,
  );
}

main().catch((err) => {
  console.error('Sync falló:', err);
  process.exit(1);
});
```

- [ ] **Step 8: Escribir el contenido**

En `web/scripts/notion-sync/writeContent.ts`:

Import y constante de directorio:

```ts
import type { NovelData, ChapterData, SagaData, PhaseData } from './types';
```

```ts
const SAGAS_DIR = join(CONTENT, 'sagas');
const PHASES_DIR = join(CONTENT, 'phases');
```

Firma y cuerpo (los directorios se borran y se rehacen en cada sync, así que
`PHASES_DIR` entra en la lista de la línea 24):

```ts
export async function writeContent(
  sagas: SagaData[],
  phases: PhaseData[],
  novels: NovelData[],
  published: ChapterData[],
  locked: ChapterData[],
): Promise<void> {
  for (const dir of [SAGAS_DIR, PHASES_DIR, NOVELS_DIR, CHAPTERS_DIR, LOCKED_DIR]) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
  }

  for (const s of sagas) {
    await writeFile(join(SAGAS_DIR, `${s.slug}.json`), JSON.stringify(s, null, 2));
  }

  for (const p of phases) {
    await writeFile(join(PHASES_DIR, `${p.slug}.json`), JSON.stringify(p, null, 2));
  }
```

(el resto de la función se queda igual)

- [ ] **Step 9: Colección y schema**

En `web/src/content/config.ts`, añadir la colección tras `sagas`:

```ts
const phases = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});
```

Añadir a `novels`, tras `sagaOrder`:

```ts
    phase: z.string().nullable().default(null),
    phaseOrder: z.number().nullable().default(null),
    releaseWindow: z.string().nullable().default(null),
```

Y exportarla:

```ts
export const collections = { sagas, phases, novels, chapters, lockedChapters };
```

Los `default(null)` son deliberados: los JSON que ya están en el repo no tienen
estos campos y el build debe seguir funcionando sin volver a sincronizar.

- [ ] **Step 10: Crear el directorio de la colección vacía**

Astro se queja de una colección declarada cuyo directorio no existe. Crear
`web/src/content/phases/.gitkeep` vacío para que la colección exista aunque el
sync aún no se haya ejecutado.

```bash
mkdir -p web/src/content/phases
touch web/src/content/phases/.gitkeep
```

- [ ] **Step 11: Verificar**

Run: `cd web && npm test && npm run check && npm run build`
Expected: PASS, 0 errores, build OK.

- [ ] **Step 12: Commit**

```bash
git add web/scripts/notion-sync web/src/content/config.ts web/src/content/phases/.gitkeep
git commit -m "Sync: fases del calendario y ventana de lanzamiento"
```

---

### Task 3: La fecha que se muestra de cada historia

**Files:**
- Create: `web/src/lib/calendar.ts`
- Test: `web/src/lib/calendar.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `releaseLabel(input: { firstChapterAt: string | null; releaseWindow: string | null }): string | null`

- [ ] **Step 1: Escribir el test que falla**

Crear `web/src/lib/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { releaseLabel } from './calendar';

describe('releaseLabel', () => {
  it('con capítulos publicados, la fecha del primero manda', () => {
    expect(releaseLabel({
      firstChapterAt: '2026-01-15T19:00:00.000-05:00',
      releaseWindow: 'Finales de 2027',
    })).toBe('enero de 2026');
  });

  it('sin capítulos, usa la ventana de lanzamiento tal cual', () => {
    expect(releaseLabel({ firstChapterAt: null, releaseWindow: 'Finales de 2027' }))
      .toBe('Finales de 2027');
  });

  it('sin nada, no promete nada', () => {
    expect(releaseLabel({ firstChapterAt: null, releaseWindow: null })).toBeNull();
  });

  it('una fecha ilegible no rompe la página: cae en la ventana', () => {
    expect(releaseLabel({ firstChapterAt: 'mañana', releaseWindow: 'Por anunciar' }))
      .toBe('Por anunciar');
  });

  it('usa la hora de Panamá: un capítulo del 1 de enero a las 19:00 no se va a diciembre', () => {
    expect(releaseLabel({ firstChapterAt: '2026-01-01T19:00:00.000-05:00', releaseWindow: null }))
      .toBe('enero de 2026');
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd web && npx vitest run src/lib/calendar.test.ts`
Expected: FAIL — `Failed to resolve import "./calendar"`.

- [ ] **Step 3: Implementación mínima**

Crear `web/src/lib/calendar.ts`:

```ts
export interface ReleaseInput {
  firstChapterAt: string | null; // ISO del capítulo 1, si la historia ya empezó
  releaseWindow: string | null;  // texto libre de Notion: "Finales de 2027"
}

// Cascada deliberada: el hecho (una fecha real de publicación) gana a la
// promesa (la ventana que escribió el autor), y si no hay ninguna de las dos no
// se inventa nada.
export function releaseLabel({ firstChapterAt, releaseWindow }: ReleaseInput): string | null {
  if (firstChapterAt) {
    const d = new Date(firstChapterAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Panama',
      });
    }
  }
  return releaseWindow || null;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd web && npx vitest run src/lib/calendar.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/calendar.ts web/src/lib/calendar.test.ts
git commit -m "Calendario: la fecha que se le muestra al lector"
```

---

### Task 4: Solo el calendario muestra lo que no se puede leer

Este es el cambio de fondo del spec. `Publicada` en Notion pasa a significar
*visible en la web*; «¿se puede leer?» se deduce de tener capítulos publicados.
Sin este filtro, anunciar una historia generaría una ficha vacía y un clic
muerto.

**Files:**
- Create: `web/src/lib/novels.ts`
- Modify: `web/src/pages/index.astro:9-12`
- Modify: `web/src/pages/novelas/index.astro:6-8`
- Modify: `web/src/pages/biblioteca.astro:7-9`
- Modify: `web/src/pages/buscar.astro:7-9`
- Modify: `web/src/pages/categoria/[slug].astro:9-21`
- Modify: `web/src/pages/etiqueta/[slug].astro:9-21`
- Modify: `web/src/pages/saga/[slug].astro:8-25`
- Modify: `web/src/pages/novela/[slug].astro:12-21`

**Interfaces:**
- Consumes: nada.
- Produces: `getReadableNovels(): Promise<CollectionEntry<'novels'>[]>` — mismas
  entradas que `getCollection('novels')`, quitando las que no tienen ningún
  capítulo publicado.

- [ ] **Step 1: Crear el helper**

Crear `web/src/lib/novels.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

// Una historia anunciada (sincronizada pero sin ningún capítulo publicado) solo
// existe en /calendario. En cualquier otro sitio sería una ficha vacía y un clic
// muerto — misma regla que "una saga sin novelas publicadas no genera página".
export async function getReadableNovels(): Promise<CollectionEntry<'novels'>[]> {
  const chapters = await getCollection('chapters');
  const conCapitulos = new Set(chapters.map((c) => c.data.novelSlug));
  return (await getCollection('novels')).filter((n) => conCapitulos.has(n.data.slug));
}
```

- [ ] **Step 2: Cambiar las ocho páginas**

En cada archivo, sustituir la llamada a `getCollection('novels')` por
`getReadableNovels()` y añadir el import
`import { getReadableNovels } from '<ruta relativa>/lib/novels';`.
La ruta es `../lib/novels` en las páginas de primer nivel y `../../lib/novels`
en las de subdirectorio.

- `index.astro` línea 9: `const novels = (await getReadableNovels()).sort(...)`
- `novelas/index.astro` línea 6: igual.
- `biblioteca.astro` línea 7: igual.
- `buscar.astro` línea 7: igual.
- `categoria/[slug].astro`: línea 10 (`getStaticPaths`) y línea 19.
- `etiqueta/[slug].astro`: línea 10 (`getStaticPaths`) y línea 19.
- `saga/[slug].astro`: línea 9 (`getStaticPaths`) y línea 25. Ojo: el filtro de
  la línea 14 (`sagas.filter(...)`) ya no necesita tocarse — al pasarle solo
  novelas legibles, la regla de «saga sin novelas publicadas» se aplica sola.
- `novela/[slug].astro`: línea 13 (`getStaticPaths`, así no se genera página
  para una historia anunciada) y línea 57 (el `getCollection('novels')` de
  dentro del cálculo de `sagaPosition`).

`novela/[slug].astro` línea 18 usa `getEntry('novels', slug)`: se queda como
está. Solo se llama para slugs que `getStaticPaths` ya aprobó.

- [ ] **Step 3: Verificar que nada desaparece**

Run: `cd web && npm run build`
Expected: build OK. En `web/dist/` deben seguir existiendo las mismas carpetas
de novela que antes del cambio — hoy todas las novelas sincronizadas tienen
capítulos, así que el filtro aún no quita nada. Comprobar:

```bash
ls web/dist/novela
```

Expected: las cinco novelas actuales (`ascension-de-los-olvidados`,
`la-fragmentacion-del-cuarzo`, `la-niebla-ceniza`, `que-preguntas`, `tarsis`).

Si alguna desaparece, el filtro está mal: párate y revisa antes de seguir.

- [ ] **Step 4: Verificar tipos**

Run: `cd web && npm run check`
Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/novels.ts web/src/pages
git commit -m "Catálogo y buscador: solo historias que se pueden leer"
```

---

### Task 5: La página `/calendario`

**Files:**
- Create: `web/src/pages/calendario.astro`
- Modify: `web/src/components/Header.astro:10-15`

**Interfaces:**
- Consumes: `releaseLabel` (Task 3), `readingOrder` con el campo `order`
  (Task 1), las colecciones `phases`/`novels`/`chapters` (Task 2).
- Produces: nada.

- [ ] **Step 1: Crear la página**

Crear `web/src/pages/calendario.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Emblem from '../components/Emblem.astro';
import { coverGradient } from '../lib/covers';
import { releaseLabel } from '../lib/calendar';
import { readingOrder } from '../lib/saga';

const novels = await getCollection('novels');
const chapters = await getCollection('chapters');
const phases = (await getCollection('phases')).sort((a, b) => a.data.order - b.data.order);

// Fecha del capítulo 1 de cada novela: el hecho que manda sobre la promesa.
const firstChapterAt = new Map<string, string>();
for (const c of chapters.filter((c) => c.data.number === 1)) {
  firstChapterAt.set(c.data.novelSlug, c.data.publishedAt);
}
const readable = new Set(chapters.map((c) => c.data.novelSlug));

const sections = phases
  .map((p) => {
    const ofPhase = novels.filter((n) => n.data.phase === p.data.slug);
    const ordered = readingOrder(
      ofPhase.map((n) => ({ slug: n.data.slug, title: n.data.title, order: n.data.phaseOrder })),
    );
    const bySlug = new Map(ofPhase.map((n) => [n.data.slug, n.data]));
    return {
      phase: p.data,
      stories: ordered.map((o) => {
        const n = bySlug.get(o.slug)!;
        return {
          slug: n.slug,
          title: n.title,
          status: n.status,
          categories: n.categories,
          readable: readable.has(n.slug),
          date: releaseLabel({
            firstChapterAt: firstChapterAt.get(n.slug) ?? null,
            releaseWindow: n.releaseWindow,
          }),
        };
      }),
    };
  })
  // Una fase sin historias no promete nada: no genera sección.
  .filter((s) => s.stories.length > 0);
---

<BaseLayout
  title="Calendario — Draveir"
  description="Todo lo que viene y todo lo que ya salió, fase por fase."
>
  <main class="container wide" id="contenido">
    <div class="page-head">
      <span class="eyebrow">Calendario</span>
      <h1>Lo que viene</h1>
      <p class="lead">Las historias por fases, en orden de publicación.</p>
    </div>

    {sections.length === 0 && <p class="empty">Aún no hay fases publicadas.</p>}

    {sections.map((s) => (
      <section class="phase">
        <div class="phase-head">
          <h2>{s.phase.name}</h2>
          {s.phase.description && <p class="phase-desc">{s.phase.description}</p>}
        </div>
        <ol class="timeline">
          {s.stories.map((story) => (
            <li class="entry">
              <span class="plate mini" style={`background:${coverGradient(story.categories)}`} aria-hidden="true">
                <Emblem slug={story.slug} />
              </span>
              <div class="entry-body">
                <h3>
                  {story.readable
                    ? <a href={`/novela/${story.slug}`}>{story.title}</a>
                    : story.title}
                </h3>
                <p class="entry-meta">
                  {story.date && <span class="when">{story.date}</span>}
                  {story.readable
                    ? story.status && <span class="status">{story.status}</span>
                    : <span class="soon">Próximamente</span>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    ))}
  </main>
</BaseLayout>

<style>
  .wide { max-width: 62rem; }
  .page-head { margin-bottom: var(--space-6); }
  .page-head h1 { margin: var(--space-1) 0 0; }
  .lead { color: var(--text-muted); font-size: 1.1rem; margin-top: var(--space-3); }
  .empty { color: var(--text-muted); font-family: var(--font-sans); }

  .phase { margin-bottom: var(--space-6); }
  .phase-head { border-bottom: 1px solid var(--border); padding-bottom: var(--space-3); margin-bottom: var(--space-4); }
  .phase-head h2 { margin: 0; }
  .phase-desc { color: var(--text-muted); max-width: 60ch; margin: var(--space-2) 0 0; }

  .timeline { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-4); }
  .entry { display: flex; gap: var(--space-4); align-items: center; }
  .plate.mini { width: 64px; flex: none; aspect-ratio: 2 / 3; }
  .entry-body h3 { margin: 0 0 var(--space-2); font-size: 1.15rem; }
  .entry-body h3 a { color: var(--text); }
  .entry-body h3 a:hover { color: var(--accent); }
  .entry-meta {
    margin: 0; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: baseline;
    font-family: var(--font-sans); font-size: var(--step--1);
  }
  .when { color: var(--text-muted); }
  .soon { color: var(--brass); }
</style>
```

- [ ] **Step 2: Enlace en la navegación**

En `web/src/components/Header.astro`, dentro de `<nav class="site-nav">`,
después del enlace a `/novelas`:

```astro
      <a href="/calendario">Calendario</a>
```

- [ ] **Step 3: Verificar el build y la página**

Run: `cd web && npm run check && npm run build`
Expected: 0 errores, build OK, existe `web/dist/calendario/index.html`.

Run: `cd web && npm run dev` y abrir `http://localhost:4321/calendario`.

Expected, mientras Félix no haya creado fases en Notion: la página carga y dice
«Aún no hay fases publicadas». Eso es correcto, no un fallo. Con fases
sincronizadas: una sección por fase, historias en orden, las legibles enlazan y
las anunciadas muestran `Próximamente` sin enlace. Parar con Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/calendario.astro web/src/components/Header.astro
git commit -m "Calendario: página de fases y enlace en la navegación"
```

---

### Task 6: Cerrar la rama

- [ ] **Step 1: Suite completa**

Run: `cd web && npm test && npm run check && npm run build`
Expected: todo verde.

- [ ] **Step 2: Abrir el PR**

```bash
git push -u origin feat/calendario
gh pr create --title "Calendario de publicaciones por fases" --body "$(cat <<'EOF'
Una página `/calendario` con todas las historias agrupadas en fases, al estilo de las fases de Marvel.

- BD `Fases` nueva en Notion, gemela de la de Sagas; `Fase`, `Orden en fase` y `Ventana de lanzamiento` en Novelas.
- La fecha sale del capítulo 1; si la historia no ha empezado, del texto libre que escriba el autor.
- El orden dentro de la fase lo manda el autor, no la fecha.
- `Publicada` en Notion pasa a significar «visible en la web»: si una historia no tiene capítulos publicados, solo aparece en el calendario, marcada como `Próximamente`.
- `readingOrder` se generaliza para servir a sagas y fases en vez de duplicarse.

Spec: `docs/superpowers/specs/2026-07-16-formato-y-calendario-design.md` (Parte 2).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01HFYFoBWHM7xb129fzZ5XET
EOF
)"
```

- [ ] **Step 3: Recordar el squash-merge**

El repo mantiene historia lineal: mergear con squash.
