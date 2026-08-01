import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import styles from './RoomFormModal.module.css';

export const RoomFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({ room_number: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động nạp dữ liệu nếu đang ở chế độ "Sửa", xóa trống nếu "Thêm mới"
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { room_number: '', description: '' });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={initialData ? '✏️ Cập Nhật Thông Tin Phòng' : '✨ Thêm Mới Khu Vực / Phòng'}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Số Phòng / Mã Khu Vực <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="VD: 101, VIP-1, Sảnh Chính..."
            value={formData.room_number}
            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            className={styles.input}
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Mô Tả Chức Năng</label>
          <textarea
            placeholder="VD: Phòng tiêu chuẩn 2 giường, Gần cửa sổ..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.textarea}
            rows="3"
          />
        </div>

        <div className={styles.footerActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
            Hủy Bỏ
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || !formData.room_number.trim()}
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu Thay Đổi' : 'Tạo Phòng Mới'}
          </button>
        </div>
      </form>
    </Modal>
  );
};