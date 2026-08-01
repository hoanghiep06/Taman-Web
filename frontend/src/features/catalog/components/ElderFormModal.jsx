import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import styles from './ElderFormModal.module.css';

const EMPTY_FORM = { full_name: '', room_id: '', notes: '' };

export const ElderFormModal = ({ isOpen, onClose, onSubmit, initialData, rooms }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(initialData || EMPTY_FORM);
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
      title={initialData ? '✏️ Cập Nhật Hồ Sơ Cụ' : '✨ Đăng Ký Hồ Sơ Lưu Trú'}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Họ và Tên Cụ <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="VD: Nguyễn Văn A..."
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className={styles.input}
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Xếp Phòng Lưu Trú <span className={styles.required}>*</span>
          </label>
          <select
            required
            value={formData.room_id || ''}
            onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
            className={styles.select}
          >
            <option value="" disabled>-- Chọn phòng cho Cụ --</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Phòng {room.room_number} {room.description ? `(${room.description})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Ghi chú y tế / Thói quen (Tùy chọn)</label>
          <textarea
            placeholder="VD: Cụ hay mất ngủ, cần ăn nhạt..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={styles.textarea}
            rows="3"
          />
        </div>

        <div className={styles.footerActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || !formData.full_name.trim() || !formData.room_id}
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu Thay Đổi' : 'Tạo Hồ Sơ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};