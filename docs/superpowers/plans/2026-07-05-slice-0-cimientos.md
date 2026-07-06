# Slice 0 — Cimientos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar en línea un sitio Astro mínimo (landing + layout base) desplegado en Cloudflare Pages, con CI que valida tipos y build en cada PR.

**Architecture:** Monorepo simple. El frontend vive en `/web` (Astro + TypeScript strict). CI en GitHub Actions valida `astro check` + `astro build`. El despliegue se hace conectando Cloudflare Pages al repo de GitHub (build en la nube de Cloudflare, cero código de deploy). No hay workspaces npm todavía: se añadirán cuando exista un segundo paquete (`/worker`, `/scripts`).

**Tech Stack:** Astro 4+, TypeScript, GitHub Actions, Cloudflare Pages.

## Global Constraints

- **Idioma:** todo el contenido de cara al lector en español; sin i18n.
- **Costo:** solo planes gratuitos (GitHub + Cloudflare). Sin dominio: subdominio `*.pages.dev`.
- **Rendimiento:** cero JavaScript en páginas por defecto (Astro islands solo donde haga falta; en Slice 0 no hace falta ninguno).
- **Node:** 20 LTS (fijado en CI y en `.nvmrc`).
- **Autoría git:** `user.name = "Félix Llerena"`, `user.email = "felixc2501@gmail.com"` (ya configurado en el repo local).
- **Verificación de Slice 0:** el "test" de esta rebanada es `astro check` limpio + `astro build` exitoso + sitio accesible en la URL `pages.dev`. No hay lógica no trivial que amerite pruebas unitarias todavía (se añaden en slices con lógica: fechas, gating, estado local).

---

### Task 1: Scaffold del proyecto Astro en `/web`

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/astro.config.mjs`
- Create: `web/.nvmrc`
- Create: `web/src/layouts/BaseLayout.astro`
- Create: `web/src/pages/index.astro`
- Create: `web/src/styles/global.css`
- Create: `web/public/favicon.svg`

**Interfaces:**
- Produces: proyecto Astro construible con `npm run build` desde `/web`; layout `BaseLayout.astro` que acepta prop `title: string` y un `<slot />`.

- [ ] **Step 1: Crear `web/package.json`**

```json
{
  "name": "draveir-web",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^4.15.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Crear `web/tsconfig.json` (strict)**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Crear `web/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

// ponytail: config mínima. Se añade sitemap/integraciones en Slice 6.
export default defineConfig({
  site: 'https://draveir.pages.dev',
});
```

- [ ] **Step 4: Crear `web/.nvmrc`**

```
20
```

- [ ] **Step 5: Crear `web/src/styles/global.css`**

```css
:root {
  --color-bg: #ffffff;
  --color-fg: #1a1a1a;
  --measure: 65ch;
  --font-body: Georgia, 'Times New Roman', serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #14151a;
    --color-fg: #e8e8ea;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-body);
  line-height: 1.7;
}

.container {
  max-width: var(--measure);
  margin-inline: auto;
  padding: 2rem 1.25rem;
}
```

- [ ] **Step 6: Crear `web/src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 7: Crear `web/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Draveir — Novelas">
  <main class="container">
    <h1>Draveir</h1>
    <p>Una plataforma de lectura en construcción. Pronto, historias que valdrá la pena esperar.</p>
  </main>
</BaseLayout>
```

- [ ] **Step 8: Crear `web/public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#14151a"/><text x="16" y="22" font-family="Georgia, serif" font-size="18" fill="#e8e8ea" text-anchor="middle">D</text></svg>
```

- [ ] **Step 9: Instalar dependencias y verificar build**

Run desde `web/`:
```bash
cd web && npm install && npm run check && npm run build
```
Expected: `astro check` reporta `0 errors`; `astro build` termina con `Complete!` y genera `web/dist/index.html`.

- [ ] **Step 10: Commit**

```bash
git add web/ .gitignore
git commit -m "feat(web): scaffold Astro project with base layout and landing page"
```

---

### Task 2: CI en GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts `check` y `build` de `web/package.json` (Task 1).
- Produces: workflow que corre en cada push y PR y falla si `astro check` o `astro build` fallan.

- [ ] **Step 1: Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run check
      - run: npm run build
```

- [ ] **Step 2: Verificar que existe `web/package-lock.json`**

Run:
```bash
test -f web/package-lock.json && echo "OK lockfile" || echo "FALTA lockfile"
```
Expected: `OK lockfile`. (Se generó en Task 1 Step 9. Si falta, corre `cd web && npm install`.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add typecheck and build workflow"
```

---

### Task 3: Publicar el repo y desplegar en Cloudflare Pages

> Esta tarea incluye pasos **manuales del autor** en cuentas externas (GitHub, Cloudflare). El agente prepara el README y verifica; el autor ejecuta los pasos de cuenta y aprueba. No se automatiza el acceso a cuentas externas.

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: build de `/web` (Task 1) y CI verde (Task 2).
- Produces: sitio en vivo en `https://draveir.pages.dev` (o el subdominio que asigne Cloudflare).

- [ ] **Step 1: Crear `README.md`**

```markdown
# Draveir

Plataforma de lectura para las novelas de Félix Llerena. El autor escribe en
Notion; el sitio se sincroniza y despliega solo.

## Estructura
- `web/` — frontend (Astro).
- `docs/superpowers/` — spec de diseño y planes.

## Desarrollo local
```bash
cd web
npm install
npm run dev
```

## Despliegue
Cloudflare Pages está conectado a este repo. Cada push a `main` reconstruye y
publica automáticamente el sitio.

- **Framework preset:** Astro
- **Root directory:** `web`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
```

- [ ] **Step 2: (Autor) Crear el repositorio en GitHub y subir**

El autor ejecuta en su sesión (login interactivo si hace falta con `gh auth login`):
```bash
gh repo create draveir --public --source=. --remote=origin --push
```
Expected: el repo aparece en GitHub con las ramas y commits.

- [ ] **Step 3: (Autor) Conectar Cloudflare Pages al repo**

En el dashboard de Cloudflare → Workers & Pages → Create → Pages → Connect to Git → seleccionar `draveir`. Configurar:
- Root directory: `web`
- Build command: `npm run build`
- Output directory: `dist`

Guardar y desplegar.

- [ ] **Step 4: (Autor) Proteger `main`**

En GitHub → Settings → Branches → Add rule para `main`: requerir PR y check de CI verde antes de merge.

- [ ] **Step 5: Verificar el sitio en vivo**

Run:
```bash
curl -sSf https://draveir.pages.dev | grep -q "Draveir" && echo "SITIO VIVO" || echo "REVISAR DEPLOY"
```
Expected: `SITIO VIVO`. (Sustituir la URL por la que asigne Cloudflare si difiere.)

- [ ] **Step 6: Commit del README**

```bash
git add README.md
git commit -m "docs: add project README with dev and deploy instructions"
```

---

## Self-Review

**Cobertura del spec (Slice 0 = §12 rebanada 0):** repo ✓ (Task 3), estructura monorepo `/web` ✓ (Task 1), CI ✓ (Task 2), Astro base ✓ (Task 1), deploy Cloudflare Pages ✓ (Task 3). El resto del spec (sync Notion, lectura, gating, etc.) pertenece a slices posteriores y está fuera de alcance aquí, por diseño.

**Placeholders:** ninguno; todo el contenido de archivos está completo.

**Consistencia de tipos:** `BaseLayout.astro` define `Props { title: string }` y `index.astro` lo consume con `title`. Scripts `check`/`build` referenciados en CI coinciden con los definidos en `package.json`.

**Nota de pruebas (ponytail):** Slice 0 no tiene lógica no trivial; la verificación es build/check/sitio-vivo. Las pruebas unitarias entran en slices con lógica real (fechas de desbloqueo, gating del Worker, estado local del lector).
