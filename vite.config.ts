import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'manifest.webmanifest'],
      manifest: {
        name: 'Zenith Atlas Institutional Terminal',
        short_name: 'ZenithAtlas',
        description: 'Kurumsal Seviye TEFAS Fon Analitiği & Çoklu Portföy Yönetim Platformu',
        theme_color: '#0A0E17',
        background_color: '#0A0E17',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['chart.js', 'lucide-react'],
          'vendor-qr': ['qrcode']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    open: true,
    proxy: {
      '/api/tefas': {
        target: 'https://www.tefas.gov.tr',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/tefas/, '/api/DB/BindHistoryInfo')
      }
    }
  }
});

