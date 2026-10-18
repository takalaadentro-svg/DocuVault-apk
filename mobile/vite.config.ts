import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'rollup': '@rollup/wasm-node'
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PORT === '8000' ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8080',
        changeOrigin: true
      },
      '/share': {
        target: process.env.VITE_BACKEND_PORT === '8000' ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
})
