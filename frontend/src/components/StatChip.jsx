import styles from './StatChip.module.css';

/**
 * Ô hiển thị 1 chỉ số thống kê (số lớn + label nhỏ), có viền màu tuỳ chọn.
 * Thay cho statBox/reportStatChip/summaryChip bị lặp lại ở OverviewTab, ShiftHistoryTab...
 *
 * @param {'primary'|'success'|'danger'|'warning'|'neutral'} [variant='neutral'] - màu viền/số
 * @param {boolean} [bordered=true] - có viền màu trên cùng hay không
 */
export const StatChip = ({ label, value, variant = 'neutral', bordered = true }) => (
  <div className={`${styles.chip} ${bordered ? styles[`border_${variant}`] : ''}`}>
    <span className={styles.label}>{label}</span>
    <span className={`${styles.value} ${styles[`text_${variant}`]}`}>{value}</span>
  </div>
);