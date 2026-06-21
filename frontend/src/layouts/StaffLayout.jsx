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
    fontWeight: isActive ? '700' : '600',
  });

  return (
    <div style={styles.mobileContainer}>
      {/* HEADER DI ĐỘNG */}
      <header style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>👤</div>
          <div style={styles.userText}>
            <div style={styles.greeting}>Xin chào,</div>
            <div style={styles.roleName}>{user?.full_name || user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Thoát</button>
      </header>

      {/* KHU VỰC NỘI DUNG CHÍNH (Cuộn mượt, không bao giờ tràn ngang) */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* THANH ĐIỀU HƯỚNG ĐÁY */}
      <nav style={styles.bottomNav}>
        <NavLink to="/rooms" style={navLinkStyle}>
          <span style={styles.navIcon}>📋</span>
          Đi Tuần
        </NavLink>
        
        <NavLink to="/patrol/history" style={navLinkStyle}>
          <span style={styles.navIcon}>🕒</span>
          Lịch Sử
        </NavLink>
      </nav>
    </div>
  );
};

const styles = {
  // Fix 100dvh để chuẩn chiều cao mobile thật, touchAction cấm zoom bằng ngón tay
  mobileContainer: { display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', maxWidth: '480px', margin: '0 auto', backgroundColor: '#F8FAFC', position: 'relative', overflow: 'hidden', touchAction: 'pan-y' },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', zIndex: 10, flexShrink: 0 },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { fontSize: '20px', backgroundColor: '#F1F5F9', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userText: { display: 'flex', flexDirection: 'column' },
  greeting: { fontSize: '11px', color: '#64748B', marginBottom: '2px' },
  roleName: { fontSize: '14px', fontWeight: '800', color: '#0F172A' },
  logoutBtn: { backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  
  // Xóa thanh cuộn thừa, ép cuộn mượt (Momentum scrolling) cho iOS
  mainContent: { flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', WebkitOverflowScrolling: 'touch', paddingBottom: '20px' }, 
  
  // Thêm safe-area-inset-bottom để tránh bị thanh ngang của iPhone X trở lên đè vào nút
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 'calc(65px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #E2E8F0', zIndex: 20 },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '12px', gap: '4px', width: '50%', height: '100%', transition: 'color 0.2s' },
  navIcon: { fontSize: '22px' }
};