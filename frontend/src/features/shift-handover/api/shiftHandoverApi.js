import axiosClient from '../../../api/axiosClient';

export const shiftHandoverApi = {

    // 0. Lấy danh sách cơ sở của tài khoản
    getAllFacilities: async () => {
        return await axiosClient.get('/admin/facilities');
    },
    // 1. Tạo báo cáo giao ca
    createShiftReport: async (payload) => {
        return await axiosClient.post('/health/shift-reports', payload);
    },
    // 2. Cập nhật báo cáo giao ca
    updateShiftReport: async (reportId, payload) => {
        return await axiosClient.put(`/health/shift-reports/${reportId}`, payload);
    },
    // 3. Lịch sử chỉnh sửa báo cáo (Audit Log)
    getShiftReportAuditHistory: async (reportId) => {
        return await axiosClient.get(`/health/shift-reports/${reportId}/audit-history`);
    },
    // 4. Tra cứu kho lịch sử bàn giao ca
    getArchivedShiftReports: async (params = {}) => {
        return await axiosClient.get('/health/shift-reports/archive', { params });
    },
};