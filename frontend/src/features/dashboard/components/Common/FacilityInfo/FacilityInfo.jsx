import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../../../contexts/AuthContext';
import { facilitiesApi } from '../../../../users/api/facilitiesApi';
import { ROLES } from '../../../../../utils/constants';
import styles from './FacilityInfo.module.css';

export const FacilityInfo = () => {
  const { user } = useContext(AuthContext);
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin không gắn với 1 cơ sở cụ thể (facility_id = null) — không cần gọi API, hiển thị nhãn chung.
    if (user?.role === ROLES.ADMIN || !user?.facility_id) {
      setLoading(false);
      return;
    }

    // Chưa có endpoint GET /admin/facilities/{id} riêng, nên phải lấy toàn bộ danh sách
    // rồi tự lọc theo facility_id của user đang đăng nhập.
    facilitiesApi.getAllFacilities()
      .then((data) => {
        const matched = data.find((f) => f.id === user.facility_id);
        setFacility(matched || null);
      })
      .catch((err) => {
        console.error('Lỗi tải thông tin cơ sở:', err);
        setFacility(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const displayName = () => {
    if (user?.role === ROLES.ADMIN) return 'Toàn hệ thống (mọi cơ sở)';
    if (loading) return 'Đang tải...';
    return facility?.name || 'Chưa xác định cơ sở';
  };

  return (
    <section className={styles.card}>
      <div className={styles.icon}>🏥</div>

      <div>
        <div className={styles.label}>
          Cơ sở đang làm việc
        </div>

        <div className={styles.name}>
          {displayName()}
        </div>
      </div>
    </section>
  );
};