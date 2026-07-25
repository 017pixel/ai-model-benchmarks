import { defineConfig } from 'vite';

// BlockForge - Vite Konfiguration
// Der Dev-Server läuft auf Port 4000 (Vorgabe des Nutzers).
export default defineConfig({
  root: '.',
  server: {
    port: 4000,
    host: true,
    open: false,
  },
  preview: {
    port: 4000,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
