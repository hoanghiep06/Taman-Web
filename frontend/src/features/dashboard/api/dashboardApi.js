import axiosClient from '../../../api/axiosClient';

export const dashboardApi = {
  getDashboardData: () => {
    return axiosClient.get('/admin/dashboard');
  },
  getUsers: () => {
    return axiosClient.get('/admin/users');
  },
  getFacilities: () => {
    return axiosClient.get('/admin/facilities');
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
  getLoginLogs: (params) => {
    return axiosClient.get('/admin/audit/login-logs', { params });
  },
  getDoctorDashboard: (params) => {
    return axiosClient.get('/health/dashboard-doctor', { params });
  },
  getWeightDueList: (params) => {
    return axiosClient.get('/health/weight/due-list', { params });
  },
    getShiftReportsArchive: (params) => {
        return axiosClient.get('/health/shift-reports/archive', { params });
    },
  // ──── CÁC API PHÂN HỆ NÂNG CAO ────
  getInspectionHistory: (params) => {
    return axiosClient.get('/inspections/history', { params });
  },
  getHistoricalShifts: (params) => {
    return axiosClient.get('/admin/shifts/history', { params });
  },
  getShiftAnomalyReport: (params) => {
    return axiosClient.get('/admin/shifts/missing-report', { params });
  },
  getRandomAudit: (params) => {
    return axiosClient.get('/admin/shifts/random-audit', { params });
  },
  getVitalsHistory: (params) => {
    return axiosClient.get('/health/vitals/history', { params });
  },
  getCurrentShift: () => {
    return axiosClient.get('/health/current-shift');
  },
};