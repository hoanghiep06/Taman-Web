import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

import { LoginPage } from './features/auth/pages/LoginPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';

import { AdminLayout } from './layouts/AdminLayout';
import { StaffLayout } from './layouts/StaffLayout'; // Thêm Staff Layout

import { DashboardPage } from './features/dashboard/pages/DashboardPage'; // Import Dashboard thật
import { UserManagementPage } from './features/users/pages/UserManagementPage';

import { CatalogPage } from './features/catalog/pages/CatalogPage';

import { RoomListPage } from './features/patrol/pages/RoomListPage';
import { PatrolSessionPage } from './features/patrol/pages/PatrolSessionPage';
import { PatrolHistoryPage } from './features/patrol/pages/PatrolHistoryPage';

import { SystemSettingsPage } from './features/settings/pages/SystemSettingsPage';

import { ROLES } from './utils/constants';

// Placeholder cho màn hình Đi tuần của Staff
const StaffRoomsPlaceholder = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h3 style={{color: '#1F4E78'}}>📱 GIAO DIỆN CHỌN PHÒNG ĐI TUẦN</h3>
    <p>Nội dung danh sách phòng sẽ hiển thị ở đây.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route 
            path="/force-reset" 
            element={<ProtectedRoute><ResetPasswordPage /></ProtectedRoute>} 
          />

          {/* =========================================================
              PHÂN HỆ 1: WEB PORTAL (ADMIN / MANAGER)
              ========================================================= */}
          <Route 
            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}><AdminLayout /></ProtectedRoute>}
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
          </Route>

          {/* =========================================================
              PHÂN HỆ 2: MOBILE APP (STAFF)
              Sử dụng StaffLayout mô phỏng điện thoại
              ========================================================= */}
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