import React, { useState, useMemo } from 'react';
import styles from './VitalAlertList.module.css';

export const VitalAlertList = ({ alerts = [], onOpenModal }) => {
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Trích xuất danh sách các Cơ sở có trong dữ liệu cảnh báo
  const facilityOptions = useMemo(() => {
    const map = new Map();
    alerts.forEach((item) => {
      if (item.facilityName) {
        map.set(item.facilityName, item.facilityName);
      }
    });
    return Array.from(map.values());
  }, [alerts]);

  // Lọc danh sách cảnh báo theo 2 bộ lọc Select
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // 1. Lọc theo Cơ sở
      if (facilityFilter !== 'ALL' && item.facilityName !== facilityFilter) {
        return false;
      }

      // 2. Lọc theo Phân loại
      if (typeFilter === 'DANGER') {
        return item.alertType === 'DANGER' || item.alertType === 'BOTH';
      }
      if (typeFilter === 'NOTE_ONLY') {
        return item.alertType === 'NOTE_ONLY' || item.alertType === 'BOTH';
      }
      if (typeFilter === 'BOTH') {
        return item.alertType === 'BOTH';
      }

      return true;
    });
  }, [alerts, facilityFilter, typeFilter]);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.alertContainer}>
      {/* HEADER + THANH SELECT FILTER */}
      <div className={styles.alertHeader} style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className={styles.alertTitle} style={{ margin: 0 }}>
            <span>🚨</span> CẢNH BÁO & LƯU Ý TRONG CA ({filteredAlerts.length}/{alerts.length})
          </h3>
          <span className={styles.badgeAuto}>Tự động tổng hợp</span>
        </div>

        {/* BỘ BỘ LỌC CHỌN CƠ SỞ & LOẠI CẢNH BÁO */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          {/* SELECT LỌC CƠ SỞ */}
          {facilityOptions.length > 1 && (
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                color: '#881337',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">🏢 Tất cả Cơ sở</option>
              {facilityOptions.map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          )}

          {/* SELECT LỌC PHÂN LOẠI */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              color: '#881337',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">🔍 Tất cả loại ({alerts.length})</option>
            <option value="DANGER">🚨 Cảnh báo sức khỏe</option>
            <option value="NOTE_ONLY">📝 Lưu ý theo dõi</option>
            <option value="BOTH">⚠️ Có cả 2 (Bất thường + Note)</option>
          </select>
        </div>
      </div>

      {/* DANH SÁCH THẺ CẢNH BÁO / LƯU Ý */}
      {filteredAlerts.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#9f1239', fontSize: '13px', fontWeight: '600' }}>
          Không có đối tượng nào phù hợp với bộ lọc đã chọn.
        </div>
      ) : (
        <div className={styles.alertGrid}>
          {filteredAlerts.map((item, idx) => {
            const isDanger = item.alertType === 'DANGER';
            const isNoteOnly = item.alertType === 'NOTE_ONLY';
            const isBoth = item.alertType === 'BOTH';

            // Màu viền card theo loại
            let borderColor = '#e11d48'; // Đỏ
            if (isNoteOnly) borderColor = '#d97706'; // Vàng cam
            if (isBoth) borderColor = '#7c3aed'; // Tím nổi bật

            return (
              <div 
                key={idx} 
                className={styles.alertCard}
                onClick={() => onOpenModal && onOpenModal(item.elder || item)}
                style={{
                  cursor: 'pointer',
                  borderLeft: `5px solid ${borderColor}`,
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '6px' }}>
                  <span className={styles.roomTag}>
                    PHÒNG {item.roomNumber} • {item.facilityName}
                  </span>

                  {/* VÙNG CHỨA BADGES (CÓ THỂ HIỂN THỊ CẢ 2 NẾU LÀ TRƯỜNG HỢP BOTH) */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {(isDanger || isBoth) && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#ffe4e6',
                        color: '#e11d48',
                        whiteSpace: 'nowrap'
                      }}>
                        🚨 Cảnh báo sức khỏe
                      </span>
                    )}

                    {(isNoteOnly || isBoth) && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        whiteSpace: 'nowrap'
                      }}>
                        📝 Lưu ý theo dõi
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.elderName}>{item.elderName}</div>

                {/* KHỐI NỘI DUNG HIỂN THỊ */}
                <div style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: isBoth ? '#f3e8ff' : (isDanger ? '#fff1f2' : '#fffbeb'),
                  border: isBoth ? '1px solid #e9d5ff' : (isDanger ? '1px solid #ffe4e6' : '1px solid #fef3c7')
                }}>
                  {/* Hiển thị chỉ số bất thường */}
                  {(isDanger || isBoth) && item.issueDetail && (
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', marginBottom: item.staffNote ? '4px' : '0' }}>
                      ⚠️ {item.issueDetail}
                    </div>
                  )}

                  {/* Hiển thị ghi chú của nhân viên */}
                  {(isNoteOnly || isBoth) && item.staffNote && (
                    <div style={{ fontSize: '12px', fontWeight: '600', color: isBoth ? '#6b21a8' : (isDanger ? '#881337' : '#78350f'), fontStyle: 'italic' }}>
                      📝 Ghi chú NV: "{item.staffNote}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};