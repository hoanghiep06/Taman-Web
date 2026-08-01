import { useState } from 'react';
import { ROLES } from '../../../utils/constants';
import { Modal } from '../../../components/Modal';
import styles from './CreateUserModal.module.css';

const EMPTY_FORM = { username: '', full_name: '', password: '', role: ROLES.STAFF, is_active: true };

export const CreateUserModal = ({ isOpen, onClose, onSave, currentUserRole }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.full_name) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    onSave(formData);
    setFormData(EMPTY_FORM); // Reset form sau khi gửi
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="➕ Thêm Tài Khoản Nhân Sự Mới">
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Tên Đăng Nhập *</label>
          <input
            type="text"
            className={styles.input}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Họ và Tên Nhân Viên *</label>
          <input
            type="text"
            className={styles.input}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Mật Khẩu Khởi Tạo *</label>
          <input
            type="password"
            className={styles.input}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Nhập mật khẩu ban đầu..."
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Chức Vụ Hệ Thống *</label>
          <select
            className={styles.select}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value={ROLES.STAFF}>Nhân viên tuần tra (Staff)</option>
            <option value={ROLES.MANAGER}>Quản lý cơ sở (Manager)</option>
            {currentUserRole === ROLES.ADMIN && (
              <option value={ROLES.ADMIN}>Quản trị viên cấp cao (Admin)</option>
            )}
          </select>
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Hủy Bỏ
          </button>
          <button type="submit" className={styles.saveBtn}>
            Khởi Tạo Tài Khoản
          </button>
        </div>
      </form>
    </Modal>
  );
};