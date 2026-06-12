import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'yard-tournament' to your actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/yard-tournament/',
})
