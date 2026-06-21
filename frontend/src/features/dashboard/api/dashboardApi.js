import axiosClient from '../../../api/axiosClient';

export const dashboardApi = {
  getDashboardData: () => {
    return axiosClient.get('/admin/dashboard');
  },
  getRooms: () => {
    return axiosClient.get('/admin/rooms');
  },
  getElders: () => {
    return axiosClient.get('/admin/elders');
  },
  getAssets: () => {
    return axiosClient.get('/admin/assets');
  },
  getShiftProgress: () => {
    return axiosClient.get('/inspections/shift-progress');
  },
  getInspectionImage: (logId) => {
    return axiosClient.get(`/inspections/logs/${logId}/image`);
  },

  // ──── CÁC API PHÂN HỆ NÂNG CAO MỚI CHO ADMIN ────
  // 1. Kho lịch sử tổng hợp (Hỗ trợ phân trang & bộ lọc nâng cao)
  getInspectionHistory: (params) => {
    return axiosClient.get('/inspections/history', { params });
  },
  // 2. Tra cứu lịch sử đăng nhập, IP và thiết bị đầu cuối
  getLoginLogs: (params) => {
    // Khớp hoàn toàn với @router.get("/audit/login-logs") của bạn
    return axiosClient.get('/admin/audit/login-logs', { params }); 
  },
};