import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL?.replace(/\/?api\/?$/, '') || 'http://127.0.0.1:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@mui')) return 'mui'
            if (id.includes('socket.io-client')) return 'socketio'
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('react-router')) return 'router'
            return 'vendor'
          },
        },
      },
    },
  }
})
