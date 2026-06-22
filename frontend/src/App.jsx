// App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

import { LoginPage } from './features/auth/pages/LoginPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';

import { AdminLayout } from './layouts/AdminLayout';
import { StaffLayout } from './layouts/StaffLayout'; 

import { DashboardPage } from './features/dashboard/pages/DashboardPage'; 
import { UserManagementPage } from './features/users/pages/UserManagementPage';
import { CatalogPage } from './features/catalog/pages/CatalogPage';
import { RoomListPage } from './features/patrol/pages/RoomListPage';
import { PatrolSessionPage } from './features/patrol/pages/PatrolSessionPage';
import { PatrolHistoryPage } from './features/patrol/pages/PatrolHistoryPage';
import { SystemSettingsPage } from './features/settings/pages/SystemSettingsPage';
import { BackupPage } from './features/backup/pages/BackupPage';

import { ROLES } from './utils/constants';

function App() {
  useEffect(() => {
    const awakeBackendSystem = () => {
      const NOW = Date.now();
      const LAST_AWAKE = localStorage.getItem('taman_last_awake_time');
      
      // ⏱️ QUY ĐỔI KHOẢNG CÁCH THỜI GIAN (10 phút = 10 * 60 * 1000 mili-giây)
      const TEN_MINUTES = 10 * 60 * 1000;

      if (LAST_AWAKE && (NOW - parseInt(LAST_AWAKE, 10) < TEN_MINUTES)) {
        // 😎 Server chắc chắn đang hoạt động tốt, không bắn thêm request rác
        console.log("⚡ [AWAKE CONTROL]: Trong vòng 10 phút qua đã có tương tác. Bỏ qua lượt gõ cửa Cloud.");
        return;
      }

      // 🚀 Thực hiện ĐÁNH THỨC NGẦM SONG SONG (Không sử dụng await)
      console.log("⏳ [AWAKE CONTROL]: Đang âm thầm bắn tín hiệu kích hoạt container Render dưới nền...");
      localStorage.setItem('taman_last_awake_time', String(NOW));

      // Gọi API dạng Promise độc lập, không block luồng render UI của giao diện khách
      axiosClient.get('/health')
        .then(() => {
          console.log("🟢 [AWAKE CONTROL]: Máy chủ đám mây đã thông suốt và sẵn sàng!");
        })
        .catch((err) => {
          // Lưu ý: Render đang ngủ đông trả về lỗi kết nối ban đầu là bình thường trong 15s đầu
          console.warn("🟡 [AWAKE CONTROL]: Máy chủ đang trong tiến trình nạp lại container dậy...", err.message);
        });
    };

    awakeBackendSystem();
  }, []);

  // 🚀 ĐÃ CẢI TIẾN: Loại bỏ hoàn toàn màn hình chờ Spinner. Người dùng vào thẳng App ngay lập tức!
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/force-reset" element={<ProtectedRoute><ResetPasswordPage /></ProtectedRoute>} />

          {/* PHÂN HỆ 1: WEB PORTAL (ADMIN / MANAGER) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Route>

          {/* PHÂN HỆ 2: MOBILE APP (STAFF) */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.STAFF]}><StaffLayout /></ProtectedRoute>}>
            <Route path="/rooms" element={<RoomListPage />} />
            <Route path="/patrol/:roomNumber" element={<PatrolSessionPage />} />
            <Route path="/patrol/history" element={<PatrolHistoryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;