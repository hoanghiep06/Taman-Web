import { NavLink } from 'react-router-dom';
import styles from './NavItem.module.css';

export const NavItem = ({ to, icon, label, variant = 'sidebar' }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `${styles.item} ${styles[variant]} ${isActive ? styles.active : ''}`
    }
  >
    <span className={styles.icon} aria-hidden="true">{icon}</span>
    <span className={styles.label}>{label}</span>
  </NavLink>
);