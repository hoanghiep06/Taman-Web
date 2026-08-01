import styles from './GroupHeaderRow.module.css';

/**
 * Dòng tiêu đề nhóm trong bảng (vd: "🏠 Phòng 101 · 3 món").
 * Thay cho groupHeaderRow bị lặp lại giống hệt ở ElderManagerTab, AssetManagerTab.
 */
export const GroupHeaderRow = ({ icon, label, count, countLabel, colSpan }) => (
  <tr className={styles.row}>
    <td colSpan={colSpan} className={styles.cell}>
      {icon} {label}
      {count != null && <span className={styles.countBadge}>{count} {countLabel}</span>}
    </td>
  </tr>
);