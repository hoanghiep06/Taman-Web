import axiosClient from '../../../api/axiosClient';

export const usersApi = {
  getAllUsers: () => {
    return axiosClient.get('/admin/users');
  },

  createUser: (userData) => {
    return axiosClient.post('/admin/users', userData);
  },

  // MỚI: Sửa thông tin tài khoản (full_name, phone_number, role, facility_id, is_active)
  updateUser: (userId, userData) => {
    return axiosClient.put(`/admin/users/${userId}`, userData);
  },

  toggleLockUser: (userId) => {
    return axiosClient.put(`/admin/users/${userId}/toggle-lock`);
  },

  // MỚI: Reset mật khẩu về mặc định, hoặc đặt mật khẩu mới cụ thể
  resetPassword: (userId, newPassword = null) => {
    return axiosClient.put(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  },

  deleteUser: (userId) => {
    return axiosClient.delete(`/admin/users/${userId}`);
  },

  importUsersExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/admin/users/import-xlsx', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getComprehensiveHistory: (userId) => {
    return axiosClient.get(`/admin/users/${userId}/comprehensive-history`);
  }

};