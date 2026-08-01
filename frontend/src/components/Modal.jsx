import { useEffect } from 'react';
import styles from './Modal.module.css';

const SIZE_MAP = { sm: 420, md: 550, lg: 700, xl: 950 };

/**
 * Khung Modal dùng chung cho toàn app.
 * Thay thế phần overlay/header/close-button đang bị lặp lại ở mọi modal riêng lẻ.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} title
 * @param {string} [subtitle]
 * @param {'sm'|'md'|'lg'|'xl'} [size='md'] - sm=420px, md=550px, lg=700px, xl=950px
 * @param {React.ReactNode} [footer] - vùng nút hành động cố định ở đáy modal
 * @param {React.ReactNode} children
 */
export const Modal = ({ isOpen, onClose, title, subtitle, size = 'md', footer, headerActions, children }) => {
  // Cho phép nhấn ESC để đóng modal — hành vi chuẩn UX còn thiếu ở bản cũ
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        style={{ maxWidth: SIZE_MAP[size] || SIZE_MAP.md }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          <div className={styles.headerRight}>
            {headerActions}
            <button onClick={onClose} className={styles.closeBtn} aria-label="Đóng">
              ✕
            </button>
          </div>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};