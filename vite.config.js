import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative asset paths, so the build works from any subfolder
  // (e.g. https://<user>.github.io/<repo>/) as well as a domain root
  base: './',
  plugins: [react()],
})
