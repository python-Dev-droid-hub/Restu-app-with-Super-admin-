import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const apiProxy = (proxyTarget: string) => ({
  '/api': {
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
  },
  '/uploads': {
    target: proxyTarget,
    changeOrigin: true,
  },
  '/socket.io': {
    target: proxyTarget,
    changeOrigin: true,
    ws: true,
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_API_URL?.replace(/\/?api\/?$/, '') ||
    'http://127.0.0.1:3101'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
      'import.meta.env.VITE_API_DIRECT': JSON.stringify(env.VITE_API_DIRECT ?? ''),
    },
    server: {
      proxy: apiProxy(proxyTarget),
    },
    preview: {
      host: '0.0.0.0',
      port: 5175,
      strictPort: true,
      proxy: apiProxy(proxyTarget),
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
