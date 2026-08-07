import axiosClient from '../../../api/axiosClient';

export const careDutyApi = {
    // 1. Lấy dữ liệu Dashboard ca trực live
    getLiveShiftDashboard: async (facilityId = null) => {
        return await axiosClient.get('/health/dashboard-live', {
            params: facilityId ? { facility_id: facilityId } : {},
        });
    },

    // 2. Ghi nhận dấu sinh hiệu mới
    recordVitalSigns: async (payload) => {
        return await axiosClient.post('/health/vitals', payload);
    },

    // 3. Sửa đổi dấu sinh hiệu (Khóa Template String JS)
    updateVitalSigns: async (vitalId, payload) => {
        return await axiosClient.put(`/health/vitals/${vitalId}`, payload);
    },

    // 4. Lấy lịch sử dấu sinh hiệu (Theo ID Cụ, ngày, ca, cơ sở)
    getVitalsHistory: async (params = {}) => {
        return await axiosClient.get('/health/vitals/history', { params });
    },

    // 5. Tạo báo cáo giao ca (Fix đúng route /api/health/shift-reports)
    createShiftReport: async (payload) => {
        return await axiosClient.post('/health/shift-reports', payload);
    },

    // 6. Xem lại báo cáo giao ca quá khứ (Fix đúng route /api/health/shift-reports/archive)
    getArchivedShiftReports: async (params = {}) => {
        return await axiosClient.get('/health/shift-reports/archive', { params });
    },

    // 7. Lấy danh sách các Cụ sắp/đã đến hạn cân
    getEldersDueForWeight: async () => {
        return await axiosClient.get('/health/weight/due-list');
    },

    // 8. Nhập chỉ số cân nặng mới
    recordElderWeight: async (payload) => {
        return await axiosClient.post('/health/weight', payload);
    },

    // 9. Sửa chỉ số cân nặng khi gõ nhầm
    updateElderWeight: async (weightId, payload) => {
        return await axiosClient.put(`/health/weight/${weightId}`, payload);
    },

    // 10. Xem lịch sử cân nặng theo từng lần của 1 Cụ
    getElderWeightHistory: async (elderId) => {
        return await axiosClient.get(`/health/weight/elder/${elderId}`);
    },
};




