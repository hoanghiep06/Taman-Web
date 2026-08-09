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
  CAREGIVER: 'Caregiver',
};

// ROLE LABELS
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.MANAGER]: 'Quản lý',

  [ROLES.DOCTOR]: 'Bác sĩ',

  [ROLES.COORDINATOR]: 'Điều phối viên',

  [ROLES.CAREGIVER]: 'Nhân viên chăm sóc',
};




// Ngưỡng cảnh báo y tế chuẩn
export const VITAL_LIMITS = {
  SPO2_WARNING: 95.0,
  BP_SYSTOLIC_HIGH: 150,
  BP_DIASTOLIC_HIGH: 90,
  BP_SYSTOLIC_LOW: 90,
  BP_DIASTOLIC_LOW: 60,
  TEMP_FEVER: 37.5,
  TEMP_ALARM: 38.5,
  PULSE_FAST: 100,
  PULSE_SLOW: 60,
};
