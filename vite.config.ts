import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Hostnames the dev server will accept, supplied per environment so no machine
 * specific hostname is committed. Example:
 *   VITE_ALLOWED_HOSTS=my-preview.example.dev npm run dev
 */
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    allowedHosts,
  },
})
