import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      
      // Web App Manifest
      manifest: {
        name: 'TennisCoaching App',
        short_name: 'TennisCoach',
        description: 'Aplicación para gestión de academias de tenis',
        theme_color: '#10b981', // green-500 de tu tema
        background_color: '#000000', // negro de tu tema oscuro
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        
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
            purpose: 'any maskable'
          }
        ]
      },
      
      // Configuración del Service Worker
      workbox: {
        // Archivos a pre-cachear (críticos para funcionamiento)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Estrategias de cache por tipo de recurso
        runtimeCaching: [
          // Documentos HTML
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.html'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
              }
            }
          },
          
          // API de Firebase/Firestore
          {
            urlPattern: ({ url }) => url.hostname.includes('firestore.googleapis.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hora
              }
            }
          },
          
          // Assets estáticos (JS, CSS, imágenes)
          {
            urlPattern: ({ request }) => 
              request.destination === 'script' || 
              request.destination === 'style' ||
              request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          }
        ],
        
        // Configuraciones adicionales
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        
        // Tamaño máximo del cache (importante para tus SLOs de costo)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB max por archivo
      },
      
      // Configuración de desarrollo
      devOptions: {
        enabled: false, // Solo en producción por defecto
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