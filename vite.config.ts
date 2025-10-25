import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Code-splitting: Separar vendor chunks automaticamente
    // Melhora cache do navegador - vendors mudam menos frequentemente que código da aplicação
    splitVendorChunkPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'Gestão Scouter - TabuladorMax',
        short_name: 'Gestão Scouter',
        description: 'Sistema de Gestão de Leads e Scouters com Análise Tinder',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: /\/scouter\/analise/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'analise-leads',
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/modules": path.resolve(__dirname, "./src/modules"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Code-splitting manual para otimizar carregamento
         * Estratégia:
         * - react-core: React e ReactDOM (usados em toda aplicação)
         * - ui-components: Componentes Radix UI (usados extensivamente)
         * - charts: Bibliotecas de gráficos (pesadas, usadas em dashboards)
         * - maps: Bibliotecas de mapas (pesadas, usadas em módulo de área)
         * - utils: Bibliotecas utilitárias menores
         * 
         * Benefícios:
         * - Chunks menores e mais cacheáveis
         * - Carregamento paralelo otimizado
         * - Melhor performance em atualizações (só recarrega chunks modificados)
         */
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          
          // UI component library (Radix UI + shadcn)
          if (id.includes('@radix-ui')) {
            return 'ui-components';
          }
          
          // Chart libraries (heavy dependencies)
          if (id.includes('apexcharts') || id.includes('recharts') || id.includes('react-apexcharts')) {
            return 'charts';
          }
          
          // Map libraries (heavy dependencies)
          if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@turf')) {
            return 'maps';
          }
          
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms';
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          
          // Other heavy libraries
          if (id.includes('jspdf') || id.includes('date-fns')) {
            return 'utils';
          }
        }
      }
    },
    // Aumentar limite de warning para chunks grandes (mapas e gráficos são pesados)
    chunkSizeWarningLimit: 1000,
  }
}));
