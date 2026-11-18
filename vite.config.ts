import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { isLocalEnvironment, resolveApiBase } from './src/lib/api-config'
import { checkoutReturnLinks } from './checkout-return-links'

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  // Fail during build too, before producing a bundle with an implicit /api target.
  resolveApiBase(
    env.VITE_API_BASE_URL,
    isLocalEnvironment(env.VITE_APP_ENV, command === 'serve' && mode === 'development'),
    '/api',
  )
  return {
    plugins: [react(), checkoutReturnLinks(env.VITE_ANDROID_APP_LINK_SHA256, env.VITE_IOS_APP_LINK_ID)],
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
