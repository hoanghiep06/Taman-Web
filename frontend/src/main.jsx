import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ──── KÍCH HOẠT PWA: đăng ký Service Worker ────
// Điều kiện để hoạt động thật: phải chạy qua HTTPS (hoặc localhost khi dev).
// Đăng ký sau sự kiện 'load' để không làm chậm thời gian tải trang lần đầu.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker đã đăng ký:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Đăng ký Service Worker thất bại:', error);
      });
  });
}