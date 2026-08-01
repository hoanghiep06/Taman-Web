// App.jsx
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ROLES } from './utils/constants';

import { LoginPage } from './features/auth/pages/LoginPage';
import { AdminLayout } from './layouts/AdminLayout';
import { StaffLayout } from './layouts/StaffLayout';

// ──── LAZY LOAD: chỉ tải code của từng trang khi người dùng thực sự vào trang đó ────
// LoginPage + Layout giữ import thường vì luôn cần ngay khi mở app (tránh nháy màn hình trắng khi chờ tải).
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const UserManagementPage = lazy(() => import('./features/users/pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const CatalogPage = lazy(() => import('./features/catalog/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const RoomListPage = lazy(() => import('./features/patrol/pages/RoomListPage').then((m) => ({ default: m.RoomListPage })));
const PatrolSessionPage = lazy(() => import('./features/patrol/pages/PatrolSessionPage').then((m) => ({ default: m.PatrolSessionPage })));
const PatrolHistoryPage = lazy(() => import('./features/patrol/pages/PatrolHistoryPage').then((m) => ({ default: m.PatrolHistoryPage })));
const SystemSettingsPage = lazy(() => import('./features/settings/pages/SystemSettingsPage').then((m) => ({ default: m.SystemSettingsPage })));
const BackupPage = lazy(() => import('./features/backup/pages/BackupPage').then((m) => ({ default: m.BackupPage })));

// Màn hình chờ tối giản khi 1 trang lazy đang tải — không dùng spinner nặng, giữ đúng tinh thần "vào thẳng App ngay"
const RouteFallback = () => (
  <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 14 }}>Đang tải...</div>
);

function App() {
  useEffect(() => {
    const awakeBackendSystem = () => {
      const NOW = Date.now();
      const LAST_AWAKE = localStorage.getItem('taman_last_awake_time');
      const TEN_MINUTES = 10 * 60 * 1000;

      if (LAST_AWAKE && (NOW - parseInt(LAST_AWAKE, 10) < TEN_MINUTES)) {
        console.log('⚡ [AWAKE CONTROL]: Trong vòng 10 phút qua đã có tương tác. Bỏ qua lượt gõ cửa Cloud.');
        return;
      }

      console.log('⏳ [AWAKE CONTROL]: Đang âm thầm bắn tín hiệu kích hoạt container Render dưới nền...');
      localStorage.setItem('taman_last_awake_time', String(NOW));

      axiosClient
        .get('/health')
        .then(() => {
          console.log('🟢 [AWAKE CONTROL]: Máy chủ đám mây đã thông suốt và sẵn sàng!');
        })
        .catch((err) => {
          console.warn('🟡 [AWAKE CONTROL]: Máy chủ đang trong tiến trình nạp lại container dậy...', err.message);
        });
    };

    awakeBackendSystem();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;