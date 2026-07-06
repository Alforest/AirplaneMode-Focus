import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base works at BOTH alforest.github.io/AirplaneMode-Focus/ and
  // focusflight.io — the site keeps working while DNS/custom-domain is set up
  base: './',
  optimizeDeps: {
    include: ['framer-motion'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/')) return 'flight-data';
          if (id.includes('node_modules/mapbox-gl')) return 'mapbox';
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/zustand')) return 'zustand';
          if (id.includes('node_modules/react')) return 'react-vendor';
        },
      },
    },
  },
})
