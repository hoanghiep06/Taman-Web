import { useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { NavItem } from '../components/nav/NavItem';
import { useIsDesktop } from '../hooks/useIsDesktop';
import styles from './StaffLayout.module.css';

const NAV_ITEMS = [
  { to: '/rooms', icon: '📋', label: 'Đi Tuần' },
  { to: '/patrol/history', icon: '🕒', label: 'Lịch Sử' },
];

export const StaffLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.container}>
      {isDesktop && (
        <aside className={styles.railNav}>
          <div className={styles.railLogo}>TA</div>
          <nav className={styles.railMenu}>
            {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} variant="sidebar" />)}
          </nav>
        </aside>
      )}

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{(user?.role || 'NV').slice(0, 2).toUpperCase()}</div>
            <div className={styles.userText}>
              <span className={styles.greeting}>Xin chào,</span>
              <span className={styles.roleName}>{user?.role || 'Nhân viên'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>Thoát</button>
        </header>

        <main className={styles.mainContent}><Outlet /></main>

        {!isDesktop && (
          <nav className={styles.bottomNav}>
            {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} variant="bottom" />)}
          </nav>
        )}
      </div>
    </div>
  );
};