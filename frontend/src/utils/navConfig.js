import { ROLES } from './constants';
import { FEATURES, ACCESS, hasPermission } from './permissions';

/**
 * Danh sách toàn bộ mục điều hướng có thể có trong app.
 * Mỗi mục lọc theo 1 trong 2 cách:
 * - `roles`: danh sách vai trò cụ thể được thấy (dùng cho trang quản trị thuần, không có
 *   khái niệm "mức quyền" rõ ràng như Nhân Sự/Cấu Hình/Sao Lưu).
 * - `feature` + `minLevel`: dùng ma trận quyền trong permissions.js (dùng cho các tính năng
 *   có nhiều mức quyền khác nhau như Sức Khỏe, Kiểm Kê).
 *
 * Thêm trang mới -> chỉ cần thêm 1 dòng ở đây, KHÔNG cần sửa AdminLayout/StaffLayout.
 */
export const NAV_CONFIG = [
  {
    key: 'healthDashboard',
    icon: '🩺',
    label: 'Trạng Thái Sức Khỏe',
    to: '/health/dashboard',
    feature: FEATURES.DASHBOARD_HEALTH,
    minLevel: ACCESS.LIMITED,
  },
  {
    key: 'inventory',
    icon: '📋',
    label: 'Đi Tuần / Kiểm Kê',
    to: '/rooms',
    feature: FEATURES.INVENTORY,
    minLevel: ACCESS.EXECUTE,
  },
  {
    key: 'inventoryHistory',
    icon: '🕒',
    label: 'Lịch Sử Kiểm Kê',
    to: '/patrol/history',
    feature: FEATURES.INVENTORY,
    minLevel: ACCESS.EXECUTE,
  },
  {
    key: 'inventoryDashboard',
    icon: '📊',
    label: 'Thống Kê Kiểm Kê',
    to: '/dashboard',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    key: 'users',
    icon: '👥',
    label: 'Quản Lý Nhân Sự',
    to: '/users',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    key: 'catalog',
    icon: '🗂️',
    label: 'Quản Lý Danh Mục',
    to: '/catalog',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    key: 'settings',
    icon: '⚙️',
    label: 'Cấu Hình Hệ Thống',
    to: '/settings',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    key: 'backup',
    icon: '💾',
    label: 'Sao Lưu Dữ Liệu',
    to: '/backup',
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
];

/**
 * Lấy danh sách mục điều hướng mà 1 vai trò được thấy, theo đúng thứ tự khai báo ở trên.
 */
export const getNavItemsForRole = (role) =>
  NAV_CONFIG.filter((item) => {
    if (item.roles) return item.roles.includes(role);
    if (item.feature) return hasPermission(role, item.feature, item.minLevel ?? ACCESS.VIEW);
    return true;
  });