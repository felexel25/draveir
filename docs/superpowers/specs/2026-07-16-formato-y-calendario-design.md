# Formato de historia y calendario de publicaciones

Fecha: 2026-07-16

Dos funcionalidades independientes, un solo spec porque comparten el mismo eje:
decir al lector **qué tamaño tiene** una historia y **cuándo llega**. Se
implementan y se mergean por separado, una rama y un PR cada una.

---

## Parte 1 — Formato de historia y filtro en el buscador

### Problema

El lector no sabe si «Társis» es un relato de veinte minutos o una novela de
seiscientas páginas hasta que entra y cuenta capítulos. El buscador solo filtra
por texto libre.

### Taxonomía

Se adopta la clasificación estándar (SFWA, referencia habitual también en el
mundo hispano), con etiquetas comprensibles para el lector latinoamericano y el
término culto como matiz secundario:

| Valor en Notion | Se muestra como     | Rango de referencia |
| --------------- | ------------------- | ------------------- |
| `Microrrelato`  | Microrrelato        | < 1.000 palabras    |
| `Relato`        | Relato              | 1.000 – 7.500       |
| `Relato largo`  | Relato largo · novelette | 7.500 – 17.500 |
| `Novela corta`  | Novela corta · nouvelle  | 17.500 – 40.000 |
| `Novela`        | Novela              | > 40.000            |

Los rangos son **referencia para el autor al rellenar Notion**, no lógica del
sitio: el formato lo declara el autor, no lo calcula el código. Una novela en
progreso con tres capítulos publicados es una novela desde el primer día.

`Novelette` y `Nouvelle` se descartaron como etiqueta principal: son jerga que
el público objetivo no reconoce, y en un filtro un término que no se entiende es
un botón que no se pulsa.

### Dato

- **Notion**: propiedad `Formato` (select) en la BD de Novelas, con los cinco
  valores exactos de la tabla.
- **Sync**: `parseNovel` lee `p['Formato']?.select?.name ?? null` a un campo
  `format: string | null` en `NovelData`.
- **Schema** (`src/content/config.ts`): `format: z.string().nullable().default(null)`.
  Nullable a propósito: una novela sin formato asignado no debe romper el build.
- **Mapa de término culto**: vive solo en el código, en `src/lib/format.ts`. Dos
  entradas (`Relato largo → novelette`, `Novela corta → nouvelle`). Los otros
  tres formatos no llevan subtítulo.

Un valor de `Formato` que no esté en la tabla se trata como formato desconocido:
se muestra tal cual, sin subtítulo, y no aparece en el filtro. El sitio no
valida contra una lista cerrada — el coste de un typo en Notion es una etiqueta
rara, no un build roto.

### Tiempo de lectura

En la ficha de novela, bajo el formato: `≈ 1 h 40 min de lectura`.

- Se calcula sumando el cuerpo (`entry.body`) de los capítulos **publicados** de
  esa novela y pasándolo por `readingTime` de `src/lib/reading.ts` (200 ppm), que
  ya existe y se reutiliza sin tocar.
- Los capítulos bloqueados no cuentan: su texto no está en el repo. Es correcto
  — lo que se anuncia es lo que hay para leer hoy.
- Formato de salida: `45 min` si es menos de una hora, `1 h 40 min` si pasa de
  una hora. Función nueva en `src/lib/format.ts`, con test.
- Novela sin capítulos publicados: no se muestra tiempo de lectura.

### Interfaz

- **Ficha de novela** (`src/pages/novela/[slug].astro`): línea con
  `Novela corta · nouvelle` y debajo el tiempo de lectura.
- **Tarjeta** (`src/components/NovelCard.astro`): el formato como etiqueta
  discreta en `.meta`, junto al estado. Sin él, el resultado del filtro no se
  vería.
- **Filtro** (`src/pages/buscar.astro`): fila de chips encima del campo de
  texto, uno por formato presente en el catálogo. Selección única, con opción de
  deseleccionar. Se combina con el texto en AND: chip `Novela` + escribir
  «fantasía» filtra por ambos.

Mecanismo: el mismo que ya usa `buscar.astro`. Cada tarjeta lleva un
`data-format` además del `data-search` existente, y el script de cliente
oculta/muestra. Sin dependencias nuevas, sin índice de búsqueda, sin cambiar la
arquitectura estática.

---

## Parte 2 — Calendario de publicaciones (`/calendario`)

### Problema

No hay forma de ver qué viene ni en qué orden. La saga agrupa por mundo
narrativo, que es otra cosa: no responde «¿qué sale después?».

### Modelo

- **Nueva BD en Notion: `Fases`**, con la misma forma que la de Sagas ya
  existente: `Nombre`, `Slug`, `Descripción`, `Orden`. Reutiliza literalmente la
  fontanería de `parseSaga` / `fetchSagas`.
- **En la BD de Novelas**: relación `Fase` (a la BD de Fases) y número
  `Orden en fase`.
- **Colección nueva** `phases` en `src/content/config.ts`, gemela de `sagas`:
  `slug`, `name`, `description`, `order`.
- **En `NovelData`**: `phase: string | null` (slug de la fase) y
  `phaseOrder: number | null`. `phase` se resuelve con `relationSlugs`, igual que
  `saga`.
- **Campo nuevo en Novelas**: `Ventana de lanzamiento` (texto) →
  `releaseWindow: string | null`.

Una fase sin historias no genera sección, misma regla que las sagas.

### Fecha mostrada

Por orden de preferencia:

1. Tiene capítulos publicados → la fecha del capítulo 1 (`publishedAt`),
   formateada como `enero 2026`.
2. Si no → el texto libre de `releaseWindow`, tal cual: `"Finales de 2027"`,
   `"Por anunciar"`.
3. Si no → no se muestra fecha.

Texto libre y no un campo de fecha a propósito: obliga a inventar un día exacto
para algo que aún no se sabe, y el sitio no necesita ordenar por ella.

### Orden

Dentro de cada fase manda `Orden en fase` (ascendente), no la fecha. Así una
historia sin fecha puede ir donde el autor quiera. Empate o `phaseOrder` nulo:
desempata el título, para que el orden sea estable entre builds.

Las fases se ordenan por su campo `Orden`.

### Historias anunciadas — el cambio de fondo

Hoy `fetchNovels` filtra por el check `Publicada`, así que una historia
anunciada sin capítulos nunca llegaría al repo.

**Decisión**: `Publicada` pasa a significar *visible en la web*. La pregunta
«¿se puede leer?» se deduce de un hecho que ya existe — tener o no capítulos —
en vez de un segundo check que habría que mantener sincronizado a mano. Un campo
menos y ninguna fuente de verdad duplicada.

Cuentan **los capítulos publicados y también los programados**. Una novela cuyo
calendario está entero por delante (todos sus capítulos en `lockedChapters`, aún
sin abrir) ya tiene una ficha legítima: la lista con sus cuentas atrás. Solo es
«anunciada» la que no tiene ningún capítulo en absoluto.

Consecuencia: hace falta un helper `getReadableNovels()` y filtrar por él en los
sitios donde hoy se asume que toda novela sincronizada es legible:

- `/novelas` (catálogo) — solo legibles.
- `/buscar` — solo legibles.
- `/biblioteca` — solo legibles.
- `/novela/[slug]` — `getStaticPaths` no genera página para las no legibles.
- Portada (`index.astro`), `/categoria/[slug]`, `/etiqueta/[slug]`, `/saga/[slug]` —
  solo legibles.
- Sitemap — se deriva de las páginas generadas, no necesita cambio.
- `/calendario` — **el único sitio que las muestra**, con distintivo
  `Próximamente` y sin enlace.

Sin este filtro, marcar `Publicada` una historia sin capítulos generaría una
ficha vacía y un clic muerto. Es la misma regla que ya se aplicó a las sagas
(«una saga sin novelas publicadas no genera página»).

### Interfaz

- Ruta `/calendario`, enlace en `Header.astro`.
- Una sección por fase: nombre, descripción, y sus historias en orden.
- Por historia: portada (`coverGradient` + `Emblem`, como `NovelCard`), título,
  fecha, y estado. Las legibles enlazan a su ficha; las de `Próximamente`, no.
- Astro estático, cero JavaScript. No hay nada interactivo que justifique lo
  contrario.
- Indexable (sin `noindex`): es contenido público de interés, al revés que
  `/buscar` y `/biblioteca`.

---

## Pruebas

Lógica pura en `src/lib`, testeada con Vitest como el resto del proyecto:

- `format.ts`: mapa de término culto (los cinco valores + uno desconocido),
  formateo de tiempo de lectura (< 1 h, > 1 h, minutos exactos, cero capítulos).
- `calendar.ts`: fecha mostrada (los tres casos de la cascada), orden dentro de
  fase (por `phaseOrder`, nulos al final, desempate por título), fase vacía.
- `transform.test.ts`: `parseNovel` con `Formato`, `Fase`, `Orden en fase` y
  `Ventana de lanzamiento`; y con esas propiedades ausentes → nulls.

Las plantillas `.astro` no se testean, igual que hoy.

## Fuera de alcance

- Calcular el formato contando palabras. Lo declara el autor.
- Cuenta atrás en el calendario. Ya existe `Countdown` para capítulos.
- Filtrar por formato en `/novelas`, categorías o sagas. Solo el buscador.
- Ficha propia para historias anunciadas. Solo el calendario.
- Feed/ICS del calendario.

## Entrega

Dos ramas, dos PRs, squash-merge:

1. `feat/formato-historia` — Parte 1.
2. `feat/calendario` — Parte 2.

Antes de mergear la Parte 2, la BD `Fases` debe existir en Notion, aunque esté
vacía: el sync la consulta por ID.
