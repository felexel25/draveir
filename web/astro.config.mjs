import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { HIDDEN_SLUGS } from './src/lib/hidden.ts';

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
