# Slice 5 — Bloqueo real de capítulos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Un capítulo con fecha futura no viaja al bundle ni al repo; muestra cuenta regresiva y se abre solo al llegar la fecha. El texto vive en Cloudflare KV y lo sirve una Pages Function solo tras la fecha, con marca de agua por sesión y rate limiting básico.

**Architecture:** El sync clasifica capítulos en **desbloqueados** (Publicado, o Programado con fecha ≤ ahora) → estáticos como hoy; y **bloqueados** (Programado con fecha > ahora) → su metadato genera una página placeholder con cuenta regresiva y su TEXTO se sube a KV. Una **Pages Function** en `/api/chapter/<novela>/<slug>` lee KV, compara fecha y responde 423 (bloqueado) o 200 (texto + marca de agua), con rate limiting por IP. La lógica pura (`isUnlocked`, `formatCountdown`) se comparte y se prueba.

**Tech Stack:** Astro content collections, Cloudflare Pages Functions + KV, Wrangler (deploy/KV), Vitest.

## Global Constraints
- El texto bloqueado NUNCA en el repo ni en `dist/`. Solo en KV.
- Mismo origen (`/api/...` vía Pages Functions) → sin CORS.
- Fechas en UTC; el servidor (Function) es la autoridad temporal.
- Progresivo dentro de lo posible: sin JS, la página bloqueada muestra la fecha de desbloqueo (el texto requiere fetch).
- Correr `npm run sync` antes de build. Secreto CF para subir KV en CI.

---

### Task 1: Lógica pura de desbloqueo (`unlock.ts`) + TDD
**Files:** Create `web/src/lib/unlock.ts`, `web/src/lib/unlock.test.ts`

- `isUnlocked(unlocksAt: string, now: number): boolean` — true si `now >= Date.parse(unlocksAt)`.
- `formatCountdown(ms: number): string` — "3d 04h 12m 09s" (0 si negativo).

```ts
export function isUnlocked(unlocksAt: string, now: number): boolean {
  const t = Date.parse(unlocksAt);
  return Number.isNaN(t) ? true : now >= t;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d}d ${p(h)}h ${p(m)}m ${p(sec)}s`;
}
```
Tests: unlocked before/after/invalid; formatCountdown of known values and negative → `0d 00h 00m 00s`.

---

### Task 2: Sync — clasificar y separar bloqueados
**Files:** Modify `web/scripts/notion-sync/types.ts`, `notion.ts`, `writeContent.ts`, `index.ts`

- `ChapterData` gana `unlocked: boolean` y `estado: string`.
- `notion.ts`: consultar capítulos con Estado en {Publicado, Programado} (`or` de dos filtros). Para cada uno, `unlocked = estado === 'Publicado' || isUnlocked(publishedAt, Date.now())`. Devolver todos con su body.
- `writeContent.ts`:
  - novels → `content/novels/*.json` (igual)
  - capítulos `unlocked` → `content/chapters/*.md` (igual)
  - capítulos bloqueados → `content/lockedChapters/<novel>--<slug>.json` = `{ novelSlug, number, title, chapterSlug, unlocksAt }` (SIN body)
  - además, escribir `.kv-bulk.json` (ignorado por git) = `[{ key: "<novel>/<slug>", value: JSON.stringify({ unlocksAt, body }) }]`
- `index.ts`: separar y llamar a writeContent con ambas listas; loguear conteos.

`.gitignore`: añadir `web/.kv-bulk.json`.

---

### Task 3: Colección `lockedChapters` + página de capítulo bloqueado
**Files:** Modify `web/src/content/config.ts`, `web/src/pages/novela/[slug]/[capitulo].astro`; Create `web/src/components/Countdown.astro`

- `config.ts`: colección `lockedChapters` (type 'data') con `{ novelSlug, number, title, chapterSlug, unlocksAt }`.
- `[capitulo].astro`: `getStaticPaths` = publicados (props kind='published', entry) + bloqueados (props kind='locked', meta). Render:
  - published → como hoy (Content + ChapterNav + progreso).
  - locked → `<Countdown>` + contenedor donde el script inyecta el texto al desbloquear.
- `Countdown.astro`: muestra `unlocksAt` legible + cuenta regresiva (script actualiza cada segundo con `formatCountdown`); al llegar a 0 (o si ya pasó) hace `fetch('/api/chapter/<novela>/<slug>')` y renderiza el texto; maneja 423 (sigue esperando) y errores.

### Task 4: Pages Function de bloqueo
**Files:** Create `web/functions/api/chapter/[novela]/[capitulo].ts`

- `onRequestGet({ params, env, request })`:
  - clave `${params.novela}/${params.capitulo}`, `env.LOCKED_CHAPTERS.get(key)`.
  - si no existe → 404.
  - parse `{ unlocksAt, body }`. Si `!isUnlocked(unlocksAt, Date.now())` → 423 `{ unlocksAt }`.
  - rate limit básico por IP (contador en KV con TTL) → 429 si excede.
  - si desbloqueado → 200 con el body envuelto + **marca de agua por sesión** (comentario invisible con un id aleatorio + timestamp) y cabeceras `Cache-Control: private, no-store`.
- `isUnlocked` se copia inline (las Functions no comparten el bundle de `src`).

### Task 5: Config Wrangler + scripts + CI
**Files:** Create `web/wrangler.toml`; Modify `web/package.json`, `.github/workflows/ci.yml`; Create `web/.dev.vars.example`

- `wrangler.toml`: nombre, `pages_build_output_dir = "dist"`, binding KV `LOCKED_CHAPTERS` (namespace id se rellena tras crearlo).
- `package.json`: script `kv:put` = `wrangler kv bulk put --binding=LOCKED_CHAPTERS .kv-bulk.json` (o por namespace-id).
- CI: tras `sync`, subir KV con `wrangler` usando secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (solo si existe `.kv-bulk.json`).

---

## Pasos manuales del autor (Cloudflare) — se coordinan aparte
1. Crear KV namespace `draveir-locked` (por dashboard o `wrangler kv namespace create`).
2. Pages → proyecto draveir → Settings → Functions → **KV bindings**: `LOCKED_CHAPTERS` → ese namespace.
3. Crear API token (permiso Workers KV Storage + Pages) → secretos `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` en GitHub.
4. Poner el namespace id en `wrangler.toml`.

## Self-Review
- Bloqueo real ✓ (texto solo en KV, Task 2+4), cuenta regresiva ✓ (Task 3), apertura automática por fecha ✓ (Function evalúa fecha viva), rate limit + marca de agua ✓ (Task 4).
- Lógica pura (`isUnlocked`, `formatCountdown`) testeada; Function y build validados estructuralmente (E2E real necesita el KV del autor).
- Fuera de alcance: re-promoción a estático por cron tras la fecha (mejora SEO; el Function ya sirve en vivo) → Slice 5.1.
