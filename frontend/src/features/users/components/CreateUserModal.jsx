import { useState, useEffect } from 'react';
import { ROLES } from '../../../utils/constants';
import { Modal } from '../../../components/Modal';
import { facilitiesApi } from '../api/facilitiesApi';
import styles from './CreateUserModal.module.css';

const buildEmptyForm = (defaultFacilityId) => ({
  username: '',
  full_name: '',
  password: '',
  role: ROLES.CAREGIVER,
  facility_id: defaultFacilityId ?? '',
  is_active: true,
});

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

export const CreateUserModal = ({ isOpen, onClose, onSave, currentUserRole, currentUserFacilityId }) => {
  const [formData, setFormData] = useState(buildEmptyForm(currentUserFacilityId));
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const availableRoles = getAvailableRoles(currentUserRole);
  const isManager = currentUserRole === ROLES.MANAGER;
  const isAdmin = currentUserRole === ROLES.ADMIN;

  // Reset form mỗi lần mở modal, gán sẵn facility của Manager nếu có.
  // Admin cần tải danh sách cơ sở để tự chọn — Manager không cần vì cơ sở đã bị khóa cứng.
  useEffect(() => {
    if (!isOpen) return;

    setFormData(buildEmptyForm(currentUserFacilityId));

    if (isAdmin) {
      setLoadingFacilities(true);
      facilitiesApi.getAllFacilities()
        .then((data) => setFacilities(data))
        .catch((err) => {
          console.error('Lỗi tải danh sách cơ sở:', err);
          setFacilities([]);
        })
        .finally(() => setLoadingFacilities(false));
    }
  }, [isOpen, currentUserFacilityId, isAdmin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.full_name) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    // Manager: khoá cứng facility_id = cơ sở của chính Manager, không cho ghi đè dù form có sửa được hay không —
    // đảm bảo an toàn ngay cả khi UI bị can thiệp, vì backend cũng tự ép lại giá trị này ở phía server.
    const payload = isManager
      ? { ...formData, facility_id: currentUserFacilityId }
      : { ...formData, facility_id: formData.facility_id ? Number(formData.facility_id) : null };

    onSave(payload);
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
            {availableRoles.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Admin: được tự chọn cơ sở cho tài khoản mới (hoặc để trống nếu không gắn cơ sở cụ thể) */}
        {isAdmin && (
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

        {/* Manager: cơ sở bị khoá cứng, chỉ hiển thị để biết, không cho sửa */}
        {isManager && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Cơ Sở</label>
            <input
              type="text"
              className={styles.input}
              value="Tài khoản sẽ thuộc cơ sở của bạn"
              disabled
            />
          </div>
        )}

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>Hủy Bỏ</button>
          <button type="submit" className={styles.saveBtn}>Khởi Tạo Tài Khoản</button>
        </div>
      </form>
    </Modal>
  );
};