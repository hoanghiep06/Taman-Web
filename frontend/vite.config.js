import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Nạp các biến môi trường từ file .env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      watch: {
        usePolling: true,
      },
      host: true,

      proxy: {
        // Định tuyến toàn bộ request /api về cổng chạy của Backend FastAPI
        '/api': {
          // Ưu tiên đọc biến từ Docker Compose gán qua (.http://taman-backend:5000), 
          // nếu chạy npm run dev độc lập bên ngoài sẽ tự động fallback về http://localhost:5000
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})