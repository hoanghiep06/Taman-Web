import { useContext, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ROLES } from '../utils/constants';
import { NavItem } from '../components/nav/NavItem';
import styles from './AdminLayout.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Giám Sát Ca Trực' },
  { to: '/users', icon: '👥', label: 'Quản Lý Nhân Sự' },
  { to: '/catalog', icon: '🗂️', label: 'Quản Lý Danh Mục' },
  { to: '/settings', icon: '⚙️', label: 'Cấu Hình Hệ Thống' },
];

export const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = user?.role === ROLES.ADMIN
    ? [...NAV_ITEMS, { to: '/backup', icon: '💾', label: 'Sao Lưu Dữ Liệu' }]
    : NAV_ITEMS;

  return (
    <div className={styles.container}>
      {drawerOpen && (
        <button className={styles.overlay} aria-label="Đóng menu" onClick={() => setDrawerOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logoCircle}>TA</div>
          <h2 className={styles.brandName}>TÂM AN</h2>
        </div>
        <nav className={styles.navMenu}>
          {navItems.map((item) => <NavItem key={item.to} {...item} variant="sidebar" />)}
        </nav>
      </aside>

      <div className={styles.mainContent}>
        <header className={styles.header}>
          <button className={styles.menuBtn} aria-label="Mở menu" onClick={() => setDrawerOpen(true)}>☰</button>
          <span className={styles.welcomeText}>Xin chào, <b>{user?.role}</b>!</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>🚪 Đăng Xuất</button>
        </header>
        <div className={styles.pageContent}><Outlet /></div>
      </div>
    </div>
  );
};