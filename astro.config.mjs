// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';  // ← ADD THIS LINE

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },         // or 'server' if you want full SSR
  adapter: node({ mode: 'standalone' }), // now works
});