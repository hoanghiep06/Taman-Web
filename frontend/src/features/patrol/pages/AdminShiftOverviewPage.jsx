import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patrolApi } from '../api/patrolApi';
import { FacilitySelector } from '../components/FacilitySelector/FacilitySelector';
import { AuditRandomModal } from '../components/Modals/AuditRandomModal';

export const AdminShiftOverviewPage = () => {
  const navigate = useNavigate();
  const [activeFacilityId, setActiveFacilityId] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Tải lại toàn bộ số liệu khi activeFacilityId thay đổi
  const fetchOverviewData = useCallback(async () => {
    try {
      const res = await patrolApi.getShiftProgress({ facility_id: activeFacilityId });
      setShiftData(res);
    } catch (err) {
      console.error("Lỗi tải tiến độ ca trực live:", err);
    }
  }, [activeFacilityId]);

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 8000);
    return () => clearInterval(interval);
  }, [fetchOverviewData]);

  const summary = shiftData?.summary || {
    total_assets: 0,
    checked_count: 0,
    missing_count: 0,
    unchecked_count: 0,
  };

  const totalRequired = summary.total_assets;
  const inspectedCount = summary.checked_count;
  const percentDone = totalRequired > 0 ? Math.round((inspectedCount / totalRequired) * 100) : 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px 60px' }}>
      {/* ── HEADER BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1F6F78 0%, #163F44 100%)',
        padding: '24px 28px', borderRadius: '18px', color: '#FFFFFF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 15px rgba(31, 111, 120, 0.2)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>Bảng Giám Sát Ca Trực (Live)</h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#A7F3D0' }}>
            {shiftData?.shift_info ? `Ca ${shiftData.shift_info.shift_type} • Ngày ${shiftData.shift_info.shift_date}` : 'Đang theo dõi thời gian thực'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAuditModalOpen(true)}
            style={{
              padding: '10px 18px', backgroundColor: '#F59E0B', color: '#FFFFFF',
              border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13.5px',
              cursor: 'pointer', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)'
            }}
          >
            🎲 Kiểm Tra 2 Ảnh Ngẫu Nhiên
          </button>

          <button
            onClick={() => navigate('/patrol/rooms')}
            style={{
              padding: '10px 18px', backgroundColor: '#FFFFFF', color: '#163F44',
              border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer'
            }}
          >
            🚪 Vào sảnh đi tuần
          </button>
        </div>
      </div>

      {/* ── BỘ LỌC CƠ SỞ (TABS) ── */}
      <div style={{
        marginTop: '20px', background: '#FFFFFF', padding: '12px 18px',
        borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex',
        alignItems: 'center', gap: '12px', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Lọc cơ sở:</span>
        <FacilitySelector 
          selectedId={activeFacilityId} 
          onChange={(newId) => setActiveFacilityId(newId)} 
        />
      </div>

      {/* ── METRICS OVERVIEW (4 THẺ KPI) ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px', marginTop: '20px'
      }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>TỔNG ĐỒ CẦN KIỂM</span>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
            {totalRequired}
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Tư trang bắt buộc trong ca</span>
        </div>

        <div style={{ background: '#F0FDF4', padding: '18px', borderRadius: '14px', border: '1px solid #BBF7D0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>ĐÃ KIỂM KÊ (XANH)</span>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#15803D', margin: '4px 0' }}>
            {inspectedCount}
          </div>
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>{percentDone}% hoàn tất</span>
        </div>

        <div style={{ background: '#F0F9FF', padding: '18px', borderRadius: '14px', border: '1px solid #BAE6FD' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7' }}>CHƯA KIỂM KÊ</span>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#0369A1', margin: '4px 0' }}>
            {summary.unchecked_count}
          </div>
          <span style={{ fontSize: '12px', color: '#0369A1' }}>Còn lại trong ca</span>
        </div>

        <div style={{ background: '#FEF2F2', padding: '18px', borderRadius: '14px', border: '1px solid #FECDD3' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>BÁO MẤT (VÀNG)</span>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#B91C1C', margin: '4px 0' }}>
            {summary.missing_count}
          </div>
          <span style={{ fontSize: '12px', color: '#991B1B' }}>Cần xác minh</span>
        </div>
      </div>

      {/* ── DANH SÁCH BÁO MẤT KÈM LÝ DO VÀ CƠ SỞ ── */}
      <div style={{
        marginTop: '28px', background: '#FFFFFF', border: '1px solid #E2E8F0',
        borderRadius: '16px', padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
            ⚠️ Danh Sách Tài Sản Báo Mất Trong Ca
          </h2>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            {shiftData?.reported_missing?.length || 0} trường hợp
          </span>
        </div>
        
        {shiftData?.reported_missing && shiftData.reported_missing.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shiftData.reported_missing.map((item) => {
              // CÚ PHÁP PHÒNG: Ghép Khu + Số phòng (VD: Khu A + 101 -> A101)
              const zoneLetter = item.zone_name ? item.zone_name.replace(/Khu\s*/i, '').trim() : '';
              const roomDisplayName = zoneLetter ? `${zoneLetter}${item.room_number}` : `Phòng ${item.room_number}`;

              return (
                <div key={item.asset_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: '12px', padding: '14px 18px', backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A', borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400E' }}>
                      {item.asset_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#B45309' }}>
                      👤 <b>{item.elder_name}</b> • Phòng <b style={{ color: '#0F172A' }}>{roomDisplayName}</b>
                    </div>
                    {item.facility_name && (
                      <div style={{ fontSize: '11.5px', color: '#78350F', fontWeight: 700 }}>
                        🏢 {item.facility_name}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                      fontSize: '13px', color: '#78350F', backgroundColor: '#FFFFFF',
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid #FCD34D'
                    }}>
                      <strong>Lý do:</strong> {item.note || 'Không có ghi chú chi tiết'}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#92400E', fontWeight: 700 }}>
                      🕒 {item.inspected_at}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '24px', textAlign: 'center', backgroundColor: '#F0FDF4',
            color: '#15803D', borderRadius: '12px', fontWeight: 600, fontSize: '14px'
          }}>
            ✅ Chưa có báo mất nào trong ca này.
          </div>
        )}
      </div>

      {/* ── MODAL AUDIT 2 ẢNH RANDOM ── */}
      <AuditRandomModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        initialFacilityId={activeFacilityId}
      />
    </div>
  );
};