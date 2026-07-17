# Formato de historia y filtro en el buscador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada historia declare su formato (Microrrelato…Novela), lo muestre con su tiempo de lectura, y que el buscador filtre por formato.

**Architecture:** El formato es un dato que el autor declara en Notion; el sync lo copia al JSON de la novela y el sitio solo lo presenta. Toda la lógica pura vive en `src/lib/format.ts` con tests; las plantillas `.astro` solo pintan. El filtro reutiliza el mecanismo que ya usa `buscar.astro`: atributos `data-` en las tarjetas y ocultar/mostrar en cliente.

**Tech Stack:** Astro 4 (estático), TypeScript, Vitest, sync propio contra la API de Notion (`scripts/notion-sync`).

Spec: `docs/superpowers/specs/2026-07-16-formato-y-calendario-design.md` (Parte 1).

## Global Constraints

- Todos los comandos se ejecutan desde `web/`, no desde la raíz del repo.
- Tests: `npm test` (Vitest, `vitest run`). Un test por archivo `*.test.ts` junto al código.
- Trabajo en la rama `feat/formato-historia`. Nunca commitear a `main`.
- Los cinco valores exactos del select `Formato` en Notion: `Microrrelato`, `Relato`, `Relato largo`, `Novela corta`, `Novela`.
- Términos cultos, solo dos: `Relato largo → novelette`, `Novela corta → nouvelle`. Los otros tres no llevan subtítulo.
- El formato NUNCA se calcula contando palabras. Lo declara el autor.
- Un `Formato` desconocido o ausente no rompe el build.
- Textos de interfaz en español, con tildes.
- No añadir dependencias.

## Prerrequisito (lo hace Félix, no el implementador)

En la BD de Novelas de Notion, crear la propiedad `Formato` (tipo *Select*) con
exactamente esos cinco valores, y asignárselo a las novelas existentes. El plan
funciona igualmente sin esto (todo saldría `null`), pero no se vería nada.

## File Structure

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/format.ts` (nuevo) | Lógica pura: término culto de un formato y formateo de minutos a texto. |
| `src/lib/format.test.ts` (nuevo) | Tests de lo anterior. |
| `scripts/notion-sync/types.ts` | Añadir `format` a `NovelData`. |
| `scripts/notion-sync/transform.ts` | Leer `Formato` en `parseNovel`. |
| `scripts/notion-sync/transform.test.ts` | Cubrir el campo nuevo. |
| `src/content/config.ts` | Añadir `format` al schema de `novels`. |
| `src/components/NovelCard.astro` | Prop `format` y etiqueta en `.meta`. |
| `src/pages/novela/[slug].astro` | Línea de formato + tiempo de lectura total. |
| `src/pages/buscar.astro` | Chips de filtro + `data-format` en las tarjetas. |
| `src/pages/index.astro`, `src/pages/novelas/index.astro`, `src/pages/biblioteca.astro`, `src/pages/categoria/[slug].astro`, `src/pages/etiqueta/[slug].astro`, `src/pages/saga/[slug].astro` | Pasar la prop `format` a `NovelCard`. |

---

### Task 1: Lógica de formato y tiempo de lectura

**Files:**
- Create: `web/src/lib/format.ts`
- Test: `web/src/lib/format.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `formatSubtitle(format: string | null): string | null` — el término culto, o `null`.
  - `formatMinutes(minutes: number): string` — minutos → `"45 min"` / `"1 h 40 min"` / `"2 h"`.

- [ ] **Step 1: Crear la rama**

```bash
git checkout main
git pull
git checkout -b feat/formato-historia
```

- [ ] **Step 2: Escribir el test que falla**

Crear `web/src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatSubtitle, formatMinutes } from './format';

describe('formatSubtitle', () => {
  it('da el término culto de los formatos que lo tienen', () => {
    expect(formatSubtitle('Relato largo')).toBe('novelette');
    expect(formatSubtitle('Novela corta')).toBe('nouvelle');
  });

  it('no inventa subtítulo para los formatos que no lo necesitan', () => {
    expect(formatSubtitle('Microrrelato')).toBeNull();
    expect(formatSubtitle('Relato')).toBeNull();
    expect(formatSubtitle('Novela')).toBeNull();
  });

  it('devuelve null si el formato falta o no se reconoce', () => {
    expect(formatSubtitle(null)).toBeNull();
    expect(formatSubtitle('Novelón')).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('menos de una hora: solo minutos', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(1)).toBe('1 min');
    expect(formatMinutes(59)).toBe('59 min');
  });

  it('una hora en punto: sin minutos colgando', () => {
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(120)).toBe('2 h');
  });

  it('más de una hora: horas y minutos', () => {
    expect(formatMinutes(100)).toBe('1 h 40 min');
    expect(formatMinutes(605)).toBe('10 h 5 min');
  });
});
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `cd web && npx vitest run src/lib/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`.

- [ ] **Step 4: Implementación mínima**

Crear `web/src/lib/format.ts`:

```ts
// El término culto solo acompaña a los dos formatos cuyo nombre claro se queda
// corto; "Novelette" y "Nouvelle" como etiqueta principal no los reconoce el
// lector, así que van de subtítulo o no van.
const SUBTITLES: Record<string, string> = {
  'Relato largo': 'novelette',
  'Novela corta': 'nouvelle',
};

export function formatSubtitle(format: string | null): string | null {
  return (format && SUBTITLES[format]) ?? null;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

Run: `cd web && npx vitest run src/lib/format.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/format.ts web/src/lib/format.test.ts
git commit -m "Formato: término culto y tiempo de lectura legible"
```

---

### Task 2: El sync trae `Formato` desde Notion

**Files:**
- Modify: `web/scripts/notion-sync/types.ts`
- Modify: `web/scripts/notion-sync/transform.ts:42-60` (`parseNovel`)
- Modify: `web/scripts/notion-sync/transform.test.ts`
- Modify: `web/src/content/config.ts:13-27` (colección `novels`)

**Interfaces:**
- Consumes: nada de la Task 1.
- Produces: `NovelData.format: string | null`, presente en cada
  `src/content/novels/*.json` tras un sync, y en `novel.data.format` en las
  plantillas.

- [ ] **Step 1: Escribir el test que falla**

En `web/scripts/notion-sync/transform.test.ts`, añadir `'Formato'` a las
propiedades del fixture `novelPage` (que empieza en la línea 7), justo después
de `'Estado'`:

```ts
    'Estado': { select: { name: 'En progreso' } },
    'Formato': { select: { name: 'Novela' } },
```

Actualizar el objeto esperado del test `'mapea todas las propiedades de una novela'`
para incluir el campo nuevo (el test usa `toEqual`, así que sin esto falla):

```ts
      status: 'En progreso',
      format: 'Novela',
```

Y añadir, dentro de `describe('parseNovel', ...)`, un test para la ausencia:

```ts
  it('deja el formato en null si la novela no lo declara', () => {
    const sinFormato: NotionPage = {
      id: 'n',
      properties: { ...novelPage.properties, 'Formato': {} },
    };
    expect(parseNovel(sinFormato).format).toBeNull();
  });
```

En el helper `novel()` de `describe('symmetrizeRelated', ...)` (línea ~167),
añadir `format: null` al objeto para que siga cumpliendo el tipo `NovelData`:

```ts
  const novel = (slug: string, related: string[]): NovelData => ({
    slug, title: slug, synopsis: '', status: null, format: null, categories: [], tags: [],
    featured: false, saga: null, sagaOrder: null, related,
  });
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd web && npx vitest run scripts/notion-sync/transform.test.ts`
Expected: FAIL — el objeto esperado tiene `format: 'Novela'` y el recibido no
tiene esa clave; y error de tipo por `format` en el helper.

- [ ] **Step 3: Implementación mínima**

En `web/scripts/notion-sync/types.ts`, dentro de `interface NovelData`, después
de `status`:

```ts
  status: string | null;
  format: string | null;   // Microrrelato | Relato | Relato largo | Novela corta | Novela
```

En `web/scripts/notion-sync/transform.ts`, dentro de `parseNovel`, después de la
línea de `status`:

```ts
    status: p['Estado']?.select?.name ?? null,
    format: p['Formato']?.select?.name ?? null,
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `cd web && npm test`
Expected: PASS — toda la suite.

- [ ] **Step 5: Añadir el campo al schema de contenido**

En `web/src/content/config.ts`, en la colección `novels`, después de `status`:

```ts
    status: z.string().nullable(),
    format: z.string().nullable().default(null),
```

`default(null)` es deliberado: los JSON que ya están en `src/content/novels/`
no tienen `format` y el build debe seguir funcionando sin volver a sincronizar.

- [ ] **Step 6: Verificar que el build sigue en pie**

Run: `cd web && npm run build`
Expected: build OK, sin errores de schema.

- [ ] **Step 7: Commit**

```bash
git add web/scripts/notion-sync/types.ts web/scripts/notion-sync/transform.ts web/scripts/notion-sync/transform.test.ts web/src/content/config.ts
git commit -m "Sync: traer el Formato de la novela desde Notion"
```

---

### Task 3: El formato en la ficha de novela, con tiempo de lectura

**Files:**
- Modify: `web/src/pages/novela/[slug].astro`

**Interfaces:**
- Consumes: `formatSubtitle`, `formatMinutes` de `src/lib/format.ts` (Task 1);
  `novel.data.format` (Task 2); `readingTime` de `src/lib/reading.ts` (ya existe).
- Produces: nada que consuman otras tasks.

- [ ] **Step 1: Importar lo necesario**

En `web/src/pages/novela/[slug].astro`, junto a los imports ya existentes
(línea 8 es `import { readingTime } from '../../lib/reading';`):

```ts
import { formatSubtitle, formatMinutes } from '../../lib/format';
```

- [ ] **Step 2: Calcular el tiempo total en el frontmatter**

Después del bloque `const chapters = [...]` (termina en la línea 40), añadir:

```ts
// Solo los capítulos publicados: el texto de los bloqueados no está en el repo,
// así que se anuncia lo que hoy se puede leer, no un total imaginario.
const totalMinutes = published.length ? readingTime(published.map((c) => c.body).join(' ')) : 0;
const subtitle = formatSubtitle(novel.data.format);
```

- [ ] **Step 3: Pintarlo bajo la sinopsis**

En el bloque `<div class="meta">` (línea 85), añadir como PRIMER hijo, antes del
`{saga && (...)}`:

```astro
          {novel.data.format && (
            <span class="format">
              {novel.data.format}{subtitle && <span class="format-alt"> · {subtitle}</span>}
              {totalMinutes > 0 && <span class="format-time"> · ≈ {formatMinutes(totalMinutes)} de lectura</span>}
            </span>
          )}
```

- [ ] **Step 4: Estilos**

En el `<style>` de la página, junto a `.saga-line`:

```css
  .format { font-family: var(--font-sans); font-size: var(--step--1); color: var(--text-muted); }
  .format-alt { font-style: italic; }
  .format-time { color: var(--text-muted); }
```

- [ ] **Step 5: Verificar en el navegador**

Run: `cd web && npm run dev`
Abrir `http://localhost:4321/novela/ascension-de-los-olvidados`.
Expected: bajo la sinopsis se lee el formato (si Félix ya lo asignó en Notion y
se ha sincronizado) y `≈ N h M min de lectura`. Si `format` es `null`, la línea
no aparece y nada más cambia. Parar el servidor con Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/novela/[slug].astro
git commit -m "Ficha de novela: formato y tiempo de lectura"
```

---

### Task 4: El formato en la tarjeta

**Files:**
- Modify: `web/src/components/NovelCard.astro`
- Modify: `web/src/pages/index.astro:63-72`
- Modify: `web/src/pages/novelas/index.astro:15-23`
- Modify: `web/src/pages/biblioteca.astro:43-47`
- Modify: `web/src/pages/categoria/[slug].astro:32-40`
- Modify: `web/src/pages/etiqueta/[slug].astro`
- Modify: `web/src/pages/saga/[slug].astro:41-52`

**Interfaces:**
- Consumes: `novel.data.format` (Task 2).
- Produces: `NovelCard` acepta `format?: string | null` y emite
  `data-format="<valor>"` en el `<li>`, que la Task 5 usa para filtrar.

- [ ] **Step 1: Añadir la prop al componente**

En `web/src/components/NovelCard.astro`, en `interface Props` y en el destructuring:

```ts
interface Props {
  slug: string;
  title: string;
  synopsis: string;
  status: string | null;
  format?: string | null;
  categories: string[];
  searchText?: string;
}

const { slug, title, synopsis, status, format, categories, searchText } = Astro.props;
```

- [ ] **Step 2: Emitir el dato y la etiqueta**

Cambiar la línea del `<li>` (línea 20):

```astro
<li class="novel-card" data-search={searchText} data-format={format ?? undefined}>
```

Y dentro de `<div class="meta">` (línea 31), añadir tras el `{status && ...}`:

```astro
      {format && <span class="format">{format}</span>}
```

- [ ] **Step 3: Estilos**

En el `<style>` del componente:

```css
  .format {
    font-family: var(--font-sans); font-size: var(--step--1);
    color: var(--text-muted); margin-right: 0.5rem;
  }
```

- [ ] **Step 4: Pasar la prop desde las seis páginas**

En cada uno de estos archivos, en la llamada a `<NovelCard ... />`, añadir la
línea `format={...}` junto a `status={...}`:

- `web/src/pages/index.astro`: `format={n.data.format}`
- `web/src/pages/novelas/index.astro`: `format={n.data.format}`
- `web/src/pages/biblioteca.astro`: `format={n.data.format}`
- `web/src/pages/categoria/[slug].astro`: `format={n.data.format}`
- `web/src/pages/etiqueta/[slug].astro`: `format={n.data.format}`
- `web/src/pages/saga/[slug].astro`: `format={n.format}` — ojo, aquí la variable
  es `n` sacada de `bySlug.get(o.slug)!`, que ya es el `.data`, no la entrada.

- [ ] **Step 5: Verificar tipos y build**

Run: `cd web && npm run check && npm run build`
Expected: 0 errores, build OK.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/NovelCard.astro web/src/pages
git commit -m "Tarjeta de novela: etiqueta de formato"
```

---

### Task 5: Filtro por formato en el buscador

**Files:**
- Modify: `web/src/pages/buscar.astro`

**Interfaces:**
- Consumes: `data-format` de `NovelCard` (Task 4); `novel.data.format` (Task 2).
- Produces: nada.

- [ ] **Step 1: Construir la lista de chips en el frontmatter**

En `web/src/pages/buscar.astro`, después de la constante `novels` (línea 7-9):

```ts
// Solo los formatos que existen en el catálogo: un chip que no filtra nada es
// una promesa vacía. El orden es el de la taxonomía, de menor a mayor.
const ORDER = ['Microrrelato', 'Relato', 'Relato largo', 'Novela corta', 'Novela'];
const present = new Set(novels.map((n) => n.data.format).filter(Boolean) as string[]);
const formats = ORDER.filter((f) => present.has(f));
```

- [ ] **Step 2: Pintar los chips y pasar la prop**

Entre el `<h1>Buscar</h1>` y el `<input>`, añadir:

```astro
    {formats.length > 0 && (
      <div class="chips" role="group" aria-label="Filtrar por formato">
        {formats.map((f) => (
          <button type="button" class="chip" data-chip={f} aria-pressed="false">{f}</button>
        ))}
      </div>
    )}
```

Y en el `<NovelCard ... />` de esta página, añadir `format={n.data.format}`.

- [ ] **Step 3: Filtrar en cliente**

Reemplazar el bloque `<script>` completo (líneas 58-76) por:

```astro
<script>
  import { normalizeText } from '../lib/search';

  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('#search-results [data-search]'));
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.chip'));
  const empty = document.getElementById('search-empty');
  let activeFormat: string | null = null;

  const apply = () => {
    const terms = normalizeText(input?.value ?? '').trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const hay = card.dataset.search ?? '';
      const match =
        terms.every((t) => hay.includes(t)) &&
        (activeFormat === null || card.dataset.format === activeFormat);
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
  };

  input?.addEventListener('input', apply);

  // Selección única: pulsar el chip activo lo desactiva y vuelve a "todos".
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const value = chip.dataset.chip ?? null;
      activeFormat = activeFormat === value ? null : value;
      for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.chip === activeFormat));
      apply();
    });
  }
</script>
```

- [ ] **Step 4: Estilos de los chips**

En el `<style>` de la página:

```css
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: var(--space-3); }
  .chip {
    font-family: var(--font-sans); font-size: var(--step--1); color: var(--text-muted);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 999px; padding: 0.35rem 0.85rem; cursor: pointer;
  }
  .chip:hover { color: var(--text); border-color: var(--accent); }
  .chip[aria-pressed='true'] { color: var(--text); border-color: var(--brass); }
  @media (prefers-reduced-motion: no-preference) {
    .chip { transition: color 0.15s ease, border-color 0.15s ease; }
  }
```

- [ ] **Step 5: Verificar a mano en el navegador**

Run: `cd web && npm run dev`
Abrir `http://localhost:4321/buscar` y comprobar:
1. Pulsar un chip → solo quedan las novelas de ese formato, el chip se marca.
2. Pulsar el mismo chip otra vez → vuelven todas.
3. Chip activo + escribir texto → filtra por ambos (AND).
4. Combinación sin resultados → aparece «Sin resultados».
Parar con Ctrl+C.

- [ ] **Step 6: Verificar tipos y build**

Run: `cd web && npm run check && npm run build`
Expected: 0 errores, build OK.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/buscar.astro
git commit -m "Buscar: filtro por formato de historia"
```

---

### Task 6: Cerrar la rama

- [ ] **Step 1: Suite completa**

Run: `cd web && npm test && npm run check && npm run build`
Expected: todo verde.

- [ ] **Step 2: Abrir el PR**

```bash
git push -u origin feat/formato-historia
gh pr create --title "Formato de historia y filtro en el buscador" --body "$(cat <<'EOF'
El lector ya puede saber si una historia es un relato o una novela, y filtrar por ello.

- Campo `Formato` en Notion → `format` en el JSON de la novela.
- Ficha: `Novela corta · nouvelle` + tiempo de lectura de los capítulos publicados.
- Tarjeta: etiqueta de formato.
- Buscador: chips de filtro, combinables con el texto.

Spec: `docs/superpowers/specs/2026-07-16-formato-y-calendario-design.md` (Parte 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01HFYFoBWHM7xb129fzZ5XET
EOF
)"
```

- [ ] **Step 3: Recordar el squash-merge**

El repo mantiene historia lineal: mergear con squash.
