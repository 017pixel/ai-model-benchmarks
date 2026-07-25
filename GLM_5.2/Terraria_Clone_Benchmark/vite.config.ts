import { defineConfig } from 'vite';

// Vite config: dev server pinned to port 4000 as required.
export default defineConfig({
  server: {
    port: 4000,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 4000,
    host: true,
    strictPort: true,
  },
});
