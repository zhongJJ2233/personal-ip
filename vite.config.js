import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs also work when the built site is served from a subpath.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
