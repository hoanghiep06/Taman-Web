export const UI_COLORS = {
  SUCCESS: '#2ECC71',      // 🟢 Đã kiểm kê và upload ảnh thành công
  INCIDENT: '#F1C40F',     // 🟡 Tài sản báo mất (Vang)
  PROCESSING: '#95A5A6',   // ⚪ Đang nằm trong hàng đợi xử lý ngầm
  UNCHECKED: '#E74C3C',    // 🚨 Tài sản trống, chưa sờ tới trong ca
  UPLOAD_ERROR: '#C0392B', // 🔴 Lỗi tải lên, cần bấm chụp lại
};


export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  DOCTOR: 'Doctor',
  COORDINATOR: 'Coordinator',
  CARE_STAFF: 'CareStaff',
};

// ROLE LABELS
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.MANAGER]: 'Quản lý',

  [ROLES.DOCTOR]: 'Bác sĩ',

  [ROLES.COORDINATOR]: 'Điều phối viên',

  [ROLES.CARE_STAFF]: 'Nhân viên chăm sóc',
};

