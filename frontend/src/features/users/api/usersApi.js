import axiosClient from '../../../api/axiosClient';

export const usersApi = {
  // 1. Lấy danh sách toàn bộ người dùng hệ thống -> Trả về List[UserResponse]
  getAllUsers: () => {
    return axiosClient.get('/admin/users');
  },

  // 2. Khởi tạo tài khoản mới -> Truyền vào UserCreate, trả về UserResponse
  createUser: (userData) => {
    return axiosClient.post('/admin/users', userData);
  },

  // 3. Khóa/Mở khóa hoạt động tài khoản -> Trả về UserResponse đã cập nhật
  toggleLockUser: (userId) => {
    return axiosClient.put(`/admin/users/${userId}/toggle-lock`);
  },

  // 4. Xóa vĩnh viễn tài khoản -> Trả về trạng thái 204 No Content
  deleteUser: (userId) => {
    return axiosClient.delete(`/admin/users/${userId}`);
  },

  // 5. IMPORT EXCEL: Nạp danh sách nhân sự hàng loạt
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