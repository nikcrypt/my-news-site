// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';  // ← ADD THIS LINE
import react from '@astrojs/react';

export default defineConfig({
    integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },         // or 'server' if you want full SSR
  adapter: node({ mode: 'standalone' }), // now works
});