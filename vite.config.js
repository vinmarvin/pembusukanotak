import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // The Phaser chunk alone is ~1.48 MB minified (~340 kB gzip) and cannot be split
    // further, so the warning limit sits just above it.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep the Phaser engine in its own file so browsers can cache it
        // separately from the game code, which changes more often.
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        }
      }
    }
  }
});
