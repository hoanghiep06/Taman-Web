// service-worker.js
// Chiến lược cache:
// - Tài nguyên tĩnh (JS, CSS, ảnh, font): cache-first, có fallback về network nếu chưa có trong cache.
//   Giúp app mở nhanh hơn ở lần sau + vẫn dùng được cơ bản khi mất mạng tạm thời.
// - Gọi API (/api/... hoặc method không phải GET): KHÔNG cache — luôn ưu tiên mạng thật.
//   Bắt buộc vì Dashboard đang polling dữ liệu ca trực mỗi 5 giây, cache sẽ làm hiển thị sai lệch số liệu thực tế.

const CACHE_NAME = 'taman-static-v1';

const STATIC_ASSET_EXTENSIONS = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.woff', '.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/index.html', '/']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

const isApiRequest = (url) => url.pathname.startsWith('/api') || url.pathname.includes('/inspections/') || url.pathname.includes('/health');

const isStaticAsset = (url) => STATIC_ASSET_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // Không cache POST/PUT/DELETE (ghi dữ liệu)

  const url = new URL(request.url);

  // Luôn để API đi thẳng ra mạng, không can thiệp
  if (isApiRequest(url)) return;

  // Tài nguyên tĩnh: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
        )
      )
    );
    return;
  }

  // Điều hướng trang (navigation): network-first, fallback về cache nếu mất mạng hoàn toàn
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
  }
});