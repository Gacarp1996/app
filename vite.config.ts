// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Para control manual de actualizaciones
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      
      manifest: {
        name: 'TennisCoaching App',
        short_name: 'TennisCoach',
        description: 'Aplicación para gestión de academias de tenis',
        theme_color: '#10b981',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/#/', // Importante: con hash para HashRouter
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Importante para HashRouter
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/\.well-known/],
        
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hora
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/esm\.sh\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'esm-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
              }
            }
          },
          {
            urlPattern: /\.(js|css|png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
              }
            }
          }
        ],
        
        skipWaiting: false, // Control manual
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      
      devOptions: {
        enabled: true, // Para testing en dev
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});