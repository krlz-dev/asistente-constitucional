// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://econstitucional.vercel.app',
  // Pages are prerendered to static HTML; only the /api routes opt into
  // on-demand serverless rendering via `export const prerender = false`.
  output: 'static',
  adapter: vercel({
    // Ship the constitution data JSON alongside the serverless functions so
    // the /api endpoints can read them at runtime via fs.
    includeFiles: [
      './data/articulos_lista.json',
      './data/articulos_enhanced.json',
      './data/tematicas.json',
      './data/knowledge_base.json',
    ],
  }),
});
