import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// El sitemap se arma antes de que exista la API de contenido, así que las
// ocultas se leen directo de los JSON que dejó el sync.
const NOVELS_DIR = new URL('./src/content/novels/', import.meta.url);
const HIDDEN_SLUGS = readdirSync(NOVELS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, NOVELS_DIR), 'utf8')))
  .filter((n) => n.hidden)
  .map((n) => n.slug);

export default defineConfig({
  site: 'https://draveir.com',
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/biblioteca') &&
        !page.includes('/buscar') &&
        !page.includes('/invocacion') &&
        // Una historia oculta no se anuncia a los buscadores.
        !HIDDEN_SLUGS.some((slug) => page.includes(`/novela/${slug}`)),
    }),
  ],
});
