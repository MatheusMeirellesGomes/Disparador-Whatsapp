import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/contatos': 'http://localhost:3000',
      '/campanhas': 'http://localhost:3000',
      '/fluxos': 'http://localhost:3000',
    },
  },
})
