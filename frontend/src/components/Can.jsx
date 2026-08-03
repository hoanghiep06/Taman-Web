import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission, ACCESS } from '../utils/permissions';

/**
 * Component ẩn/hiện nội dung theo quyền hạn — thay thế cho việc rải
 * `{user?.role === ROLES.ADMIN && <button>...</button>}` khắp nơi.
 *
 * @example
 * <Can feature={FEATURES.INVENTORY} minLevel={ACCESS.EXECUTE}>
 *   <button onClick={handleCheckIn}>Bắt đầu kiểm kê</button>
 * </Can>
 *
 * @example Có fallback khi không đủ quyền (vd: hiện badge "Chỉ xem")
 * <Can feature={FEATURES.PRESCRIPTION} minLevel={ACCESS.FULL} fallback={<StatusBadge variant="neutral">Chỉ xem</StatusBadge>}>
 *   <button onClick={handleEditPrescription}>Sửa toa thuốc</button>
 * </Can>
 */
export const Can = ({ feature, minLevel = ACCESS.VIEW, children, fallback = null }) => {
  const { user } = useContext(AuthContext);
  if (!user) return fallback;
  return hasPermission(user.role, feature, minLevel) ? children : fallback;
};