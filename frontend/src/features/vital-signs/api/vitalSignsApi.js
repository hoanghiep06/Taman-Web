import axiosClient from '../../../api/axiosClient';

export const vitalSignsApi = {
    // 1. Lấy Dashboard ca trực live
    getLiveShiftDashboard: async (facilityId = null) => {
        return await axiosClient.get('/health/dashboard-live', {
            params: facilityId ? { facility_id: facilityId } : {},
        });
    },
    // 2. Ghi nhận chỉ số sinh hiệu
    recordVitalSigns: async (payload) => {
        return await axiosClient.post('/health/vitals', payload);
    },
    // 3. Sửa chỉ số sinh hiệu
    updateVitalSigns: async (vitalId, payload) => {
        return await axiosClient.put(`/health/vitals/${vitalId}`, payload);
    },
    // 4. Lịch sử sinh hiệu
    getVitalsHistory: async (params = {}) => {
        return await axiosClient.get('/health/vitals/history', { params });
    },
    // 5. Danh sách người cao tuổi đến lịch cân
    getEldersDueForWeight: async () => {
        return await axiosClient.get('/health/weight/due-list');
    },
    // 6. Nhập cân nặng mới
    recordElderWeight: async (payload) => {
        return await axiosClient.post('/health/weight', payload);
    },
    // 7. Sửa cân nặng
    updateElderWeight: async (weightId, payload) => {
        return await axiosClient.put(`/health/weight/${weightId}`, payload);
    },
    // 8. Lịch sử cân nặng
    getElderWeightHistory: async (elderId) => {
        return await axiosClient.get(`/health/weight/elder/${elderId}`);
    },
};