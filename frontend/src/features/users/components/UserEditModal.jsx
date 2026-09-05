import { useState, useEffect } from 'react';
import { ROLES } from '../../../utils/constants';
import { Modal } from '../../../components/Modal';
import { facilitiesApi } from '../api/facilitiesApi';
import styles from './CreateUserModal.module.css';

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

export const UserEditModal = ({ isOpen, onClose, onSave, onResetPassword, targetUser, currentUserRole, currentUserFacilityId }) => {
  const [formData, setFormData] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const availableRoles = getAvailableRoles(currentUserRole);
  const isManager = currentUserRole === ROLES.MANAGER;
  const isAdmin = currentUserRole === ROLES.ADMIN;

  // Manager có cơ sở cố định: không được đổi cơ sở của người khác (đã bị giới hạn ngay từ đầu
  // chỉ thấy/sửa được người cùng cơ sở, nên field này không cần cho sửa — khóa cứng).
  // Manager KHÔNG có cơ sở cố định (quản lý toàn hệ thống), hoặc Admin: được tự do đổi cơ sở.
  const isManagerLockedToFacility = isManager && Boolean(currentUserFacilityId);
  const canPickFacility = isAdmin || (isManager && !currentUserFacilityId);

  useEffect(() => {
    if (isOpen && targetUser) {
      setFormData({
        full_name: targetUser.full_name || '',
        phone_number: targetUser.phone_number || '',
        role: targetUser.role,
        facility_id: targetUser.facility_id ?? '',
      });

      if (canPickFacility) {
        setLoadingFacilities(true);
        facilitiesApi.getAllFacilities()
          .then((data) => setFacilities(data))
          .catch((err) => {
            console.error('Lỗi tải danh sách cơ sở:', err);
            setFacilities([]);
          })
          .finally(() => setLoadingFacilities(false));
      }
    }
  }, [isOpen, targetUser, canPickFacility]);

  if (!targetUser || !formData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      alert('Vui lòng nhập họ tên!');
      return;
    }
    if (isManager && formData.role === ROLES.ADMIN) {
      alert('Bạn không có quyền cấp quyền Quản trị viên cho tài khoản này!');
      return;
    }

    const payload = {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      role: formData.role,
      // Manager có cơ sở cố định: không gửi facility_id thay đổi, giữ nguyên giá trị cũ của user
      // (không ép về facility của Manager vì đây là SỬA người đã có sẵn, không phải TẠO mới).
      facility_id: canPickFacility
        ? (formData.facility_id ? Number(formData.facility_id) : null)
        : targetUser.facility_id,
    };

    onSave(targetUser.id, payload);
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

        {/* Admin, hoặc Manager không cố định cơ sở: được tự chọn/đổi cơ sở cho tài khoản này */}
        {canPickFacility && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Cơ Sở</label>
            <select
              className={styles.select}
              value={formData.facility_id}
              onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
              disabled={loadingFacilities}
            >
              <option value="">
                {loadingFacilities ? 'Đang tải...' : '-- Không gắn cơ sở cụ thể --'}
              </option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Manager có cơ sở cố định: không hiển thị field sửa cơ sở vì đã bị khóa cứng theo cơ sở của Manager */}
        {isManagerLockedToFacility && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Cơ Sở</label>
            <input type="text" className={styles.input} value="Cùng cơ sở với bạn" disabled />
          </div>
        )}

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