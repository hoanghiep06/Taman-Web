import React, { useEffect, useState } from 'react';
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
  const [isBackendAwake, setIsBackendAwake] = useState(false);
  const [awakeError, setAwakeError] = useState(false);

  useEffect(() => {
    const awakeBackendSystem = async () => {
      try {
        const NOW = Date.now();
        const LAST_AWAKE = localStorage.getItem('taman_last_awake_time');
        
        // ⏱️ QUY ĐỔI KHOẢNG CÁCH THỜI GIAN (10 phút = 10 * 60 * 1000 mili-giây)
        const TEN_MINUTES = 10 * 60 * 1000;

        if (LAST_AWAKE && (NOW - parseInt(LAST_AWAKE, 10) < TEN_MINUTES)) {
          // 😎 Server chắc chắn đang On, bỏ qua bước Ping, vào thẳng App lập tức!
          console.log("⚡ [AWAKE CONTROL]: Dưới 10 phút kể từ lần tương tác trước. Bỏ qua Ping Cloud.");
          setIsBackendAwake(true);
          return;
        }

        // 🚀 Đã quá 10 phút hoặc mở Web lần đầu: Bắn lệnh gọi đánh thức ngầm
        console.log("⏳ [AWAKE CONTROL]: Đã quá 10 phút. Đang gửi tín hiệu kích hoạt container Render...");
        await axiosClient.get('/health'); 
        
        // Ghi nhận mốc thời gian đánh thức thành công mới vào bộ nhớ trình duyệt
        localStorage.setItem('taman_last_awake_time', String(Date.now()));
        setIsBackendAwake(true);
      } catch (err) {
        console.error("🔴 [AWAKE CONTROL]: Cổng gác mây gặp sự cố kết nối:", err);
        setAwakeError(true); 
      }
    };

    awakeBackendSystem();
  }, []);

  // Giao diện màn hình chờ chuyên nghiệp (Chỉ hiện khi thực sự cần đánh thức server)
  if (!isBackendAwake && !awakeError) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.cardContainer}>
          <div style={styles.spinner}></div>
          <h3 style={styles.title}>Kết nối trung tâm Tâm An...</h3>
          <p style={styles.subtitle}>
            Hệ thống quản trị đang được kích hoạt từ máy chủ đám mây. <br/>
            Quá trình khởi động lần đầu sau khi ngủ đông mất khoảng 15-30 giây.
          </p>
        </div>
      </div>
    );
  }

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

const styles = {
  loadingWrapper: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui, sans-serif' },
  cardContainer: { backgroundColor: '#FFFFFF', padding: '40px 30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', maxWidth: '400px', width: '90%', textAlign: 'center' },
  spinner: { width: '36px', height: '36px', border: '4px solid #E2E8F0', borderTop: '4px solid #0284C7', borderRadius: '50%', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' },
  title: { margin: '0 0 8px 0', fontSize: '18px', color: '#0F172A', fontWeight: '800' },
  subtitle: { margin: 0, fontSize: '13px', color: '#64748B', lineHeight: '1.6', fontWeight: '500' }
};

export default App;