import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 🆕 Agrupa librerías pesadas si las usas
          // 'vendor-supabase': ['@supabase/supabase-js'],
          // 'vendor-leaflet': ['leaflet', 'react-leaflet'],
        },
      },
    },
    
    minify: 'esbuild',
    sourcemap: false,
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  
  // 🆕 Mejora el prefetch/preload
  server: {
    preTransformRequests: true,
  },
})