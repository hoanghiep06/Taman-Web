import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import styles from './AssetFormModal.module.css';

const EMPTY_FORM = { asset_name: '', description: '', room_id: '', elder_id: '' };

export const AssetFormModal = ({ isOpen, onClose, onSubmit, initialData, rooms, elders }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(initialData || EMPTY_FORM);
  }, [isOpen, initialData]);

  const availableElders = elders.filter((e) => e.room_id === parseInt(formData.room_id));

  const handleRoomChange = (e) => setFormData({ ...formData, room_id: e.target.value, elder_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ ...formData, elder_id: formData.elder_id ? parseInt(formData.elder_id) : null });
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={initialData ? '✏️ Cập Nhật Tài Sản' : '✨ Thêm Tài Sản'}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Tên Tài Sản / Vật Tư <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="VD: Máy trợ oxy Yuwell..."
            value={formData.asset_name}
            onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
            className={styles.input}
            autoFocus
          />
        </div>

        <div className={styles.formGroupRow}>
          <div className={styles.col}>
            <label className={styles.label}>
              Thuộc Phòng <span className={styles.required}>*</span>
            </label>
            <select required value={formData.room_id || ''} onChange={handleRoomChange} className={styles.select}>
              <option value="" disabled>-- Chọn Phòng --</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>Phòng {room.room_number}</option>
              ))}
            </select>
          </div>

          <div className={styles.col}>
            <label className={styles.label}>Người Sở Hữu</label>
            <select
              value={formData.elder_id || ''}
              onChange={(e) => setFormData({ ...formData, elder_id: e.target.value })}
              className={!formData.room_id ? styles.selectDisabled : styles.select}
              disabled={!formData.room_id}
            >
              <option value="">Tài sản chung phòng</option>
              {availableElders.map((elder) => (
                <option key={elder.id} value={elder.id}>👵 {elder.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Đặc điểm nhận dạng</label>
          <textarea
            placeholder="VD: Màu trắng, model 8F-5AW..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.textarea}
            rows="2"
          />
        </div>

        <div className={styles.footerActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || !formData.asset_name.trim() || !formData.room_id}
          >
            {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu Thay Đổi' : 'Thêm Tài Sản'}
          </button>
        </div>
      </form>
    </Modal>
  );
};