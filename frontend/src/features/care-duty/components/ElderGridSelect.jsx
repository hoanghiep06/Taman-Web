import React from 'react';
import styles from './ElderGridSelect.module.css';

export const ElderGridSelect = ({ elders = [], onOpenModal, role = 'CARESTAFF' }) => {
  if (elders.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
        🔎 Không tìm thấy Cụ nào phù hợp!
      </div>
    );
  }

  const isMedical = role.toUpperCase().includes('DOCTOR') || role.toUpperCase().includes('MANAGER');

  const getStatusClass = (elder) => {
    const { isMeasured, isEdited, hasAbnormal } = elder;
    if (!isMeasured) return styles.statusWhite;
    if (isEdited && hasAbnormal) return styles.statusOrange;
    if (isEdited) return styles.statusYellow;
    if (hasAbnormal) return styles.statusRed;
    return styles.statusGreen;
  };

  return (
    <div className={styles.container}>
      {/* Bảng chú thích mã màu trạng thái đậm đà */}
      <div className={styles.legendBar}>
        <div className={styles.legendItem}>
          <span className={styles.colorDot} style={{ backgroundColor: '#ffffff' }}></span> Chưa đo
        </div>
        <div className={styles.legendItem}>
          <span className={styles.colorDot} style={{ backgroundColor: '#bbf7d0' }}></span> Đã đo
        </div>
        <div className={styles.legendItem}>
          <span className={styles.colorDot} style={{ backgroundColor: '#fca5a5' }}></span> Nguy hiểm
        </div>
        <div className={styles.legendItem}>
          <span className={styles.colorDot} style={{ backgroundColor: '#fef08a' }}></span> Đã sửa
        </div>
        <div className={styles.legendItem}>
          <span className={styles.colorDot} style={{ backgroundColor: '#fed7aa' }}></span> Nguy hiểm + Sửa
        </div>
      </div>

      <div className={styles.gridList}>
        {elders.map((elder) => {
          const statusClass = getStatusClass(elder);
          return (
            <div
              key={elder.id}
              onClick={() => onOpenModal(elder)}
              className={`${styles.cardItem} ${statusClass}`}
            >
              {/* Đèn đỏ nhấp nháy góc phải trên nếu nguy hiểm */}
              {elder.hasAbnormal && <span className={styles.alertLight}>🚨</span>}

              <div>
                <div className={styles.roomNo}>Phòng {elder.roomNumber}</div>
                <div className={styles.elderName}>{elder.fullName}</div>
              </div>

              <div className={styles.actionTag}>
                {isMedical 
                  ? '🔍 Soi chỉ số' 
                  : elder.isMeasured ? '✏️ Chỉnh sửa' : '➕ Nhập mới'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};