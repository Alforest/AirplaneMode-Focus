import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AirplaneMode-Focus/',
  optimizeDeps: {
    include: ['framer-motion'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'mapbox': ['mapbox-gl'],
          'framer': ['framer-motion'],
          'react-vendor': ['react', 'react-dom'],
          'zustand': ['zustand'],
        },
      },
    },
  },
})
