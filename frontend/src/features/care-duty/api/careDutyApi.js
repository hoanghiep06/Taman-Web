import axiosClient from '../../../api/axiosClient';

export const careDutyApi = {
    // 1. Lấy dữ liệu từ Dashboard cho ca trực 
    getLiveShiftDashboard: async (facilityId = null) => {
        return await axiosClient.get('/health/dashboard-live', {
            params: facilityId ? { facility_id : facilityId } : {},
        });
    },
    
    // 2. Ghi nhận dấu sinh hiệu mới 
    recordVitalSigns: async (payload) => {
        /**
         * Payload mẫu:
         * {
         *   elder_id: 1,
         *   shift_type: "Sang" | "Toi",
         *   bp_systolic: 120,
         *   bp_diastolic: 80,
         *   pulse: 75,
         *   spo2: 98,
         *   temperature: 36.5,
         *   notes: "Cụ tỉnh táo"
         * }
         */

        return await axiosClient.post('api/health/vitals', payload);
    },

    // 3. Sửa đổi dấu sinh hiệu đã ghi nhận
    updateVitalSigns: async (vitalId, payload) => {
        return await axiosClient.put('/health/vitals/${vitalId}', payload);
    },

    // 4. Lấy lịch sử dấu sinh hiệu (theo ngày, ca, cơ sở, 1 NCT cụ thể)
    getVitalsHistory: async (params = {}) => {
        /**
         * Params có thể gồm: { elder_id, target_date, limit_days, shift_type, facility_id }
         */

        return await axiosClient.get('/health/vitals/history', { params });
    },

    // 5. Tạo báo cáo giao ca, Coordinator (only)
    createShiftReport: async (payload) => {
        /**
         * Payload mẫu:
         * {
         *   facility_id: 1,
         *   shift_date: "2026-08-06",
         *   shift_type: "Sang" | "Toi",
         *   elder_events: [
         *     { elder_id: 1, note: "Đặt lại sonde, sốt nhẹ 37.8..." },
         *     { elder_id: 2, note: "Bỏ ăn sáng..." }
         *   ],
         *   handover_notes: "Theo dõi tiếp sinh hiệu Cụ A, đo lại HA Cụ B lúc 14h"
         * }
         */

        return await axiosClient.post('/health/shift-report', payload);
    },

    // 6. Xem lại báo cáo giao ca trong quá khứ
    getArchivedShiftReports: async (params = {}) => {
        /**
         * Params có thể gồm: { facility_id, target_date, shift_type, limit_days }
         */

        return await axiosClient.get('/health/shift-report/archive', { params });

    },

    // 7. Nhắc lịch cân thông minh (Lấy danh sách các NCT sắp đến hạn
    getEldersDueForWeight: async () => {
        return await axiosClient.get('/health/weight/due-list');
    },

    // 8. Nhập chỉ số cân nặng mới 
    recordElderWeight: async (payload) => {
        /**
         * Payload mẫu:
         * {
         *   elder_id: 1,
         *   weight: 55.5,
         *   notes: "Cân đầu tháng"
         * }
         */
        return await axiosClient.post('/health/weight', payload);
    },

    // 9. Sửa chỉ số cân nặng khi gõ nhầm
    updateElderWeight: async (weightId, payload) => {
        /**
         * Payload mẫu:
         * {
         *   weight: 56.0,
         *   notes: "Sửa lại do gõ nhầm"
         * }
         */
        return await axiosClient.put(`/health/weight/${weightId}`, payload);
    },

    // 10. Xem lịch sử cân nặng theo từng lần
    getElderWeightHistory: async (elderId) => {
        return await axiosClient.get(`/health/weight/elder/${elderId}`);
    },
    
};




