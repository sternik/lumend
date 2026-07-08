import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const proxyTarget = process.env.TVH_URL

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'build',
    assetsDir: 'static',
    target: 'es2020',
  },
  server: {
    port: 3000,
    proxy: proxyTarget
      ? {
          '/api': { target: proxyTarget, changeOrigin: true },
          '/playlist': { target: proxyTarget, changeOrigin: true },
          '/stream': { target: proxyTarget, changeOrigin: true, ws: true },
        }
      : undefined,
  },
})
