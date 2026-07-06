import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://draveir.pages.dev',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/biblioteca') && !page.includes('/buscar'),
    }),
  ],
});
