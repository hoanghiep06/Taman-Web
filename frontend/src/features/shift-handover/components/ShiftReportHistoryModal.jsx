import React, { useState, useEffect, useMemo } from 'react';
import { exportReportAsJPG } from './ShiftReportView';

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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '750px', maxHeight: '90vh', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>📚 TRA CỨU BÁO CÁO GIAO CA QUÁ KHỨ</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Tìm tên, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
          />

          <select
            value={selectedFacilityFilter}
            onChange={(e) => setSelectedFacilityFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', backgroundColor: '#fff' }}
          >
            <option value="">Tất cả Cơ sở</option>
            {availableFacilities.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
          />

          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', backgroundColor: '#fff' }}
          >
            <option value="">Tất cả ca</option>
            <option value="Sang">Ca Sáng</option>
            <option value="Toi">Ca Tối</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Nhanh:</span>
          {[3, 7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => { setLimitDays(d); setTargetDate(''); }}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: limitDays === d && !targetDate ? '#0284c7' : '#fff', color: limitDays === d && !targetDate ? '#fff' : '#333', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              {d} ngày
            </button>
          ))}

          {isAdminOrManager && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
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

        <div style={{ flex: 1, overflowY: 'auto' }}>
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
                  style={{ 
                    backgroundColor: colorStyle.bg, 
                    borderLeft: `5px solid ${colorStyle.border}`,
                    border: `1px solid ${colorStyle.border}`,
                    borderRadius: '12px', 
                    padding: '12px 14px', 
                    marginBottom: '10px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                        🏢 {item.facility_name || `CS ${item.facility_id}`}
                      </span>

                      <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                        Ca {item.shift_type} - {item.shift_date}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                      {isAdminOrManager && (
                        <button
                          type="button"
                          onClick={() => exportReportAsJPG(item, [], true)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #0284c7',
                            backgroundColor: '#e0f2fe',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#0369a1',
                            cursor: 'pointer'
                          }}
                        >
                          📸 Tải ảnh Zalo
                        </button>
                      )}

                      <span style={{ color: '#0369a1', fontWeight: '700', fontSize: '12px' }}>
                        👤 {item.reporter_name}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#1e293b', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '1.5' }}>
                    {cleanElderText(item.formatted_elder_descriptions)}
                  </div>

                  {item.handover_notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                      <b>📌 Lưu ý ca sau:</b> {item.handover_notes}
                    </div>
                  )}

                  {showAuditLogsToggle && isAdminOrManager && item.edit_history && item.edit_history.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '4px' }}>
                        📜 Lịch sử chỉnh sửa ({item.edit_history.length} lần):
                      </div>
                      {item.edit_history.map((log, lIdx) => (
                        <div key={lIdx} style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', marginBottom: '4px' }}>
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