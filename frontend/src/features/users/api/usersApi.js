import axiosClient from '../../../api/axiosClient';

export const usersApi = {
  getAllUsers: () => {
    return axiosClient.get('/admin/users');
  },

  createUser: (userData) => {
    return axiosClient.post('/admin/users', userData);
  },

  updateUser: (userId, userData) => {
    return axiosClient.put(`/admin/users/${userId}`, userData);
  },

  toggleLockUser: (userId) => {
    return axiosClient.put(`/admin/users/${userId}/toggle-lock`);
  },

  // Kiểm tra: 2 hàm này có tồn tại trong file thật của bạn chưa?
  bulkLockUsers: (userIds, isActive) => {
    return axiosClient.post('/admin/users/bulk-lock', {
      user_ids: userIds,
      is_active: isActive,
    });
  },

  resetPassword: (userId, newPassword = null) => {
    return axiosClient.put(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
  },

  deleteUser: (userId) => {
    return axiosClient.delete(`/admin/users/${userId}`);
  },

  bulkDeleteUsers: (userIds) => {
    return axiosClient.post('/admin/users/bulk-delete', {
      user_ids: userIds,
    });
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