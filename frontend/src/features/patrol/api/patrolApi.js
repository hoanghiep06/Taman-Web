
import axiosClient from '../../../api/axiosClient';

export const patrolApi = {
  // 1. Lấy danh sách phòng kèm tiến độ live (API số 1)
  getRooms: (params) => {
    return axiosClient.get('/inspections/rooms', { params });
  },

  // 2. Lấy đồ đạc bên trong 1 phòng theo từng Cụ (API số 2)
  getAssetsForPatrolByRoom: (roomId) => {
    return axiosClient.get(`/inspections/rooms/${roomId}/assets`);
  },

  // 3. Xin mã Nonce bảo mật trước khi mở Camera (API số 3)
  requestNonce: () => {
    return axiosClient.post('/inspections/request-nonce');
  },

  // 4. Upload ảnh nén kiểm kê tư trang (API số 4)
  uploadMultiAssets: (formData) => {
    return axiosClient.post('/inspections/upload-multi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 5. Báo mất đồ đạc kèm lý do (API số 5)
  reportMissing: (assetId, note) => {
    return axiosClient.post('/inspections/report-missing', {
      asset_id: assetId,
      note: note,
    });
  },

  // 6. Bảng tiến độ tổng quan ca trực & Danh sách Báo Mất (API số 6)
  getShiftProgress: (params) => {
    return axiosClient.get('/inspections/shift-progress', { params });
  },

  // 7. Lấy link xem ảnh có ký số JWT 15 phút (API số 7)
  getInspectionImage: (logId) => {
    return axiosClient.get(`/inspections/logs/${logId}/image`);
  },

  // 8. Lịch sử đi tuần dài hạn (API số 8)
  getInspectionHistory: (params) => {
    return axiosClient.get('/inspections/history', { params });
  },

  // 9. Lấy 2 ảnh ngẫu nhiên để Audit đa cơ sở (API số 9)
  getRandomImages: (params) => {
    return axiosClient.get('/inspections/random-images', { params });
  },

  // API thống kê tài sản cơ sở (dùng fallback nếu cần)
  getAssetStats: (params) => {
    return axiosClient.get('/assets/stats', { params }).catch(() => null);
  },
};