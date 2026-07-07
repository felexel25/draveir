# Draveir Studio (app local) + emblemas de tarot — Diseño

**Fecha:** 2026-07-06
**Autor:** Félix Llerena (Draveir) + Claude

## Objetivo

Dos entregables independientes pero relacionados:

1. **Draveir Studio:** una app local (con acceso directo en el escritorio) que
   crea filas con metadatos en las tablas de Notion (Capítulos / Novelas) sin
   editarlas a mano. El usuario luego abre la página creada en Notion y pega el
   contenido. Además, un botón para disparar la publicación (sync) al instante.
2. **Emblemas de tarot:** reemplazar el set de emblemas actual por los 22
   arcanos mayores en el mismo estilo de línea. El Loco es el favicon del sitio,
   de la app y del acceso directo.

## Restricciones globales

- No se comparten los borradores del usuario con la integración de Notion. La
  app **solo crea** filas de metadatos; el contenido lo pega el usuario en Notion.
- La app es **local** (localhost), fuera de `web/` para que Cloudflare no la
  despliegue. Vive en `web/scripts/admin/` para reutilizar `node_modules` de
  `web/` (`@notionhq/client`, cargador de `.env`) — cero dependencias nuevas.
- Fechas programadas: siempre **19:00 hora Panamá** (`-05:00`), ver
  `release-schedule`.
- Sin cambios en el pipeline de sync existente.

## Parte 1 — Draveir Studio

### Arquitectura
Servidor Node mínimo con el módulo `http` de la stdlib (sin Express). Sirve una
sola página HTML y expone endpoints JSON. Lee `NOTION_TOKEN` del `.env` de `web/`.

### IDs de Notion (ya conocidos)
- Novelas DB: `c03f5b38-513f-4c0f-8f91-1b69cad31673`
- Capítulos DB: `4ac20247-41d9-46b7-b9ca-cae507c3eaf2`

### Propiedades (del schema real, ver `transform.ts`)
- **Capítulos:** `Título` (title), `Novela` (relation), `Número` (number),
  `Estado` (select: Publicado | Programado | Borrador), `Fecha de publicación` (date).
- **Novelas:** `Título`, `Slug` (opcional), `Sinopsis`, `Estado` (select),
  `Categorías` (multi_select), `Etiquetas` (multi_select), `Publicada` (checkbox),
  `Destacada` (checkbox).

### Endpoints
- `GET /` → página HTML con los dos formularios y el botón publicar.
- `GET /api/novels` → `[{id, title}]` leídos de la Novelas DB (para el desplegable).
- `POST /api/chapter` → body `{novelId, title, number, estado, fecha?}`.
  Crea la página en Capítulos DB. Si `estado==='Programado'`, exige `fecha` y la
  guarda como `<fecha>T19:00:00.000-05:00`. Responde `{url}` (URL de la página nueva).
- `POST /api/novel` → body `{title, synopsis, estado, categorias[], publicada,
  destacada}`. Crea la fila en Novelas DB. Responde `{url}`.
- `POST /api/publish` → ejecuta `gh workflow run "Sincronización programada"
  --repo felexel25/draveir`. Responde `{ok}` o error legible.

### UI (una página, estilo Draveir)
- Cabecera con el emblema de El Loco + "Draveir Studio".
- Tarjeta "Nuevo capítulo": desplegable Novela (de `/api/novels`), Título,
  Número, Estado (radio Publicado/Programado), Fecha (solo si Programado).
  Al crear: muestra enlace "Abrir en Notion" para pegar el contenido.
- Tarjeta "Nueva novela / historia corta": Título, Sinopsis, Estado, Categorías
  (checkboxes de la lista fija), Publicada, Destacada. Al crear: enlace a Notion.
- Botón "Publicar ahora" con confirmación del resultado.

### Errores
- Falta `NOTION_TOKEN` → mensaje claro al arrancar y en la UI.
- Notion 401/403 (falta permiso "Insertar contenido") → la UI explica el toggle
  a activar en la config de la integración.
- `gh` no encontrado para publicar → la UI dice cómo publicar manualmente
  (Actions → Run workflow).

### Empaque / acceso directo
- `web/scripts/admin/server.mjs` — servidor.
- `web/scripts/admin/index.html` — UI (o servida inline desde el .mjs).
- Un `.cmd` que arranca el server y abre el navegador.
- Script PowerShell (`setup-shortcut.ps1`) que crea el `.lnk` en el Escritorio
  apuntando al `.cmd`, con el `.ico` de El Loco.
- Verificación: `demo`/self-check del formateo de fecha (19:00 -05:00) y del
  armado del payload de propiedades de Notion, sin llamar a la API.

## Parte 2 — Emblemas de tarot (22 arcanos)

### Cambios
- `web/src/lib/emblem.ts`: `EMBLEMS` pasa a los 22 slugs de arcanos mayores.
  `pickEmblem` se mantiene igual (hash slug → carta).
- `web/src/components/Emblem.astro`: un caso SVG por arcano, mismo estilo de
  línea (viewBox 100×100, stroke currentColor, width 2, remates redondeados).
- Favicon: `web/public/favicon.svg` = El Loco. Referenciado en el layout base.
- `.ico` de El Loco para el acceso directo de la app.

### Los 22 arcanos (slug → carta)
`loco` (0 El Loco), `mago` (I), `sacerdotisa` (II), `emperatriz` (III),
`emperador` (IV), `hierofante` (V), `enamorados` (VI), `carro` (VII),
`fuerza` (VIII), `ermitano` (IX), `rueda` (X), `justicia` (XI), `colgado` (XII),
`muerte` (XIII), `templanza` (XIV), `diablo` (XV), `torre` (XVI),
`estrella` (XVII), `luna` (XVIII), `sol` (XIX), `juicio` (XX), `mundo` (XXI).

### Entrega por lotes
- **Lote 1:** El Loco (favicon + emblema) + 4 cartas → aprobar estilo.
- **Lote 2:** las 18 restantes.

## Fuera de alcance (YAGNI)
- Editar contenido de capítulos desde la app (se hace en Notion).
- Autenticación (la app es local, un solo usuario).
- Empaquetar como Electron u otra app nativa (basta Node + navegador).
