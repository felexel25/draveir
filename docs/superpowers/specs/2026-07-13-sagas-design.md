# Sagas — diseño

Fecha: 2026-07-13

## Problema

Las novelas de Draveir transcurren en un universo compartido. Un lector que
termina una historia y le gusta no tiene forma de descubrir las hermanas: las
categorías y etiquetas agrupan por tema, no por mundo.

El universo entero no sirve como agrupador — si todas las novelas están en él,
no discrimina nada. La unidad útil es la **saga**: el arco concreto dentro del
universo, con su propio orden de lectura.

## Modelo

Una novela pertenece **a una sola saga**, en una posición concreta. Los cruces
entre historias de sagas distintas (un personaje que se asoma, un evento que se
menciona) son una relación **aparte**: pertenencia y conexión son cosas
distintas, y meterlas en el mismo campo obligaría a una tabla intermedia
`novela × saga × orden` que hay que mantener a mano en cada publicación.

Las novelas pueden no tener saga. El sitio debe seguir funcionando sin ella
(hoy `el-heraldo-gris` no tiene ninguna).

La saga no se replica en los capítulos: un capítulo pertenece a una novela, y la
novela a una saga. Duplicar el campo solo crea dos sitios donde equivocarse al
rellenar Notion.

### Notion

Base nueva **`Sagas`**:

| Propiedad     | Tipo      | Notas                                        |
|---------------|-----------|----------------------------------------------|
| `Nombre`      | title     |                                              |
| `Slug`        | rich_text | vacío ⇒ se deriva del nombre, como en novelas |
| `Descripción` | rich_text | el texto del mundo; es lo que justifica la página |
| `Orden`       | number    | ordena las sagas entre sí                    |

Base **`Novelas`**, tres propiedades nuevas:

| Propiedad        | Tipo                       | Notas                                  |
|------------------|----------------------------|----------------------------------------|
| `Saga`           | relation → `Sagas`         | limitada a 1 en Notion                 |
| `Orden en saga`  | number                     | posición de lectura (1, 2, 3…)         |
| `Relacionadas`   | relation → `Novelas`       | cruces con otras historias             |

### Contenido de Astro

Colección nueva `sagas` (`type: 'data'`):

```ts
z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  order: z.number(),
})
```

`novels` gana tres campos **opcionales** — las novelas sin saga siguen validando:

```ts
saga: z.string().nullable().default(null),        // slug de la saga
sagaOrder: z.number().nullable().default(null),
related: z.array(z.string()).default([]),         // slugs de novelas
```

## Sync

`parseSaga(page)` en `transform.ts`, en la línea de `parseNovel`: mismo
`plainText` y mismo `slugify` de fallback.

`parseNovel` resuelve `Saga` y `Relacionadas` como ya resuelve la relación
`Novela` de los capítulos: con un `Map<notionId, slug>`. Necesita dos mapas,
uno de sagas y uno de novelas. Las relaciones que apunten a una página no
publicada se descartan (`Map.get` devuelve `undefined` ⇒ se filtra), igual que
hoy un capítulo sin novela devuelve `null`.

**`Relacionadas` se simetriza en el sync.** Notion no lo hace por defecto; si A
declara el cruce con B y B no declara nada, el lector nunca vería el enlace
desde B. Tras parsear todas las novelas, se cierra el grafo en ambos sentidos.
Es un `for` sobre las novelas ya parseadas, no una llamada extra a la API.

`writeContent` escribe `src/content/sagas/<slug>.json` además de lo que ya
escribe.

## Lectura

**Ficha de novela** (`/novela/[slug].astro`): línea bajo el título —
*«2ª de 4 · Saga El Ciclo de la Niebla»*, enlazada a `/saga/<slug>`. No se
renderiza si la novela no tiene saga.

**Final del último capítulo disponible** (`/novela/[slug]/[capitulo].astro`):
bloque tras el artículo, antes del `ChapterNav` inferior. Solo en capítulos
**publicados**: los bloqueados renderizan el `Countdown`, no hay texto que
rematar. «Último disponible» = el capítulo **publicado** de número más alto de
esa novela, aunque exista uno bloqueado por encima — ese es justo el caso
«alcanzaste al autor».

Este bloque es el punto de descubrimiento real: el lector acaba de quedarse sin
nada que leer. Puede ser porque terminó la historia o porque alcanzó al autor
(novela «En progreso»), y el texto debe ser honesto en ambos casos:
**«Sigue leyendo en este mundo»**, nunca «has terminado la saga».

Contenido del bloque: las otras novelas de la saga por `sagaOrder` (destacando
la siguiente) y, si las hay, las `related`. No se renderiza si la novela no
tiene saga ni relacionadas.

**`/saga/[slug].astro`**: descripción del mundo + novelas en orden de lectura.
Mismo patrón que `/etiqueta/[slug].astro`, reutilizando `NovelCard`.

**Sin índice `/sagas`.** Con una saga sería una página que lista un elemento. Se
añade cuando existan tres.

## Verificación

Tests unitarios, en la línea de los que ya hay (`transform.test.ts`, `taxonomy.test.ts`):

- `parseSaga` con fixture de Notion: nombre, slug derivado y slug explícito.
- `parseNovel`: resuelve el slug de la saga por su id; descarta relaciones a
  páginas no publicadas; novela sin saga ⇒ `saga: null`, `related: []`.
- Simetrización: A→B produce también B→A; no se duplica si ambos ya lo declaran;
  una novela no se relaciona consigo misma.
- Orden de lectura: dada una saga, las novelas salen por `sagaOrder`, y las que
  no tienen orden no rompen la ordenación.

Comprobación end-to-end: `npm run sync` contra Notion y `npm run build`, con al
menos una novela con saga y una sin — la segunda es la que verifica que los
campos opcionales no rompieron nada.

## Fuera de alcance

- Novelas en varias sagas (tabla intermedia). Si algún día un crossover es de
  verdad 50/50, nada de lo diseñado aquí se tira: se añade la intermedia y
  `sagaOrder` se muda a ella.
- Índice `/sagas`.
- Carátula o emblema propio de la saga.
- Saga en capítulos.
