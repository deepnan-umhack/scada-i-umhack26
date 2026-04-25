// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, 
    allowedHosts: ['.ngrok-free.app', 'localhost'], // Change this from 'all' to ['all']
    hmr: {
      clientPort: 443,
    },
  }
})