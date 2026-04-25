import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiTarget = (env.VITE_API_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 650,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }

              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('/scheduler/') ||
                id.includes('/use-sync-external-store/')
              ) {
                return 'vendor-react';
              }

              if (id.includes('react-router')) {
                return 'vendor-router';
              }

              if (id.includes('recharts') || id.includes('/d3-')) {
                return 'vendor-charts';
              }

              if (id.includes('react-barcode')) {
                return 'vendor-barcode';
              }

              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }

              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }

              if (id.includes('react-icons') || id.includes('lucide-react')) {
                return 'vendor-icons';
              }

              if (id.includes('dexie')) {
                return 'vendor-dexie';
              }

              if (id.includes('date-fns')) {
                return 'vendor-date';
              }

              if (id.includes('clsx')) {
                return 'vendor-utils';
              }

              return 'vendor-misc';
            },
          },
        },
      }
    };
});
