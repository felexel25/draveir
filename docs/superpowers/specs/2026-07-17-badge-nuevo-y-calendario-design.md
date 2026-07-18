# Badge "NUEVO" y arreglo del calendario

Fecha: 2026-07-17

## Problema

1. **Calendario:** una historia ya estrenada (o un relato de un solo capítulo,
   como `¿Qué preguntas?`) muestra su capítulo 1 como "próximo capítulo"
   ("Cap. 1 · hoy 7 PM"), redundante con la fecha de estreno. El capítulo 1 es
   el estreno, no un próximo capítulo.
2. **Novedad:** un capítulo recién publicado no se distingue de uno viejo. Solo
   el caso de desbloqueo entre builds muestra "Disponible" (texto plano) en la
   ficha de novela.

## Objetivo

- El calendario deja de tratar el capítulo 1 como "próximo capítulo".
- Los capítulos recién publicados llevan un badge **NUEVO** parpadeante,
  coherente con la paleta, en la ficha de novela, las tarjetas de novela y el
  calendario.

## Decisiones

- **Qué es nuevo:** publicado hace menos de **3 días** (global, no por lector).
- **Color:** `--brass` (dorado de sigilos y fases).
- **Parpadeo:** opacidad suave, apagado bajo `prefers-reduced-motion`.

## Piezas

### Pieza 1 — Calendario: capítulo 1 = estreno, no "próximo" (build)

En `web/src/pages/calendario.astro`, el mapa `nextChapter` solo considera
capítulos con `number > 1`. El capítulo 1 ya está representado por
`story.date` (fecha de estreno vía `releaseLabel`).

- Efecto en relatos de un capítulo / estrenos: desaparece la línea de "próximo
  capítulo".
- Efecto en multi-capítulo: sigue mostrando el próximo capítulo real.
- Correcto desde el primer deploy; no espera al sync.

Fuera de alcance: el cambio de "Próximamente" → estado real de una historia que
estrena entre builds sigue esperando al sync de Notion (hasta 6 h). No se
resuelve en vivo en esta iteración.

### Pieza 2 — Helper de frescura (build)

`web/src/lib/fresh.ts`:

```ts
// Un capítulo es "nuevo" si se publicó hace menos de N días.
export function isFresh(publishedAt: string, now: Date, days = 3): boolean
```

- Parsea `publishedAt` (ISO). Si no parsea, devuelve `false` (nunca miente).
- `now` se inyecta para poder testear.
- Test en `web/src/lib/fresh.test.ts`: dentro de ventana, fuera de ventana,
  fecha inválida, borde exacto.

### Pieza 3 — Badge NUEVO en la UI

Componente/estilo compartido para el pill (marca + `aria-label`), reutilizado en:

- **Ficha de novela** (`novela/[slug].astro`): pill junto al título de cada
  capítulo publicado fresco (build). Se calcula `isFresh` por capítulo con la
  fecha de build.
- **Tarjetas de novela** (`NovelCard.astro`): pill en la card si la novela tiene
  algún capítulo fresco. La página que renderiza la card pasa la prop `isNew`
  (biblioteca, home, y donde se use `NovelCard`).
- **Calendario** (`calendario.astro`): marca NUEVO en la entrada de la historia
  con capítulo fresco (build).

**En vivo** (JS, reusa el bucle de `novela/[slug].astro`): el capítulo que se
desbloquea entre builds ya no pone el texto "Disponible" sino el badge NUEVO.
Es el único caso que debe ser en vivo, porque el estreno ocurre entre builds.

### Estética del pill

- Fondo `--brass` tenue o borde `--brass`, texto en caja alta, interletrado de
  la casa (`letter-spacing`), fuente sans.
- `@keyframes` de opacidad (~1.4s ease-in-out infinito), solo bajo
  `@media (prefers-reduced-motion: no-preference)`.

## Testing

- `fresh.test.ts` cubre la lógica de ventana.
- El arreglo del calendario (`number > 1`) es un filtro trivial inline; se
  verifica visualmente en `/calendario` (`¿Qué preguntas?` sin línea de próximo).
- Verificación visual final con `npm run build` + revisar las tres superficies.

## Fuera de alcance (posibles siguientes)

- Novedad por-lector (no leído) usando estado local.
- Cuenta atrás en la tarjeta del calendario.
- Sección "Recién salido" en la home / RSS.
