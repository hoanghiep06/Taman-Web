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

// SIDEBAR MENU
export const ROLE_NAVIGATION = {
  [ROLES.ADMIN]: [
    {
      to: '/dashboard',
      icon: '📊',
      label: 'Dashboard Ca Trực',
    },
    {
      to: '/staff',
      icon: '👥',
      label: 'Nhân sự',
    },
    {
      to: '/residents',
      icon: '🧓',
      label: 'Người cao tuổi',
    },
    {
      to: '/reports',
      icon: '📈',
      label: 'Báo cáo',
    },
    {
      to: '/system',
      icon: '⚙️',
      label: 'Hệ thống',
    },
  ],
  [ROLES.MANAGER]: [
    {
      to: '/dashboard',
      icon: '📊',
      label: 'Dashboard Ca Trực',
    },
    {
      to: '/shifts',
      icon: '📅',
      label: 'Ca trực',
    },
    {
      to: '/staff',
      icon: '👥',
      label: 'Nhân viên',
    },
    {
      to: '/residents',
      icon: '🧓',
      label: 'Người cao tuổi',
    },
    {
      to: '/reports',
      icon: '📈',
      label: 'Báo cáo',
    },
  ],
  [ROLES.DOCTOR]: [
    {
      to: '/dashboard',
      icon: '📊',
      label: 'Dashboard Ca Trực',
    },
    {
      to: '/health',
      icon: '❤️',
      label: 'Sức khỏe',
    },
    {
      to: '/medical-records',
      icon: '📋',
      label: 'Hồ sơ bệnh án',
    },
    {
      to: '/prescriptions',
      icon: '💊',
      label: 'Đơn thuốc',
    },
  ],
  [ROLES.COORDINATOR]: [
    {
      to: '/dashboard',
      icon: '📊',
      label: 'Dashboard Ca Trực',
    },
    {
      to: '/shifts',
      icon: '📅',
      label: 'Điều phối ca',
    },
    {
      to: '/notifications',
      icon: '🔔',
      label: 'Thông báo',
    },
    {
      to: '/reports',
      icon: '📈',
      label: 'Báo cáo',
    },
  ],
  [ROLES.CARE_STAFF]: [
    {
      to: '/dashboard',
      icon: '📊',
      label: 'Dashboard Ca Trực',
    },
    {
      to: '/my-residents',
      icon: '🧓',
      label: 'Cụ được giao',
    },
    {
      to: '/vital-signs',
      icon: '🩺',
      label: 'Sinh hiệu',
    },
    {
      to: '/medication',
      icon: '💊',
      label: 'Thuốc',
    },
  ],
};