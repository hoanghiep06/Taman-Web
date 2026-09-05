import { Modal } from '../../../components/Modal';
import styles from './ConfirmDeleteModal.module.css';

export const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Xóa Vĩnh Viễn' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title || '⚠️ Xác Nhận Xóa'}>
      <p className={styles.message}>{message}</p>
      <p className={styles.warning}>Hành động này không thể hoàn tác.</p>

      <div className={styles.actions}>
        <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
        <button type="button" onClick={onConfirm} className={styles.confirmBtn}>{confirmLabel}</button>
      </div>
    </Modal>
  );
};