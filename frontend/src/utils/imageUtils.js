/**
 * imageUtils.js
 * Tiện ích xử lý URL ảnh từ Google Drive (dùng chung toàn ứng dụng).
 * Tập trung logic build URL vào 1 chỗ, tránh lặp code ở 3+ nơi.
 */
import axiosClient from '../api/axiosClient';

/**
 * Xây dựng URL công khai của ảnh kiểm kê từ token trả về bởi API.
 * @param {string} shareableUrl - URL hoặc token shareable_url trả về từ backend
 * @returns {string} - URL tuyệt đối đến endpoint public-view
 */
export function buildImageUrl(shareableUrl) {
  const token = shareableUrl.split('/').pop();
  const configuredBaseUrl = axiosClient.defaults.baseURL || '';
  let absoluteBaseUrl = configuredBaseUrl;

  if (!absoluteBaseUrl.startsWith('http')) {
    const prefix = configuredBaseUrl.startsWith('/') ? '' : '/';
    absoluteBaseUrl = `${window.location.origin}${prefix}${configuredBaseUrl}`;
  }

  return `${absoluteBaseUrl.replace(/\/$/, '')}/inspections/public-view/${token}`;
}

/**
 * Fetch URL ảnh từ API rồi build URL tuyệt đối.
 * Trả về URL chuẩn hoặc throw error nếu thất bại.
 * @param {Function} fetchFn - Hàm gọi API (nhận logId, trả về {shareable_url})
 * @param {string|number} logId
 * @returns {Promise<string>}
 */
export async function fetchAndBuildImageUrl(fetchFn, logId) {
  const response = await fetchFn(logId);
  if (!response?.shareable_url) {
    throw new Error('Không nhận được URL ảnh từ server.');
  }
  return buildImageUrl(response.shareable_url);
}
