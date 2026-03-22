import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // Disable the proxy when running under Playwright — all API calls are
    // mocked via page.route() so the backend is never needed, and the proxy
    // would only produce ECONNREFUSED noise in the output.
    proxy: process.env.PLAYWRIGHT_TEST ? {} : {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**'],
    },
  },
})
