import { useState, useEffect } from 'react';
import { ROLES } from '../../../utils/constants';
import { Modal } from '../../../components/Modal';
import styles from './CreateUserModal.module.css'; // dùng chung style với CreateUserModal

const ALL_ROLE_OPTIONS = [
  { value: ROLES.ADMIN,       label: 'Quản trị viên cấp cao (Admin)' },
  { value: ROLES.MANAGER,     label: 'Quản lý cơ sở (Manager)' },
  { value: ROLES.DOCTOR,      label: 'Bác sĩ (Doctor)' },
  { value: ROLES.COORDINATOR, label: 'Điều phối viên (Coordinator)' },
  { value: ROLES.CAREGIVER,   label: 'Nhân viên chăm sóc (Caregiver)' },
];

const getAvailableRoles = (currentUserRole) => {
  if (currentUserRole === ROLES.ADMIN) return ALL_ROLE_OPTIONS;
  if (currentUserRole === ROLES.MANAGER) return ALL_ROLE_OPTIONS.filter((r) => r.value !== ROLES.ADMIN);
  return [];
};

export const UserEditModal = ({ isOpen, onClose, onSave, onResetPassword, targetUser, currentUserRole }) => {
  const [formData, setFormData] = useState(null);
  const availableRoles = getAvailableRoles(currentUserRole);
  const isManager = currentUserRole === ROLES.MANAGER;

  useEffect(() => {
    if (isOpen && targetUser) {
      setFormData({
        full_name: targetUser.full_name || '',
        phone_number: targetUser.phone_number || '',
        role: targetUser.role,
      });
    }
  }, [isOpen, targetUser]);

  if (!targetUser || !formData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      alert('Vui lòng nhập họ tên!');
      return;
    }
    // Manager không được tự đổi role user thành Admin (đồng bộ với hàng rào backend)
    if (isManager && formData.role === ROLES.ADMIN) {
      alert('Bạn không có quyền cấp quyền Quản trị viên cho tài khoản này!');
      return;
    }
    onSave(targetUser.id, formData);
  };

  const handleResetPassword = () => {
    if (!window.confirm(`Đặt lại mật khẩu về mặc định cho [${targetUser.username}]?`)) return;
    onResetPassword(targetUser.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={`✏️ Sửa Thông Tin: ${targetUser.full_name}`}>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Tên Đăng Nhập</label>
          <input type="text" className={styles.input} value={targetUser.username} disabled />
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
          <label className={styles.label}>Số Điện Thoại</label>
          <input
            type="text"
            className={styles.input}
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="Chưa cập nhật"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Chức Vụ Hệ Thống *</label>
          <select
            className={styles.select}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            disabled={targetUser.username === 'admin'}
          >
            {availableRoles.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.resetPasswordBtn}
          onClick={handleResetPassword}
          disabled={targetUser.username === 'admin'}
        >
          🔑 Đặt Lại Mật Khẩu Về Mặc Định
        </button>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
          <button type="submit" className={styles.saveBtn}>Lưu Thay Đổi</button>
        </div>
      </form>
    </Modal>
  );
};