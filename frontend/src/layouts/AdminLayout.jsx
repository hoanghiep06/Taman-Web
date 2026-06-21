import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ROLES } from '../utils/constants';

export const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Hàm tạo style cho menu đang được chọn (Active)
  const navLinkStyle = ({ isActive }) => ({
    ...styles.navItem,
    backgroundColor: isActive ? '#34495E' : 'transparent',
    borderLeft: isActive ? '4px solid #2ECC71' : '4px solid transparent',
  });

  return (
    <div style={styles.container}>
      {/* CỘT SIDEBAR ĐIỀU HƯỚNG BÊN TRÁI */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoCircle}>TA</div>
          <h2 style={styles.brandName}>TÂM AN</h2>
        </div>

        <nav style={styles.navMenu}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            📊 Giám Sát Ca Trực
          </NavLink>
          <NavLink to="/users" style={navLinkStyle}>
            👥 Quản Lý Nhân Sự
          </NavLink>
          <NavLink to="/catalog" style={navLinkStyle}>
            🗂️ Quản Lý Danh Mục
          </NavLink>
          
          <NavLink to="/settings" style={navLinkStyle}>
            ⚙️ Cấu Hình Hệ Thống
          </NavLink>

          {/* Menu chỉ hiện cho Admin (Nếu có tính năng sao lưu) */}
          {user?.role === ROLES.ADMIN && (
            <NavLink to="/backup" style={navLinkStyle}>
              💾 Sao Lưu Dữ Liệu
            </NavLink>

          )}
        </nav>
      </aside>

      {/* KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI */}
      <main style={styles.mainContent}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.welcomeText}>Xin chào, <b>{user?.role}</b>!</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Đăng Xuất
          </button>
        </header>

        {/* NỘI DUNG TRANG ĐỘNG SẼ RENDER Ở ĐÂY */}
        <div style={styles.pageContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#F4F6F9', fontFamily: "'Segoe UI', sans-serif" },
  sidebar: { width: '260px', backgroundColor: '#1F4E78', color: '#FFF', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 10 },
  brand: { display: 'flex', alignItems: 'center', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logoCircle: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FFF', color: '#1F4E78', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', marginRight: '12px' },
  brandName: { margin: 0, fontSize: '20px', letterSpacing: '1px' },
  navMenu: { display: 'flex', flexDirection: 'column', padding: '20px 0', flex: 1 },
  navItem: { padding: '15px 20px', color: '#BDC3C7', textDecoration: 'none', fontSize: '15px', fontWeight: '500', transition: 'all 0.3s', display: 'flex', alignItems: 'center' },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '70px', backgroundColor: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 5 },
  headerLeft: { display: 'flex', alignItems: 'center' },
  welcomeText: { fontSize: '15px', color: '#34495E' },
  logoutBtn: { backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #FADBD8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' },
  pageContent: { flex: 1, padding: '30px', overflowY: 'auto' }
};