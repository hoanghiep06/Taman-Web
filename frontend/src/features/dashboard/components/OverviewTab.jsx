import React, { useState } from 'react';
import { UI_COLORS } from '../../../utils/constants';

export const OverviewTab = ({ dashboardData, shiftProgressLive, onOpenAudit }) => {
  // ──── 🔴 KHỞI TẠO CÁC BỘ LỌC ĐA NĂNG LIVE ────
  const [searchAsset, setSearchAsset] = useState('');
  const [searchElder, setSearchElder] = useState('');
  const [selectRoom, setSelectRoom] = useState('');

  if (!dashboardData) return null;

  const { current_shift } = dashboardData;

  const reportedMissingItems = shiftProgressLive?.reported_missing || [];
  const uncheckedItems = shiftProgressLive?.unchecked || [];

  const dynamicRoomsWithAnomalies = Array.from(
    new Set([
      ...reportedMissingItems.map((item) => String(item.room_number)),
      ...uncheckedItems.map((item) => String(item.room_number)),
    ])
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const executeFilter = (item) => {
    const matchAsset = item.asset_name.toLowerCase().includes(searchAsset.toLowerCase().trim());
    const matchElder = (item.elder_name || '').toLowerCase().includes(searchElder.toLowerCase().trim());
    const matchRoom = selectRoom === '' || String(item.room_number) === String(selectRoom);
    
    return matchAsset && matchElder && matchRoom;
  };

  const filteredMissing = reportedMissingItems.filter(executeFilter);
  const filteredUnchecked = uncheckedItems.filter(executeFilter);

  return (
    <div style={styles.container}>
      {/* KHỐI CHỈ SỐ TIẾN ĐỘ TỔNG QUAN */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div style={styles.titleBox}>
            <span style={styles.headerIcon}>⏱️</span>
            <h3 style={styles.cardTitle}>
              Ca Trực Hiện Tại: <span style={styles.shiftHighlight}>{current_shift.shift_type || 'Chưa mở ca'}</span>
            </h3>
          </div>
          
          {/* CỤM CHỈ BÁO REALTIME TÍCH HỢP NÚT AUDIT NGẪU NHIÊN CỦA MANAGER */}
          {current_shift.status === "In Progress" && (
            <div style={styles.headerRightActionsBox}>
              <button 
                onClick={() => onOpenAudit && onOpenAudit()} 
                style={styles.auditTriggerBtn}
                title="Bốc mẫu ngẫu nhiên ảnh nhân viên chụp để kiểm tra chống gian lận"
              >
                🕵️‍♂️ Thanh Tra Ảnh Ngẫu Nhiên
              </button>
              <span style={styles.livePulse}>● ĐANG DIỄN RA</span>
            </div>
          )}
        </div>
        
        {current_shift.status === "In Progress" ? (
          <>
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statBox, borderTop: '4px solid #3498DB' }}>
                <span style={styles.statLabel}>Tổng tài sản ca trực</span>
                <span style={styles.statValue}>{current_shift.total_assets}</span>
              </div>
              <div style={{ ...styles.statBox, borderTop: `4px solid ${UI_COLORS.SUCCESS || '#22C55E'}` }}>
                <span style={styles.statLabel}>Đã quét thành công</span>
                <span style={{ ...styles.statValue, color: '#16A34A' }}>{current_shift.inspected_count}</span>
              </div>
              <div style={{ ...styles.statBox, borderTop: `4px solid ${UI_COLORS.INCIDENT || '#EF4444'}` }}>
                <span style={styles.statLabel}>Phát hiện thất thoát</span>
                <span style={{ ...styles.statValue, color: '#DC2626' }}>{current_shift.lost_items_count}</span>
              </div>
              <div style={{ ...styles.statBox, borderTop: `4px solid #94A3B8` }}>
                <span style={styles.statLabel}>Chưa kiểm tra</span>
                <span style={{ ...styles.statValue, color: '#475569' }}>{current_shift.missing_items_count}</span>
              </div>
            </div>

            <div style={styles.progressSection}>
              <div style={styles.progressInfo}>
                <span style={styles.progressLabel}>Tổng tiến độ hoàn thành khu vực</span>
                <strong style={styles.progressValue}>{current_shift.progress_percentage}%</strong>
              </div>
              <div style={styles.barBg}>
                <div style={{ 
                  ...styles.barFill, 
                  width: `${current_shift.progress_percentage}%`, 
                  backgroundColor: current_shift.progress_percentage === 100 ? '#22C55E' : '#3498DB' 
                }} />
              </div>
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>Hệ thống đang trống. Hiện tại không có ca trực nào đang mở.</div>
        )}
      </div>

      {/* THANH ĐIỀU TỐC BỘ LỌC ĐA NĂNG PHONG CÁCH SAAS */}
      {current_shift.status === "In Progress" && (
        <div style={styles.filterConsoleCard}>
          <div style={styles.consoleTitle}>🔍 Bộ Lọc Rà Soát Sự Cố Nhanh</div>
          
          <div style={styles.filterInputsRow}>
            <div style={styles.inputControlWrapper}>
              <span style={styles.controlIcon}>📦</span>
              <input 
                type="text" 
                placeholder="Tìm tên thiết bị, đồ đạc..." 
                value={searchAsset}
                onChange={(e) => setSearchAsset(e.target.value)}
                style={styles.textInputStyle}
              />
              {searchAsset && <button onClick={() => setSearchAsset('')} style={styles.clearMiniX}>✕</button>}
            </div>

            <div style={styles.inputControlWrapper}>
              <span style={styles.controlIcon}>👵</span>
              <input 
                type="text" 
                placeholder="Tìm theo tên NCT sở hữu..." 
                value={searchElder}
                onChange={(e) => setSearchElder(e.target.value)}
                style={styles.textInputStyle}
              />
              {searchElder && <button onClick={() => setSearchElder('')} style={styles.clearMiniX}>✕</button>}
            </div>

            <div style={styles.selectControlWrapper}>
              <span style={styles.controlIcon}>📍</span>
              <select 
                value={selectRoom} 
                onChange={(e) => setSelectRoom(e.target.value)}
                style={styles.selectInputStyle}
              >
                <option value="">Tất cả phòng dính lỗi</option>
                {dynamicRoomsWithAnomalies.map((roomNum) => (
                  <option key={roomNum} value={roomNum}>Phòng {roomNum}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* KHỐI HIỂN THỊ CHI TIẾT SỰ CỐ SAU KHI QUA BỘ LỌC */}
      {current_shift.status === "In Progress" && (
        <div style={styles.detailGridContainer}>
          
          {/* CỘT TRÁI: DANH SÁCH VẬT TƯ BÁO MẤT (ĐÃ LỌC) */}
          <div style={styles.detailCard}>
            <div style={styles.detailCardHeader}>
              <div style={styles.boxTitleWithCount}>
                <span style={{ color: '#D97706', fontSize: '15px', fontWeight: '800' }}>⚠️ Tài Sản Báo Thất Thoát Khẩn Cấp</span>
                <span style={styles.countIndicatorTagOrange}>Tìm thấy: {filteredMissing.length}/{reportedMissingItems.length}</span>
              </div>
            </div>
            <div style={styles.listScrollBox}>
              {filteredMissing.length > 0 ? (
                filteredMissing.map((item, idx) => (
                  <div key={idx} style={{ ...styles.anomalyItemCard, borderLeft: '4px solid #D97706', backgroundColor: '#FFFBEB' }}>
                    <div style={styles.anomalyCardLine1}>
                      <strong style={styles.assetNameText}>{item.asset_name}</strong>
                      <span style={styles.roomBadgeMini}>Phòng {item.room_number}</span>
                    </div>
                    <div style={styles.anomalyCardLine2}>
                      <span style={styles.subTextOwner}>👤 Sở hữu: <b style={{color: '#B45309'}}>{item.elder_name || "Tài sản chung của phòng"}</b></span>
                      <span>⏱️ Báo lúc: <b>{item.inspected_at}</b></span>
                      {item.note && <p style={styles.noteReportText}>💬 Lý do: {item.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptySearchBox}>Không tìm thấy món đồ báo mất nào khớp với từ khóa.</div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH VẬT TƯ BỊ BỎ SÓT (ĐÃ LỌC) */}
          <div style={styles.detailCard}>
            <div style={styles.detailCardHeader}>
              <div style={styles.boxTitleWithCount}>
                <span style={{ color: '#475569', fontSize: '15px', fontWeight: '800' }}>🚨 Danh Mục Bỏ Sót Chưa Từng Quét Ảnh</span>
                <span style={styles.countIndicatorTagGray}>Tìm thấy: {filteredUnchecked.length}/{uncheckedItems.length}</span>
              </div>
            </div>
            <div style={styles.listScrollBox}>
              {filteredUnchecked.length > 0 ? (
                filteredUnchecked.map((item, idx) => (
                  <div key={idx} style={{ ...styles.anomalyItemCard, borderLeft: '4px solid #64748B', backgroundColor: '#F8FAFC' }}>
                    <div style={styles.anomalyCardLine1}>
                      <strong style={styles.assetNameText}>{item.asset_name}</strong>
                      <span style={styles.roomBadgeMuted}>Phòng {item.room_number}</span>
                    </div>
                    <p style={styles.subTextOwner}>👤 Sở hữu: <b style={{color: '#475569'}}>{item.elder_name || "Tài sản chung của phòng"}</b></p>
                  </div>
                ))
              ) : (
                <div style={styles.emptySearchBox}>Không tìm thấy món đồ bỏ sót nào khớp với từ khóa.</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  mainCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' },
  titleBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerIcon: { fontSize: '20px' },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' },
  shiftHighlight: { color: '#E67E22', backgroundColor: '#FFF7ED', padding: '4px 10px', borderRadius: '8px', fontSize: '15px' },
  
  // NÚT TRÍCH XUẤT ẢNH QUẢN TRÝ
  headerRightActionsBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  auditTriggerBtn: { backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s ease' },
  livePulse: { fontSize: '11px', fontWeight: '800', color: '#EF4444', backgroundColor: '#FEE2E2', padding: '6px 12px', borderRadius: '20px', letterSpacing: '0.5px' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statBox: { backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #F1F5F9' },
  statLabel: { fontSize: '12px', color: '#64748B', fontWeight: '600' },
  statValue: { fontSize: '26px', fontWeight: '800', color: '#0F172A' },
  progressSection: { backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9' },
  progressInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  progressLabel: { fontSize: '13px', color: '#475569', fontWeight: '600' },
  progressValue: { fontSize: '15px', fontWeight: '700' },
  barBg: { width: '100%', height: '10px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '6px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
  emptyState: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', padding: '32px', fontSize: '14px' },

  filterConsoleCard: { backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  consoleTitle: { fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  filterInputsRow: { display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' },
  inputControlWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', flex: 2, minWidth: '180px', position: 'relative' },
  selectControlWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', flex: 1, minWidth: '150px' },
  controlIcon: { fontSize: '14px', marginRight: '8px', color: '#94A3B8' },
  textInputStyle: { padding: '9px 0', border: 'none', fontSize: '13px', outline: 'none', color: '#1E293B', width: '100%', backgroundColor: 'transparent' },
  selectInputStyle: { padding: '9px 0', border: 'none', fontSize: '13px', outline: 'none', color: '#1E293B', backgroundColor: 'transparent', width: '100%', cursor: 'pointer' },
  clearMiniX: { background: '#E2E8F0', border: 'none', borderRadius: '50%', color: '#64748B', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer', position: 'absolute', right: '10px' },

  detailGridContainer: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', width: '100%' },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '460px' },
  detailCardHeader: { paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '14px', flexShrink: 0 },
  boxTitleWithCount: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  countIndicatorTagOrange: { backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' },
  countIndicatorTagGray: { backgroundColor: '#F1F5F9', color: '#334155', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' },
  listScrollBox: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' },
  anomalyItemCard: { padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box', border: '1px solid #E2E8F0' },
  anomalyCardLine1: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  assetNameText: { fontSize: '14px', color: '#0F172A', fontWeight: '700' },
  roomBadgeMini: { backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' },
  roomBadgeMuted: { backgroundColor: '#E2E8F0', color: '#334155', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' },
  anomalyCardLine2: { fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' },
  noteReportText: { margin: '2px 0 0 0', fontStyle: 'italic', color: '#B45309', backgroundColor: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', border: '1px dashed #FDE68A' },
  subTextOwner: { margin: 0, fontSize: '12.5px', color: '#1E293B', fontWeight: '500' },

  emptySearchBox: { textAlign: 'center', padding: '30px 10px', color: '#94A3B8', fontStyle: 'italic', fontSize: '12.5px' },
  cleanStateGreen: { textAlign: 'center', padding: '24px', color: '#16A34A', backgroundColor: '#DCFCE7', borderRadius: '10px', fontSize: '12.5px', fontWeight: '600', height: 'fit-content' },
  cleanStateBlue: { textAlign: 'center', padding: '24px', color: '#2563EB', backgroundColor: '#EFF6FF', borderRadius: '10px', fontSize: '12.5px', fontWeight: '600', height: 'fit-content' }
};