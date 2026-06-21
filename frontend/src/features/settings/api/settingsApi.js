import axiosClient from '../../../api/axiosClient';

export const settingsApi = {
  // Lấy cấu hình giờ ca trực hiện tại
  getShiftTimes: () => {
    return axiosClient.get('/admin/settings/shifts');
  },

  // Cập nhật lại khung giờ ca trực
  updateShiftTimes: (data) => {
    return axiosClient.put('/admin/settings/shifts', data);
  },

  refreshCurrentShift: () => {
    // Lưu ý: Nếu bạn chuyển endpoint này sang router setting thì nhớ đổi url nhé
    return axiosClient.post('/admin/system/backup/refresh-current-shift');
  }
};