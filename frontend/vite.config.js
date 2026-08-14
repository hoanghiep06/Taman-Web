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

          // 🌟 TẮT changeOrigin: để header "Host" gửi cho Backend giữ nguyên đúng
          // domain/IP mà TRÌNH DUYỆT thật sự đang dùng để mở trang (VD: 192.168.1.15:5173,
          // hoặc taman-an.onrender.com khi lên Production) -> Backend tự build đúng link ảnh
          // (resolve_public_base_url) mà KHÔNG BAO GIỜ dính tên nội bộ Docker "taman-backend:5000"
          // dù target proxy có trỏ vào đó. changeOrigin chỉ cần bật nếu target yêu cầu
          // virtual-hosting theo đúng tên miền, FastAPI của mình không cần điều đó.
          changeOrigin: false,

          secure: false,
        }
      }
    }
  }
})