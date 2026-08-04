import { useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { StatusBadge } from '../../../components/StatusBadge';
import { hasPermission, FEATURES, ACCESS } from '../../../utils/permissions';
import styles from './ElderHealthCard.module.css';

const FLAG_CONFIG = {
  red: { variant: 'danger', label: '🔴 Cần chú ý khẩn cấp' },
  yellow: { variant: 'warning', label: '🟡 Có lưu ý' },
  green: { variant: 'success', label: '🟢 Ổn định' },
};

/**
 * Thẻ tóm tắt sức khỏe 1 Cụ ở Dashboard Ca Live.
 * Header: Tên Cụ + vị trí (Khu + Số phòng, vd "Khu A - Phòng A101").
 * Body: sinh hiệu đo gần nhất + link toa thuốc (chỉ mở rộng với Bác sĩ/Manager/Admin).
 * Action: nút "Xem Lịch Sử Chuyên Sâu" (chỉ Bác sĩ/Manager/Admin).
 */
export const ElderHealthCard = ({ elder, onOpenDeepDive }) => {
  const { user } = useContext(AuthContext);
  const flag = FLAG_CONFIG[elder.flag] || FLAG_CONFIG.green;
  const canSeePrescription = hasPermission(user?.role, FEATURES.PRESCRIPTION, ACCESS.VIEW);
  const canSeeDeepDive = hasPermission(user?.role, FEATURES.DASHBOARD_HEALTH, ACCESS.EXECUTE);

  const v = elder.latestVitals || {};

  return (
    <div className={`${styles.card} ${styles[`border_${elder.flag}`]}`}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.roomTag}>
            {elder.zoneName ? `Khu ${elder.zoneName} - ` : ''}Phòng {elder.roomLabel}
          </span>
          <h4 className={styles.elderName}>{elder.fullName}</h4>
        </div>
        <StatusBadge variant={flag.variant}>{flag.label}</StatusBadge>
      </div>

      <div className={styles.vitalsRow}>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Huyết áp</span>
          <span className={styles.vitalValue}>{v.systolic != null ? `${v.systolic}/${v.diastolic}` : '—'}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>SpO2</span>
          <span className={styles.vitalValue}>{v.spo2 != null ? `${v.spo2}%` : '—'}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Nhiệt độ</span>
          <span className={styles.vitalValue}>{v.temperature != null ? `${v.temperature}°C` : '—'}</span>
        </div>
        <div className={styles.vitalItem}>
          <span className={styles.vitalLabel}>Mạch</span>
          <span className={styles.vitalValue}>{v.pulse != null ? v.pulse : '—'}</span>
        </div>
      </div>

      {canSeePrescription && elder.activePrescriptionSummary && (
        <div className={styles.prescriptionLine}>💊 {elder.activePrescriptionSummary}</div>
      )}

      {canSeeDeepDive && (
        <button className={styles.deepDiveBtn} onClick={() => onOpenDeepDive(elder.elderId)}>
          Xem Lịch Sử Chuyên Sâu →
        </button>
      )}
    </div>
  );
};