import axiosClient from '../../../api/axiosClient';

export const healthApi = {
  // ── Sinh hiệu ──
  createVitals: (payload) => axiosClient.post('/health/vitals', payload),
  updateVitals: (vitalId, payload) => axiosClient.put(`/health/vitals/${vitalId}`, payload),
  getVitalsHistory: (elderId, params) => axiosClient.get(`/health/vitals/elder/${elderId}`, { params }),

  // ── Cân nặng ──
  createWeight: (payload) => axiosClient.post('/health/weight', payload),
  updateWeight: (weightId, payload) => axiosClient.put(`/health/weight/${weightId}`, payload),
  getWeightHistory: (elderId) => axiosClient.get(`/health/weight/elder/${elderId}`),
  getWeightDueList: () => axiosClient.get('/health/weight/due-list'),

  // ── Dashboard & Báo cáo ca ──
  getDashboardLive: (params) => axiosClient.get('/health/dashboard-live', { params }),
  getDashboardDoctor: (params) => axiosClient.get('/health/dashboard-doctor', { params }),
  createShiftReport: (payload) => axiosClient.post('/health/shift-reports', payload),
  getShiftReportArchive: (params) => axiosClient.get('/health/shift-reports/archive', { params }),

  // ── Nhật ký diễn biến ──
  getElderDiary: (elderId, params) => axiosClient.get(`/health/diary/elder/${elderId}`, { params }),
};