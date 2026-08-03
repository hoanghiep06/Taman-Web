import { ROLES } from './constants';

// Các mức quyền có thể có với 1 tính năng, xếp từ thấp -> cao.
export const ACCESS = {
  NONE: 0, // ❌ Không có quyền
  LIMITED: 1, // 🟡 Giới hạn
  VIEW: 2, // 👁️ Chỉ xem
  EXECUTE: 3, // 🟢 Thực hiện (nhập/sửa dữ liệu hiện tại, KHÔNG xóa)
  FULL: 4, // 🟢 Toàn quyền
};

// Độ sâu lịch sử được xem — riêng cho các màn hình có "xem lại quá khứ".
// Đơn vị: số ngày. null = không giới hạn (toàn bộ DB).
export const HISTORY_DEPTH_DAYS = {
  [ROLES.CAREGIVER]: 3,
  [ROLES.COORDINATOR]: 30,
  [ROLES.DOCTOR]: null,
  [ROLES.MANAGER]: null,
  [ROLES.ADMIN]: null,
};

export const getHistoryDepthDays = (role) => HISTORY_DEPTH_DAYS[role] ?? 3;

export const FEATURES = {
  INVENTORY: 'inventory', // Đi kiểm kê tư trang
  VITALS: 'vitals', // Đo sinh hiệu
  WEIGHT: 'weight', // Cân nặng
  SHIFT_REPORT: 'shiftReport', // Nhập báo cáo giao ca
  PRESCRIPTION: 'prescription', // Bác sĩ Kê/Sửa toa thuốc
  DASHBOARD_HEALTH: 'dashboardHealth', // Xem Dashboard & Lịch sử Y tế
  NOTIFICATIONS: 'notifications', // Gửi thông báo / Phản hồi
};

// ──── SỬA LỖI: bản trước gán nhầm FULL cho Vitals/Weight của Admin/Manager/Bác sĩ.
// Cập nhật lại CHÍNH XÁC 1-1 theo bảng phân quyền mới nhất bạn cung cấp.
export const PERMISSION_MATRIX = {
  [ROLES.ADMIN]: {
    [FEATURES.INVENTORY]: ACCESS.VIEW,
    [FEATURES.VITALS]: ACCESS.VIEW,
    [FEATURES.WEIGHT]: ACCESS.VIEW,
    [FEATURES.SHIFT_REPORT]: ACCESS.VIEW,
    [FEATURES.PRESCRIPTION]: ACCESS.FULL,
    [FEATURES.DASHBOARD_HEALTH]: ACCESS.FULL, // Toàn quyền, tất cả cơ sở
    [FEATURES.NOTIFICATIONS]: ACCESS.FULL, // Gửi toàn hệ thống
  },
  [ROLES.MANAGER]: {
    [FEATURES.INVENTORY]: ACCESS.VIEW,
    [FEATURES.VITALS]: ACCESS.VIEW,
    [FEATURES.WEIGHT]: ACCESS.VIEW,
    [FEATURES.SHIFT_REPORT]: ACCESS.VIEW,
    [FEATURES.PRESCRIPTION]: ACCESS.FULL,
    [FEATURES.DASHBOARD_HEALTH]: ACCESS.FULL,
    [FEATURES.NOTIFICATIONS]: ACCESS.FULL,
  },
  [ROLES.DOCTOR]: {
    [FEATURES.INVENTORY]: ACCESS.NONE,
    [FEATURES.VITALS]: ACCESS.VIEW,
    [FEATURES.WEIGHT]: ACCESS.VIEW,
    [FEATURES.SHIFT_REPORT]: ACCESS.VIEW,
    [FEATURES.PRESCRIPTION]: ACCESS.FULL,
    [FEATURES.DASHBOARD_HEALTH]: ACCESS.EXECUTE, // Xem chuyên sâu theo Cơ sở
    [FEATURES.NOTIFICATIONS]: ACCESS.EXECUTE, // Gửi chỉ đạo tới ĐP/NVCS
  },
  [ROLES.COORDINATOR]: {
    [FEATURES.INVENTORY]: ACCESS.EXECUTE,
    [FEATURES.VITALS]: ACCESS.EXECUTE,
    [FEATURES.WEIGHT]: ACCESS.EXECUTE,
    [FEATURES.SHIFT_REPORT]: ACCESS.FULL,
    [FEATURES.PRESCRIPTION]: ACCESS.VIEW,
    [FEATURES.DASHBOARD_HEALTH]: ACCESS.EXECUTE, // Xem ca live & Lịch sử
    [FEATURES.NOTIFICATIONS]: ACCESS.EXECUTE, // Nhận & Phản hồi Bác sĩ
  },
  [ROLES.CAREGIVER]: {
    [FEATURES.INVENTORY]: ACCESS.EXECUTE,
    [FEATURES.VITALS]: ACCESS.EXECUTE,
    [FEATURES.WEIGHT]: ACCESS.EXECUTE,
    [FEATURES.SHIFT_REPORT]: ACCESS.VIEW,
    [FEATURES.PRESCRIPTION]: ACCESS.VIEW,
    [FEATURES.DASHBOARD_HEALTH]: ACCESS.LIMITED, // Chỉ xem ca Live & Cảnh báo
    [FEATURES.NOTIFICATIONS]: ACCESS.VIEW, // Chỉ nhận chỉ đạo ca trực
  },
};

export const getAccessLevel = (role, feature) => PERMISSION_MATRIX[role]?.[feature] ?? ACCESS.NONE;
export const hasPermission = (role, feature, minLevel = ACCESS.VIEW) => getAccessLevel(role, feature) >= minLevel;

// Trạng Thái Sức Khỏe là trang chủ mặc định cho MỌI vai trò.
export const getHomeRoute = () => '/health/dashboard';

// Không vai trò nào có quyền XÓA sinh hiệu/cân nặng — chỉ sửa (giữ audit log).
export const canDeleteVitals = () => false;