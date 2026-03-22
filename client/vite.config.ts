import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          // Suppress ECONNREFUSED logs — expected when backend isn't running (e.g. CI)
          proxy.on('error', () => {});
        },
      },
    },
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**'],
    },
  },
})
