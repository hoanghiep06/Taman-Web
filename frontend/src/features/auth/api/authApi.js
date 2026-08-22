import axiosClient from '../../../api/axiosClient';

export const authApi = {
  // Gửi thông tin tài khoản đăng nhập (Đã chuyển sang dạng Form Data)
  login: (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    return axiosClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },

  // Đổi mật khẩu bắt buộc cho người dùng hiện tại (Dữ liệu JSON đúng theo Schema)
  changePassword: (oldPassword, newPassword) => {
    return axiosClient.put('/auth/users/me/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  // Gọi health check để "đánh thức" backend (hữu ích nếu backend host trên
  // dịch vụ free tier có cơ chế ngủ đông khi không có traffic, VD Render).
  // Không quan tâm response, chỉ cần request chạm tới server là đủ.
  pingServer: () => {
    return axiosClient.get('/health');
  },
};