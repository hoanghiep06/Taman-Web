import styles from './StatusBadge.module.css';

/**
 * Badge trạng thái dùng chung — thay cho badgeSuccess/badgeWarning/badgeError/
 * badgeUnchecked đang bị lặp lại giống hệt ở UserHistoryModal, GlobalHistoryTab,
 * RoomMatrixTab, SecurityLogsTab...
 *
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} variant
 */
export const StatusBadge = ({ variant = 'neutral', children }) => (
  <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>
);