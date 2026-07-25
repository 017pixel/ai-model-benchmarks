import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 4001,
    strictPort: false,
    host: true,
    open: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false
  }
});
