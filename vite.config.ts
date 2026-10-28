import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { isLocalEnvironment, resolveApiBase } from './src/lib/api-config'

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  // Fail during build too, before producing a bundle with an implicit /api target.
  resolveApiBase(
    env.VITE_API_BASE_URL,
    isLocalEnvironment(env.VITE_APP_ENV, command === 'serve' && mode === 'development'),
    '/api',
  )
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
