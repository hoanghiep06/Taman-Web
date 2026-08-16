import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: false,
          secure: false,
        }
      }
    },
    build: {
      // Đảm bảo bật sourcemap hoặc giữ cấu hình build mặc định tối ưu
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    }
  }
})