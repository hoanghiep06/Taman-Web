import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { eldersHealthApi } from '../api/eldersHealthApi';
import styles from './ElderHealthModal.module.css';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN');
};

export const ElderHealthModal = ({ isOpen, onClose, elder }) => {
  const [loading, setLoading] = useState(true);
  const [latestVital, setLatestVital] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen || !elder) return;

    const loadHealthData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [vitals, weights, profile] = await Promise.allSettled([
          eldersHealthApi.getVitalHistory(elder.id),
          eldersHealthApi.getWeightHistory(elder.id),
          eldersHealthApi.getHealthProfile(elder.id),
        ]);

        // Vitals/weight trả về mảng lịch sử — lấy bản ghi mới nhất theo thời gian đo
        if (vitals.status === 'fulfilled' && vitals.value?.length > 0) {
          const sorted = [...vitals.value].sort(
            (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
          );
          setLatestVital(sorted[0]);
        } else {
          setLatestVital(null);
        }

        if (weights.status === 'fulfilled' && weights.value?.length > 0) {
          const sorted = [...weights.value].sort(
            (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
          );
          setLatestWeight(sorted[0]);
        } else {
          setLatestWeight(null);
        }

        setHealthProfile(profile.status === 'fulfilled' ? profile.value : null);
      } catch (err) {
        console.error('Lỗi tải thông tin sức khỏe:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadHealthData();
  }, [isOpen, elder]);

  if (!elder) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={`❤️ Sức Khỏe: ${elder.full_name}`}>
      {loading ? (
        <div className={styles.loading}>Đang tải thông tin sức khỏe...</div>
      ) : loadError ? (
        <div className={styles.error}>Không thể tải đầy đủ dữ liệu sức khỏe. Vui lòng thử lại.</div>
      ) : (
        <div className={styles.content}>

          {/* Sinh hiệu gần nhất */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>📊 Sinh Hiệu Gần Nhất</h4>
            {latestVital ? (
              <>
                <div className={styles.vitalGrid}>
                  <div className={`${styles.vitalItem} ${latestVital.is_abnormal ? styles.vitalAbnormal : ''}`}>
                    <span className={styles.vitalLabel}>Huyết áp</span>
                    <span className={styles.vitalValue}>
                      {latestVital.bp_systolic ?? '—'}/{latestVital.bp_diastolic ?? '—'} mmHg
                    </span>
                  </div>
                  <div className={`${styles.vitalItem} ${latestVital.is_abnormal ? styles.vitalAbnormal : ''}`}>
                    <span className={styles.vitalLabel}>Mạch</span>
                    <span className={styles.vitalValue}>{latestVital.pulse ?? '—'} lần/phút</span>
                  </div>
                  <div className={`${styles.vitalItem} ${latestVital.is_abnormal ? styles.vitalAbnormal : ''}`}>
                    <span className={styles.vitalLabel}>SpO2</span>
                    <span className={styles.vitalValue}>{latestVital.spo2 ?? '—'}%</span>
                  </div>
                  <div className={`${styles.vitalItem} ${latestVital.is_abnormal ? styles.vitalAbnormal : ''}`}>
                    <span className={styles.vitalLabel}>Nhiệt độ</span>
                    <span className={styles.vitalValue}>{latestVital.temperature ?? '—'}°C</span>
                  </div>
                </div>
                {latestVital.is_abnormal && (
                  <p className={styles.abnormalWarning}>⚠️ Chỉ số bất thường — cần theo dõi</p>
                )}
                <p className={styles.measuredAt}>Đo lúc: {formatDateTime(latestVital.measured_at)}</p>
                {latestVital.notes && <p className={styles.vitalNotes}>Ghi chú: {latestVital.notes}</p>}
              </>
            ) : (
              <p className={styles.emptyText}>Chưa có dữ liệu sinh hiệu.</p>
            )}
          </section>

          {/* Cân nặng gần nhất */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>⚖️ Cân Nặng Gần Nhất</h4>
            {latestWeight ? (
              <p className={styles.weightValue}>
                {latestWeight.weight} kg
                <span className={styles.measuredAtInline}> — {latestWeight.measured_month}</span>
              </p>
            ) : (
              <p className={styles.emptyText}>Chưa có dữ liệu cân nặng.</p>
            )}
          </section>

          {/* Hồ sơ bệnh nền */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>🩺 Hồ Sơ Bệnh Nền</h4>
            {healthProfile ? (
              <div className={styles.profileGrid}>
                {healthProfile.chronic_diseases?.length > 0 && (
                  <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Bệnh mãn tính</span>
                    <div className={styles.tagList}>
                      {healthProfile.chronic_diseases.map((d, i) => (
                        <span key={i} className={styles.tag}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {healthProfile.drug_allergies?.length > 0 && (
                  <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Dị ứng thuốc</span>
                    <div className={styles.tagList}>
                      {healthProfile.drug_allergies.map((d, i) => (
                        <span key={i} className={`${styles.tag} ${styles.tagDanger}`}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {healthProfile.food_allergies?.length > 0 && (
                  <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Dị ứng thức ăn</span>
                    <div className={styles.tagList}>
                      {healthProfile.food_allergies.map((d, i) => (
                        <span key={i} className={`${styles.tag} ${styles.tagWarning}`}>{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {healthProfile.has_fall && (
                  <p className={styles.flagText}>🚨 Có tiền sử té ngã{healthProfile.fall_describe ? `: ${healthProfile.fall_describe}` : ''}</p>
                )}
                {healthProfile.has_stroke && (
                  <p className={styles.flagText}>🚨 Có tiền sử đột quỵ{healthProfile.stroke_describe ? `: ${healthProfile.stroke_describe}` : ''}</p>
                )}
                {healthProfile.has_cardiovascular && (
                  <p className={styles.flagText}>🚨 Có bệnh tim mạch{healthProfile.cardiovascular_describe ? `: ${healthProfile.cardiovascular_describe}` : ''}</p>
                )}
                {healthProfile.has_surgery && (
                  <p className={styles.flagText}>ℹ️ Tiền sử phẫu thuật{healthProfile.surgery_describe ? `: ${healthProfile.surgery_describe}` : ''}</p>
                )}
                {healthProfile.doctor_notes && (
                  <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Ghi chú của bác sĩ</span>
                    <p className={styles.doctorNotes}>{healthProfile.doctor_notes}</p>
                  </div>
                )}
                {!healthProfile.chronic_diseases?.length &&
                  !healthProfile.drug_allergies?.length &&
                  !healthProfile.food_allergies?.length &&
                  !healthProfile.has_fall &&
                  !healthProfile.has_stroke &&
                  !healthProfile.has_cardiovascular &&
                  !healthProfile.has_surgery && (
                    <p className={styles.emptyText}>Chưa ghi nhận bệnh nền hay dị ứng đặc biệt.</p>
                  )}
              </div>
            ) : (
              <p className={styles.emptyText}>Chưa có hồ sơ bệnh nền.</p>
            )}
          </section>

          {/* Góp ý từ báo cáo giao ca — CHƯA CÓ ENDPOINT BACKEND lọc theo elder cụ thể */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>📋 Góp Ý Từ Báo Cáo Giao Ca</h4>
            <p className={styles.pendingText}>
              Tính năng này cần API backend hỗ trợ lọc báo cáo giao ca theo từng cụ
              (hiện các endpoint giao ca chỉ lọc theo cơ sở/ngày, chưa có theo elder_id).
              Cần trao đổi thêm với team backend trước khi hoàn thiện phần này.
            </p>
          </section>

        </div>
      )}
    </Modal>
  );
};