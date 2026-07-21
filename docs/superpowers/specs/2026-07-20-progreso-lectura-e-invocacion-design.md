# Progreso de lectura, historias ocultas e invocación

Fecha: 2026-07-20

Tres ítems de feedback del usuario, en orden de tamaño creciente. Comparten una
base: el estado de lectura que ya vive en `localStorage` bajo `draveir-reader`
(`src/lib/reader.ts`).

## 1. Marcar capítulos leídos

**Qué se ve.** En la lista de capítulos de `/novela/[slug]`, cada capítulo leído
lleva un `✓ Leído` en lugar de su tiempo estimado y el título va atenuado. Junto
al encabezado "Capítulos", un contador `5 / 14 leídos`.

**Criterio de leído.** `positions["<novela>/<capitulo>"] >= 0.9`. Ese campo ya se
guarda al hacer scroll; no se añade estado nuevo.

**Caso borde.** Un capítulo que cabe en una pantalla nunca genera scroll, así que
su fracción se queda en 0 y jamás se marcaría. En `[capitulo].astro`, si al abrir
no hay scroll posible (`scrollMax() <= 1`), se guarda posición 1.

**Dónde.** El script cliente que ya existe al final de `novela/[slug].astro`
(el que reescribe "Comenzar a leer" → "Seguir leyendo") ya lee `parseState`;
ahí mismo se pinta. Sin JavaScript no se marca nada, que es correcto: el dato
es del navegador.

## 2. Historias ocultas

**Alcance real.** El sitio es estático: el HTML de una historia oculta está
publicado y es legible por cualquiera con la URL. Esto es ocultamiento de
descubrimiento, no un candado. El candado de verdad (por fecha, en `functions/`)
sigue siendo otra cosa y no se toca.

**Qué se implementa.** Campo opcional `hidden: true` en el JSON de la novela.
Una novela oculta:

- no aparece en `/historias`, `/biblioteca`, la home, ni en las páginas de
  taxonomía (categoría, etiqueta, formato, estado, saga);
- no entra en el sitemap;
- su página `/novela/[slug]` se sigue generando y funciona;
- aparece en `/buscar` sólo cuando la consulta coincide con su título (no por
  coincidencia parcial de una letra: se exige que la consulta normalizada esté
  contenida en el título normalizado y mida al menos 4 caracteres).

**Descartado.** Desbloqueo condicional por "leíste N historias". Se salta con
F12, y añade lógica para sostener una ilusión que se rompe sola.

## 3. Invocación (gacha)

Homenaje a la invocación de Fate/Grand Order, con arte propio. No se copia
ningún asset ni audio del juego: la carta es un arcano de `src/lib/emblem.ts`,
que ya son 22 SVG inline.

**Ruta.** `/invocacion`, disponible todo el año.

**Qué sale.** Una historia del catálogo. La carta se voltea y detrás está la
novela, con enlace para leerla.

**Historias ocultas como recompensa.** El pool incluye las ocultas del ítem 2.
Si quedan ocultas sin descubrir, cada tirada tiene un 8% de venir de ese pool;
si no, sale una visible. Sacar una oculta:

- siempre es 5★ (anillo arcoíris), sin importar su formato;
- la marca como descubierta en el estado del lector (`discovered: string[]`);
- la hace aparecer en una pestaña "Descubiertas" de `/biblioteca`, junto a
  Continuar / Favoritos / Historial.

Los listados estáticos no cambian tras el descubrimiento: reinyectarlas por JS
en cada página sería mucho código para poco. La biblioteca es donde el lector ya
va a ver lo suyo.

Honestidad sobre el secreto: los títulos de las ocultas viajan en el JS de
`/invocacion`, así que quien abra el bundle las ve. Sigue siendo un easter egg,
no un candado — igual que el resto del ítem 2.

**Rareza.** Derivada del campo `formato` que ya existe:

| Formato                    | Rareza |
| -------------------------- | ------ |
| Microrrelato, Relato       | 3★     |
| Relato largo, Novela corta | 4★     |
| Novela                     | 5★     |
| (oculta, cualquier formato)| 5★     |

**Secuencia de la animación.** Cuatro fases en CSS `@keyframes`, sin librerías:

1. Círculo de invocación que gira y se cierra.
2. Anillo que se expande, coloreado por la rareza que va a salir: bronce (3★),
   dorado (4★), arcoíris (5★).
3. La carta cae boca abajo y se voltea con `transform: rotateY(180deg)`.
4. Reverso: arcano, título, formato y botón "Leer ahora".

**Interacción.** Un botón "Invocar" (tira simple) y otro "Invocar ×10". Sin
moneda ni límite: no hay nada que monetizar y un contador sólo daría fricción.
`prefers-reduced-motion` salta directo a la fase 4.

**Sin JavaScript.** La página muestra el enlace a `/historias`. No hay
invocación que hacer sin cliente.

## Verificación

Lo que se prueba con Vitest, en la lógica pura (nada de DOM):

- `isRead(state, key)` con posición 0, 0.89, 0.9 y 1.
- Conteo de leídos sobre una lista de capítulos.
- Filtro de ocultas: excluidas de listados, incluidas en búsqueda por título
  exacto, excluidas en consulta corta.
- Mapa formato → rareza, incluido un formato desconocido (cae en 3★).
- `pick()` del gacha con un aleatorio inyectado: devuelve oculta bajo el umbral,
  visible por encima, y visible siempre que no queden ocultas por descubrir.
- `discover()`: añade sin duplicar y sobrevive a un estado viejo sin el campo.

La animación no se prueba automáticamente; se revisa a ojo.
