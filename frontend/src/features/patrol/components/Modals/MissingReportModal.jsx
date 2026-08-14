import { useState, useEffect } from 'react';
import { Modal } from '../../../../components/Modal';
import styles from './MissingReportModal.module.css';

export const MissingReportModal = ({ isOpen, onClose, onSubmit }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) setNote('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (note.trim().length > 0) onSubmit(note);
  };

  const isEmpty = note.trim().length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="⚠️ Báo cáo sự cố / mất đồ">
      <p className={styles.subtitle}>Mô tả ngắn gọn lý do để lưu vào nhật ký kiểm kê.</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Không tìm thấy trong phòng, đã hỏi điều dưỡng..."
          className={styles.textarea}
          required
        />
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Quay lại</button>
          <button type="submit" disabled={isEmpty} className={styles.confirmBtn}>Xác nhận</button>
        </div>
      </form>
    </Modal>
  );
};