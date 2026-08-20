import axiosClient from '../../../api/axiosClient';

export const shiftHandoverApi = {
    // Lấy danh sách cơ sở từ BE
    getAllFacilities: async () => {
        return await axiosClient.get('/admin/facilities');
    },
    // Lấy thông tin ca trực Live hiện tại từ hệ thống
    getCurrentShift: async () => {
        return await axiosClient.get('/health/current-shift'); // Tuỳ chỉnh prefix nếu cần
    },
    // Kiểm tra trạng thái nộp báo cáo của các cơ sở
    getFacilitiesShiftReportStatus: async (params = {}) => {
        return await axiosClient.get('/health/shift-reports/facilities-status', { params });
    },
    // Tạo báo cáo giao ca
    createShiftReport: async (payload) => {
        return await axiosClient.post('/health/shift-reports', payload);
    },
    // Cập nhật báo cáo giao ca
    updateShiftReport: async (reportId, payload) => {
        return await axiosClient.put(`/health/shift-reports/${reportId}`, payload);
    },
    // Lịch sử chỉnh sửa báo cáo (Audit Log)
    getShiftReportAuditHistory: async (reportId) => {
        return await axiosClient.get(`/health/shift-reports/${reportId}/audit-history`);
    },
    // Tra cứu kho lịch sử bàn giao ca
    getArchivedShiftReports: async (params = {}) => {
        return await axiosClient.get('/health/shift-reports/archive', { params });
    },
    getShiftAbnormalSummary: async (params = {}) => {
        return await axiosClient.get('/health/shift-reports/auto-summary', { params });
    },
};