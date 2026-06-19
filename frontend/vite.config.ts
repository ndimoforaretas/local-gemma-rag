import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: forward API calls to the FastAPI backend so `npm run dev` works
// against a running backend (the built app is served by the backend itself).
const BACKEND = 'http://localhost:8000'
const API_PREFIXES = ['/api', '/health', '/ingest', '/kb', '/rag', '/upload']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: Object.fromEntries(API_PREFIXES.map((p) => [p, BACKEND])),
  },
})
