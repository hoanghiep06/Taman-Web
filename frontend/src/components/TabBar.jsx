import styles from './TabBar.module.css';

/**
 * Thanh tab dùng chung.
 * variant='underline': kiểu tab dính liền nội dung bên dưới (UserHistoryModal).
 * variant='segmented': kiểu nút bo tròn trong khung xám (RestoreModal method toggle).
 *
 * @param {{key: string, label: string}[]} tabs
 * @param {string} activeKey
 * @param {(key: string) => void} onChange
 * @param {'underline'|'segmented'} [variant='underline']
 */
export const TabBar = ({ tabs, activeKey, onChange, variant = 'underline' }) => (
  <div className={`${styles.container} ${styles[variant]}`}>
    {tabs.map((tab) => {
      const isActive = tab.key === activeKey;
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`${styles.tab} ${styles[variant + (isActive ? 'Active' : 'Inactive')]}`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);