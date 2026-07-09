import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { ProxyOptions } from 'vite'

const API_HOST = '127.0.0.1'
const API_PORT = '3101'

function proxyWithFallback(target: string, label: string): ProxyOptions {
  let lastErrorLog = 0
  return {
    target,
    changeOrigin: true,
    secure: false,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        const now = Date.now()
        if (now - lastErrorLog > 8000) {
          console.warn(
            `\n[vite] ${label} proxy error — backend not reachable at ${target}\n` +
              `       Start API: npm run dev --prefix server  (or from repo root: npm run dev)\n` +
              `       Detail: ${(err as NodeJS.ErrnoException).code || err.message}\n`
          )
          lastErrorLog = now
        }
        if (res && !(res as any).headersSent) {
          ;(res as any).writeHead?.(503, { 'Content-Type': 'application/json' })
          ;(res as any).end?.(
            JSON.stringify({
              success: false,
              message: 'API server unavailable. Start the backend on port 3101.',
              statusCode: 503,
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
const apiProxy = (proxyTarget: string) => ({
  '/api': proxyWithFallback(proxyTarget, 'API'),
  '/uploads': {
    target: proxyTarget,
    changeOrigin: true,
  },
  '/socket.io': {
    ...proxyWithFallback(proxyTarget, 'Socket.IO'),
    ws: true,
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_API_URL?.replace(/\/?api\/?$/, '') ||
    `http://${API_HOST}:${API_PORT}`

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
      'import.meta.env.VITE_API_DIRECT': JSON.stringify(env.VITE_API_DIRECT ?? ''),
    },
    server: {
      host: '0.0.0.0',
      port: 5175,
      strictPort: true,
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
