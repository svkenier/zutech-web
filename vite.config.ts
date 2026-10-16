import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ui': path.resolve(__dirname, './src/ui'),
    },
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      '@tanstack/react-query-devtools',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/LinearProgress',
      '@mui/icons-material',
      'react-helmet-async',
      'embla-carousel-react',
      'formik',
      'yup',
      'dayjs',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'utils-vendor': ['dayjs', 'yup', 'formik', 'embla-carousel-react']
        }
      }
    }
  }
})

