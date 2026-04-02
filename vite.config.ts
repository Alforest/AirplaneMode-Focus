import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AirplaneMode-Focus/',
  optimizeDeps: {
    include: ['framer-motion'],
  },
  build: {
    target: 'es2019',
    rollupOptions: {
      external: ['mapbox-gl'],
      output: {
        globals: {
          'mapbox-gl': 'mapboxgl',
        },
        manualChunks: {
          'framer': ['framer-motion'],
          'react-vendor': ['react', 'react-dom'],
          'zustand': ['zustand'],
        },
      },
    },
  },
})
