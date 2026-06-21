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
    color: isActive ? '#1F4E78' : '#95A5A6',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  return (
    <div style={styles.mobileContainer}>
      {/* HEADER DI ĐỘNG */}
      <header style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>👤</div>
          <div>
            <div style={styles.greeting}>Xin chào,</div>
            <div style={styles.roleName}>{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Thoát</button>
      </header>

      {/* KHU VỰC NỘI DUNG CHÍNH (Sẽ cuộn được) */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>

      {/* THANH ĐIỀU HƯỚNG ĐÁY (BOTTOM NAVIGATION) */}
      <nav style={styles.bottomNav}>
        <NavLink to="/rooms" style={navLinkStyle}>
          <span style={styles.navIcon}>📋</span>
          Đi Tuần
        </NavLink>
        
        {/* ĐÃ SỬA: Đổi to="/staff-history" thành to="/patrol/history" cho khớp với App.jsx */}
        <NavLink to="/patrol/history" style={navLinkStyle}>
          <span style={styles.navIcon}>🕒</span>
          Lịch Sử
        </NavLink>
      </nav>
    </div>
  );
};

const styles = {
  mobileContainer: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F4F6F9', maxWidth: '480px', margin: '0 auto', boxShadow: '0 0 20px rgba(0,0,0,0.1)', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: '#FFF', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { fontSize: '24px', backgroundColor: '#E9EEF4', borderRadius: '50%', padding: '5px' },
  greeting: { fontSize: '12px', color: '#7F8C8D' },
  roleName: { fontSize: '14px', fontWeight: 'bold', color: '#1F4E78' },
  logoutBtn: { backgroundColor: 'transparent', color: '#E74C3C', border: '1px solid #E74C3C', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' },
  mainContent: { flex: 1, overflowY: 'auto', paddingBottom: '70px' }, 
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65px', backgroundColor: '#FFF', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #EAECEE', zIndex: 10 },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', fontSize: '12px', gap: '4px', width: '33%' },
  navIcon: { fontSize: '20px' }
};