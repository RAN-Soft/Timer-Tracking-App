import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../time_tracking_app/public/time_tracking_app',
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        entryFileNames: `app.js`,
        chunkFileNames: `chunk-[name].js`,
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.css')) {
            return 'app.css';
          }
          return asset.name || 'asset';
        }
      }
    }
  },
  base: '/assets/time_tracking_app/time_tracking_app/',
});
