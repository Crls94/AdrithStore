import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    host: '0.0.0.0',   // ← escucha en todas las interfaces de red
    port: 5173,
  },
})