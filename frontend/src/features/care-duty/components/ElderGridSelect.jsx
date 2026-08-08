import React, { useState, useMemo } from 'react';
import styles from './ElderGridSelect.module.css';

export const ElderGridSelect = ({ elders = [], onOpenModal, role = 'CARESTAFF' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Nhóm & Sort sẵn dữ liệu: Cơ sở -> Phòng -> Danh sách Cụ
  const groupedData = useMemo(() => {
    if (!elders || elders.length === 0) return {};

    const sortedElders = [...elders].sort((a, b) => {
      const facA = a.facilityName || '';
      const facB = b.facilityName || '';
      if (facA !== facB) return facA.localeCompare(facB);

      const roomA = String(a.roomNumber || '');
      const roomB = String(b.roomNumber || '');
      if (roomA !== roomB) return roomA.localeCompare(roomB, undefined, { numeric: true });

      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    const grouped = {};
    sortedElders.forEach((elder) => {
      const facilityKey = elder.facilityName || 'Cơ sở chưa xác định';
      const roomKey = elder.roomNumber || 'Chưa xếp phòng';

      if (!grouped[facilityKey]) {
        grouped[facilityKey] = {};
      }
      if (!grouped[facilityKey][roomKey]) {
        grouped[facilityKey][roomKey] = [];
      }
      grouped[facilityKey][roomKey].push(elder);
    });

    return grouped;
  }, [elders]);

  if (elders.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
        Không tìm thấy thông tin Người Cao Tuổi.
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
      <div className={styles.sectionHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className={styles.sectionTitle}>📋 DANH SÁCH THEO DÕI SỨC KHỎE KHU VỰC</h3>
          <span className={styles.countBadge}>{elders.length} Cụ</span>
        </div>
        <button type="button" className={styles.btnToggleCollapse}>
          {isCollapsed ? '▼ Mở rộng danh sách' : '▲ Thu gọn danh sách'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className={styles.legendBar}>
            <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#ffffff' }}></span> Chưa đo</div>
            <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#bbf7d0' }}></span> Đã đo</div>
            <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fca5a5' }}></span> Nguy hiểm</div>
            <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fef08a' }}></span> Đã sửa</div>
            <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fed7aa' }}></span> Nguy hiểm + Sửa</div>
          </div>

          <div className={styles.facilityGroupList}>
            {Object.entries(groupedData).map(([facilityName, rooms]) => (
              <div key={facilityName} className={styles.facilityBlock}>
                <div className={styles.facilityTitle}>
                  🏢 {facilityName}
                </div>

                <div className={styles.roomsContainer}>
                  {Object.entries(rooms).map(([roomNumber, elderList]) => (
                    <div key={roomNumber} className={styles.roomCardBox}>
                      <div className={styles.roomHeader}>
                        <span>🚪 Phòng {roomNumber}</span>
                        <span className={styles.roomElderCount}>{elderList.length} Cụ</span>
                      </div>

                      <div className={styles.elderMiniGrid}>
                        {elderList.map((elder) => {
                          const statusClass = getStatusClass(elder);
                          return (
                            <div
                              key={elder.id}
                              onClick={() => onOpenModal(elder)}
                              className={`${styles.cardItem} ${statusClass}`}
                            >
                              {elder.hasAbnormal && <span className={styles.alertLight}>🚨</span>}
                              <div className={styles.elderName}>{elder.fullName}</div>
                              <div className={styles.actionTag}>
                                {isMedical 
                                  ? '🔍 Soi' 
                                  : elder.isMeasured ? '✏️ Sửa' : '➕ Đo'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};