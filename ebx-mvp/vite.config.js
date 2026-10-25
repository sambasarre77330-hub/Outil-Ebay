import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuration de Vite : on branche React et le moteur de style Tailwind v4
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})