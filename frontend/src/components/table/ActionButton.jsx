import styles from './ActionButton.module.css';

/**
 * Nút hành động nhỏ trong bảng (Sửa/Xóa/Khóa...).
 * Thay cho việc mỗi trang tự định nghĩa editBtn/deleteBtn với màu tay riêng.
 *
 * @param {'primary'|'danger'|'warning'|'success'} [variant='primary']
 */
export const ActionButton = ({ variant = 'primary', onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${styles.btn} ${styles[variant]}`}
  >
    {children}
  </button>
);