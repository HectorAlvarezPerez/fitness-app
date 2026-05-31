import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'Fitness App',
          short_name: 'Fitness',
          description: 'Workout tracker',
          lang: 'es',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Custom push + notificationclick handlers for rest-timer notifications.
          importScripts: ['push-sw.js'],
          // Precache only hashed static assets (their names change every build, so
          // cache-first never goes stale). The HTML is intentionally NOT precached.
          globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Serve navigations network-first: online users always get the fresh
          // index (so a deploy never strands them on a stale shell pointing at
          // deleted chunks); offline falls back to the last cached HTML.
          runtimeCaching: [
            {
              urlPattern: ({ request }: any) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-shell',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 4 },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
            ui: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'recharts'],
          },
        },
      },
    },
  };
});
