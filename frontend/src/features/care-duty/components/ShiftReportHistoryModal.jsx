import React, { useState, useEffect } from 'react';

export const ShiftReportHistoryModal = ({ isOpen, onClose, facilityId, onFetchArchived }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State Bộ Lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [limitDays, setLimitDays] = useState(7);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, targetDate, shiftType, limitDays]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await onFetchArchived({
        limit_days: targetDate ? undefined : limitDays,
        target_date: targetDate || undefined,
        shift_type: shiftType || undefined
      });
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Lọc tìm kiếm chi tiết theo từ khóa
  const filteredReports = reports.filter((r) => {
    // 1. Kiểm tra ngày nếu chọn từ input date
    if (targetDate && r.shift_date !== targetDate) return false;

    // 2. Kiểm tra ca trực
    if (shiftType && r.shift_type !== shiftType) return false;

    // 3. Lọc theo từ khóa tìm kiếm
    const kw = searchTerm.toLowerCase().trim();
    if (!kw) return true;

    return (
      (r.reporter_name && r.reporter_name.toLowerCase().includes(kw)) ||
      (r.formatted_elder_descriptions && r.formatted_elder_descriptions.toLowerCase().includes(kw)) ||
      (r.handover_notes && r.handover_notes.toLowerCase().includes(kw))
    );
  });

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '680px', maxHeight: '88vh', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>📚 TRA CỨU BÁO CÁO GIAO CA QUÁ KHỨ</h3>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>

        {/* BỘ LỌC CẤP BÁCH: SEARCH, LỌC NGÀY VÀ CA TRỰC */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="🔍 Tìm tên người báo, diễn biến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600' }}
          />
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

        {/* NÚT CHỌN NHANH KHOẢNG NGÀY */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
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
          {(targetDate || shiftType || searchTerm) && (
            <button
              onClick={() => { setTargetDate(''); setShiftType(''); setSearchTerm(''); }}
              style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#ffe4e6', color: '#e11d48', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
            >
              Đặt lại
            </button>
          )}
        </div>

        {/* DANH SÁCH BÁO CÁO */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontWeight: 'bold' }}>⏳ Đang tải dữ liệu...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không thấy báo cáo giao ca nào khớp với bộ lọc.</div>
          ) : (
            filteredReports.map((item, idx) => (
              <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px', fontSize: '13px' }}>
                  <span>📅 Ca {item.shift_type} - Ngày {item.shift_date}</span>
                  <span style={{ color: '#0369a1' }}>👤 {item.reporter_name}</span>
                </div>
                <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#334155', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '1.4' }}>
                  {item.formatted_elder_descriptions}
                </div>
                {item.handover_notes && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                    <b>Lưu ý ca sau:</b> {item.handover_notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};