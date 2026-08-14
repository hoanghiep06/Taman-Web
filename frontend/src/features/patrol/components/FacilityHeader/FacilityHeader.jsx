
import React, { useState, useEffect } from 'react';
import { patrolApi } from '../../api/patrolApi';
import styles from './FacilityHeader.module.css';

export const FacilityHeader = ({ facilityId, facilityName }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Nếu không có ID (vd trường hợp lỗi data), bỏ qua việc fetch
    if (!facilityId) return;
    
    // Gọi API lấy thống kê riêng cho cơ sở này
    patrolApi.getAssetStats({ facility_id: facilityId })
      .then((res) => setStats(res))
      .catch((err) => console.error(`Lỗi tải stats cơ sở ${facilityId}:`, err));
      
  }, [facilityId]);

  return (
    <div className={styles.headerWrapper}>
      <h3 className={styles.facilityTitle}>🏢 {facilityName}</h3>
      
      {stats && (
        <div className={styles.statsContainer}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>
              Tiến độ chung: <b>{stats.counts.inspected_required}/{stats.counts.total_required_inspection}</b> đồ bắt buộc
            </span>
            <span className={styles.progressPercent}>
              {stats.progress.required_percentage}%
            </span>
          </div>
          <div className={styles.progressBarBg}>
            <div 
              className={`${styles.progressBarFill} ${stats.progress.is_completed ? styles.fillCompleted : ''}`}
              style={{ width: `${stats.progress.required_percentage}%` }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};