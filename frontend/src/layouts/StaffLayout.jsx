import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const StaffLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    ...styles.navItem,
    color: isActive ? '#0284C7' : '#94A3B8',
    backgroundColor: isActive ? '#F0F9FF' : 'transparent',
    fontWeight: isActive ? '700' : '600',
  });

  return (
    <div style={styles.mobileContainer}>
      {/* HEADER DI ĐỘNG CỐ ĐỊNH CHIỀU CAO */}
      <header style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>USER</div>
          <div style={styles.userText}>
            <span style={styles.greeting}>Xin chào,</span>
            <span style={styles.roleName}>{user?.role || 'Nhân viên'}</span>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Thoát</button>
      </header>

      {/* KHU VỰC CHỨA NỘI DUNG CHÍNH - AUTO CO GIÃN % THEO CHIỀU CAO MÀN HÌNH */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* THANH ĐIỀU HƯỚNG ĐÁY NÉ BIÊN AN TOÀN IPHONE */}
      <nav style={styles.bottomNav}>
        <NavLink to="/rooms" style={navLinkStyle}>
          <span style={styles.navIcon}>📋</span>
          <span style={styles.navText}>Đi Tuần</span>
        </NavLink>
        <NavLink to="/patrol/history" style={navLinkStyle}>
          <span style={styles.navIcon}>🕒</span>
          <span style={styles.navText}>Lịch Sử</span>
        </NavLink>
      </nav>
    </div>
  );
};

const styles = {
  // Cố định kịch khung nhìn di động, cấm tràn khung ngang dọc, khóa cứng 100% không cho zoom lỗi
  mobileContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    height: '100dvh', 
    width: '100vw',
    maxWidth: '480px', 
    margin: '0 auto', 
    backgroundColor: '#F8FAFC', 
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    touchAction: 'pan-y'
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0 16px', 
    height: '10%', // Chiếm chính xác 10% chiều cao màn hình
    minHeight: '60px',
    maxHeight: '70px',
    backgroundColor: '#FFFFFF', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
    zIndex: 100, 
    flexShrink: 0 
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { fontSize: '11px', fontWeight: 'bold', color: '#0284C7', backgroundColor: '#E0F2FE', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userText: { display: 'flex', flexDirection: 'column' },
  greeting: { fontSize: '11px', color: '#64748B' },
  roleName: { fontSize: '14px', fontWeight: '800', color: '#0F172A' },
  logoutBtn: { backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  
  // Chiếm toàn bộ phần diện tích % còn lại của khung máy, bật cuộn mượt nội bộ
  mainContent: { 
    flex: 1, 
    overflowY: 'auto', 
    overflowX: 'hidden',
    width: '100%', 
    WebkitOverflowScrolling: 'touch', 
    boxSizing: 'border-box',
    position: 'relative'
  }, 
  
  // Tự thích ứng thanh công cụ đáy theo chuẩn Apple Safe Area
  bottomNav: { 
    flexShrink: 0,
    height: 'calc(60px + env(safe-area-inset-bottom))', 
    paddingBottom: 'env(safe-area-inset-bottom)',
    backgroundColor: '#FFFFFF', 
    display: 'flex', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTop: '1px solid #E2E8F0', 
    zIndex: 100 
  },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', gap: '2px', width: '45%', height: '80%', borderRadius: '12px', transition: 'all 0.15s ease' },
  navIcon: { fontSize: '18px' },
  navText: { marginTop: '1px' }
};