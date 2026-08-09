import React, { useState, useMemo } from 'react';
import styles from './ElderGridSelect.module.css';

export const ElderGridSelect = ({ 
  elders = [], 
  weightDueList = [], 
  viewMode = 'VITALS', 
  onOpenModal, 
  role = 'CARESTAFF',
  canManageWeightDue = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Map dữ liệu cân nặng từ Backend vào Elder
  const weightMap = useMemo(() => {
    const map = new Map();
    (weightDueList || []).forEach(item => {
      map.set(item.elder_id, item);
    });
    return map;
  }, [weightDueList]);

  // Gom nhóm danh sách theo Cơ sở và Phòng
  const groupedData = useMemo(() => {
    if (!elders || elders.length === 0) return {};
    const sorted = [...elders].sort((a, b) => {
      const facA = a.facilityName || '';
      const facB = b.facilityName || '';
      if (facA !== facB) return facA.localeCompare(facB);
      return String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), undefined, { numeric: true });
    });

    const grouped = {};
    sorted.forEach((elder) => {
      const facilityKey = elder.facilityName || 'Cơ sở';
      const roomKey = elder.roomNumber || 'Chưa xếp phòng';
      if (!grouped[facilityKey]) grouped[facilityKey] = {};
      if (!grouped[facilityKey][roomKey]) grouped[facilityKey][roomKey] = [];
      grouped[facilityKey][roomKey].push(elder);
    });
    return grouped;
  }, [elders]);

  if (elders.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b', fontWeight: 'bold' }}>
        {viewMode === 'WEIGHT' ? 'Hiện không có cụ nào đến hạn cân nặng' : 'Không tìm thấy danh sách phù hợp'}
      </div>
    );
  }

  // Hàm lấy Class hiển thị màu sắc theo Chế độ xem
  const getCardStyle = (elder) => {
    if (viewMode === 'WEIGHT') {
      const weightInfo = weightMap.get(elder.id);
      const isOverdue = weightInfo?.statusFlag === 'OVERDUE' || weightInfo?.isOverdue;
      if (isOverdue) return styles.weightCardOverdue;
      return styles.weightCardWarning;
    }

    // Chế độ SINH HIỆU (Chỉ dùng màu sinh hiệu cũ)
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
          <h3 className={styles.sectionTitle}>
            {viewMode === 'WEIGHT' ? '⚖️ DANH SÁCH CỤ TỚI HẠN CÂN NẶNG' : '📋 DANH SÁCH THEO DÕI SỨC KHỎE KHU VỰC'}
          </h3>
          <span className={styles.countBadge}>{elders.length} người</span>
        </div>
        <button type="button" className={styles.btnToggleCollapse}>
          {isCollapsed ? 'Mở danh sách' : 'Thu gọn danh sách'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* THANH CHÚ THÍCH MÀU SẮC TÁCH BIỆT THEO CHẾ ĐỘ XEM */}
          {viewMode === 'VITALS' ? (
            <div className={styles.legendBar}>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#ffffff' }}></span> Chưa đo</div>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#bbf7d0' }}></span> Đã đo</div>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fca5a5' }}></span> Nguy hiểm</div>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fef08a' }}></span> Đã sửa</div>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fed7aa' }}></span> Nguy hiểm + Sửa</div>
            </div>
          ) : (
            <div className={styles.legendBar} style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}></span> 🚨 Quá hạn cân (&gt;30 ngày)</div>
              <div className={styles.legendItem}><span className={styles.colorDot} style={{ backgroundColor: '#fef3c7', borderColor: '#d97706' }}></span> ⏳ Sắp đến hạn cân (25-29 ngày)</div>
            </div>
          )}

          <div className={styles.facilityGroupList}>
            {Object.entries(groupedData).map(([facilityName, rooms]) => (
              <div key={facilityName} className={styles.facilityBlock}>
                <div className={styles.facilityTitle}>{facilityName}</div>
                <div className={styles.roomsContainer}>
                  {Object.entries(rooms).map(([roomNumber, elderList]) => (
                    <div key={roomNumber} className={styles.roomCardBox}>
                      <div className={styles.roomHeader}>
                        <span>Phòng {roomNumber}</span>
                        <span className={styles.roomElderCount}>{elderList.length} người</span>
                      </div>
                      <div className={styles.elderMiniGrid}>
                        {elderList.map((elder) => {
                          const cardStyle = getCardStyle(elder);
                          const weightInfo = weightMap.get(elder.id);

                          return (
                            <div
                              key={elder.id}
                              onClick={() => onOpenModal(elder)}
                              className={`${styles.cardItem} ${cardStyle}`}
                            >
                              {viewMode === 'VITALS' && elder.hasAbnormal && (
                                <span className={styles.alertLight}>🚨</span>
                              )}

                              <div className={styles.elderName}>{elder.fullName}</div>

                              {/* NỘI DUNG HIỂN THỊ TÁCH BIỆT */}
                              {viewMode === 'WEIGHT' ? (
                                <div className={styles.weightStatusTag}>
                                  {weightInfo?.statusFlag === 'OVERDUE' || weightInfo?.isOverdue ? (
                                    <span style={{ color: '#dc2626', fontWeight: '800' }}>
                                      🚨 {
                                        weightInfo?.lastWeightDate === null
                                          ? 'Chưa từng cân'
                                          : (weightInfo?.daysSinceLastWeight > 30
                                            ? `Quá hạn ${weightInfo.daysSinceLastWeight - 30} ngày`
                                            : 'Đến hạn cân hôm nay')
                                      }
                                    </span>
                                  ) : (
                                    <span style={{ color: '#b45309', fontWeight: '700' }}>
                                      ⏳ Còn {weightInfo?.daysRemaining ?? 0} ngày
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className={styles.actionTag}>
                                  {role.toUpperCase().includes('DOCTOR')
                                    ? '🔍 Soi'
                                    : (elder.isMeasured ? '✏️ Sửa' : '➕ Đo')}
                                </div>
                              )}
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