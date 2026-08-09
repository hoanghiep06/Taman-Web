import React, { useState, useEffect, useMemo } from 'react';
import { exportReportAsJPG } from './ShiftReportView';
import styles from './ShiftReportHistoryModal.module.css';

const SHIFT_PALETTE = [
  { bg: '#f0f9ff', border: '#0284c7', badgeBg: '#e0f2fe', badgeColor: '#0369a1' },
  { bg: '#fdf4ff', border: '#c084fc', badgeBg: '#fae8ff', badgeColor: '#86198f' },
  { bg: '#f0fdf4', border: '#22c55e', badgeBg: '#dcfce7', badgeColor: '#15803d' },
  { bg: '#fffbeb', border: '#f59e0b', badgeBg: '#fef3c7', badgeColor: '#b45309' },
  { bg: '#fff1f2', border: '#f43f5e', badgeBg: '#ffe4e6', badgeColor: '#be123c' },
];

const getShiftColorStyle = (shiftDate, shiftType) => {
  const key = `${shiftDate}_${shiftType}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SHIFT_PALETTE.length;
  return SHIFT_PALETTE[index];
};

export const ShiftReportHistoryModal = ({ isOpen, onClose, facilityId, onFetchArchived, role = 'CARESTAFF' }) => {
  const currentRole = (role || '').toUpperCase();
  const isAdminOrManager = currentRole.includes('ADMIN') || currentRole.includes('MANAGER');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState('');
  const [limitDays, setLimitDays] = useState(7);

  const [showAuditLogsToggle, setShowAuditLogsToggle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, targetDate, shiftType, limitDays, showAuditLogsToggle]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await onFetchArchived({
        limit_days: targetDate ? undefined : limitDays,
        target_date: targetDate || undefined,
        shift_type: shiftType || undefined,
        include_history: showAuditLogsToggle && isAdminOrManager
      });
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableFacilities = useMemo(() => {
    const map = new Map();
    reports.forEach((r) => {
      if (r.facility_id) {
        map.set(String(r.facility_id), r.facility_name || `Cơ sở ${r.facility_id}`);
      }
    });
    return Array.from(map.entries());
  }, [reports]);

  const filteredReports = reports.filter((r) => {
    if (targetDate && r.shift_date !== targetDate) return false;
    if (shiftType && r.shift_type !== shiftType) return false;
    if (selectedFacilityFilter && String(r.facility_id) !== String(selectedFacilityFilter)) return false;

    const kw = searchTerm.toLowerCase().trim();
    if (!kw) return true;

    return (
      (r.reporter_name && r.reporter_name.toLowerCase().includes(kw)) ||
      (r.formatted_elder_descriptions && r.formatted_elder_descriptions.toLowerCase().includes(kw)) ||
      (r.handover_notes && r.handover_notes.toLowerCase().includes(kw)) ||
      (r.facility_name && r.facility_name.toLowerCase().includes(kw))
    );
  });

  const cleanElderText = (rawText) => {
    if (!rawText) return '';
    return rawText.replace(/\bCụ\s+/gi, '');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalBox}>

        {/* HEADER MODAL */}
        <div className={styles.header}>
          <h3 className={styles.title}>📚 TRA CỨU BÁO CÁO GIAO CA QUÁ KHỨ</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {/* BỘ LỌC TÌM KIẾM SMART GRID */}
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>🔍 Tìm kiếm</label>
            <input
              type="text"
              placeholder="Tên, nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>🏢 Cơ sở</label>
            <select
              value={selectedFacilityFilter}
              onChange={(e) => setSelectedFacilityFilter(e.target.value)}
              className={styles.filterInput}
            >
              <option value="">Tất cả Cơ sở</option>
              {availableFacilities.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>📅 Chọn ngày</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>⏰ Chọn ca</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className={styles.filterInput}
            >
              <option value="">Tất cả ca</option>
              <option value="Sang">Ca Sáng</option>
              <option value="Toi">Ca Tối</option>
            </select>
          </div>
        </div>

        {/* THANH LỌC NHANH VÀ VẾT SỬA */}
        <div className={styles.quickBar}>
          <span className={styles.quickLabel}>Nhanh:</span>
          {[3, 7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => { setLimitDays(d); setTargetDate(''); }}
              className={styles.quickBtn}
              style={{
                background: limitDays === d && !targetDate ? '#0284c7' : '#fff',
                color: limitDays === d && !targetDate ? '#fff' : '#333',
              }}
            >
              {d} ngày
            </button>
          ))}

          {isAdminOrManager && (
            <div className={styles.auditToggleBox}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>🛡️ Vết sửa:</span>
              <input
                type="checkbox"
                checked={showAuditLogsToggle}
                onChange={(e) => setShowAuditLogsToggle(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* DANH SÁCH BÁO CÁO */}
        <div className={styles.reportList}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontWeight: 'bold' }}>⏳ Đang tải dữ liệu...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không thấy báo cáo giao ca phù hợp.</div>
          ) : (
            filteredReports.map((item, idx) => {
              const colorStyle = isAdminOrManager 
                ? getShiftColorStyle(item.shift_date, item.shift_type)
                : { bg: '#f8fafc', border: '#cbd5e1', badgeBg: '#0284c7', badgeColor: '#fff' };

              return (
                <div 
                  key={idx} 
                  className={styles.reportCard}
                  style={{ 
                    backgroundColor: colorStyle.bg, 
                    borderLeft: `5px solid ${colorStyle.border}`,
                    border: `1px solid ${colorStyle.border}`,
                  }}
                >
                  <div className={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.facilityTag}>
                        🏢 {item.facility_name || `CS ${item.facility_id}`}
                      </span>

                      <span className={styles.shiftTitle}>
                        Ca {item.shift_type} - {item.shift_date}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={() => exportReportAsJPG(item, [], true)}
                          className={styles.exportBtn}
                        >
                          📸 Tải ảnh Zalo
                        </button>
                      )}

                      <span className={styles.reporterTag}>
                        👤 {item.reporter_name}
                      </span>
                    </div>
                  </div>

                  <div className={styles.contentBox}>
                    {cleanElderText(item.formatted_elder_descriptions)}
                  </div>

                  {item.handover_notes && (
                    <div className={styles.handoverNote}>
                      <b>📌 Lưu ý ca sau:</b> {item.handover_notes}
                    </div>
                  )}

                  {showAuditLogsToggle && isAdminOrManager && item.edit_history && item.edit_history.length > 0 && (
                    <div className={styles.auditHistoryBox}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '4px' }}>
                        📜 Lịch sử chỉnh sửa ({item.edit_history.length} lần):
                      </div>
                      {item.edit_history.map((log, lIdx) => (
                        <div key={lIdx} className={styles.auditItem}>
                          <b>{log.actor_name}</b> ({new Date(log.created_at).toLocaleString('vi-VN')}): {log.payload}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};