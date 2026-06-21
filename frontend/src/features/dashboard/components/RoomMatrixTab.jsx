import React from 'react';

export const RoomMatrixTab = ({ rooms, selectedRoomId, onSelectRoom, loadingAssets, groupedAssets, assetStatuses, onViewImage }) => {
  return (
    <div style={styles.splitLayout}>
      {/* SIDEBAR CHỌN PHÒNG BÊN TRÁI */}
      <div style={styles.roomSidebar}>
        <div style={styles.sidebarHeader}>📍 Danh Sách Khu Vực</div>
        <div style={styles.roomList}>
          {rooms.map(room => {
            const isSelected = selectedRoomId === room.id;
            return (
              <div 
                key={room.id} 
                style={isSelected ? styles.roomItemActive : styles.roomItem} 
                onClick={() => onSelectRoom(room.id)}
              >
                <div style={styles.roomMainLine}>
                  <span style={isSelected ? styles.roomNumActive : styles.roomNum}>Phòng {room.room_number}</span>
                </div>
                <span style={styles.roomDesc}>{room.description || 'Không có mô tả chi tiết'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MA TRẬN TRẠNG THÁI CHI TIẾT BÊN PHẢI */}
      <div style={styles.roomContent}>
        {loadingAssets ? (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner}></div>
            <span style={{ marginTop: '12px', color: '#64748B' }}>Đang bóc tách trạng thái phòng dữ liệu...</span>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: '35%' }}>Tên Vật Tư / Tài Sản</th>
                  <th style={{ ...styles.th, width: '25%' }}>Trạng Thái Tuần Tra</th>
                  <th style={{ ...styles.th, width: '25%' }}>Ghi Chú Lý Do Giải Trình</th>
                  <th style={{ ...styles.th, width: '15%', textAlign: 'center' }}>Hành Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedAssets).length > 0 ? (
                  Object.keys(groupedAssets).map((elderName, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {/* Dòng tên Cụ hiển thị sang trọng */}
                      <tr style={styles.elderGroupRow}>
                        <td colSpan="4" style={styles.elderGroupName}>
                          <span style={styles.elderIcon}>👤</span> {elderName}
                        </td>
                      </tr>
                      
                      {groupedAssets[elderName].map((asset) => {
                        const currentStatus = assetStatuses[asset.id] || { status: 'Unchecked' };
                        let badgeStyle = styles.badgeUnchecked, badgeText = "🚨 Chưa sờ tới", canViewImage = false;

                        if (currentStatus.status === 'Checked') { 
                          badgeStyle = styles.badgeChecked; 
                          badgeText = `🟢 Đã kiểm kê (${currentStatus.time})`; 
                          canViewImage = true; 
                        } else if (currentStatus.status === 'Missing') { 
                          badgeStyle = styles.badgeMissing; 
                          badgeText = `🟡 Báo thất thoát (${currentStatus.time})`; 
                          canViewImage = true; 
                        } else if (currentStatus.status === 'Processing') {
                          badgeStyle = styles.badgeProcessing;
                          badgeText = `⚪ Đang tải lên Drive...`;
                        } else if (currentStatus.status === 'Error') {
                          badgeStyle = styles.badgeError;
                          badgeText = `🔴 Ảnh lỗi, cần quét lại`;
                        }

                        return (
                          <tr key={asset.id} style={styles.trRow}>
                            <td style={styles.tdAssetName}>
                              <span style={styles.treeLine}>↳</span> {asset.asset_name}
                            </td>
                            <td style={styles.td}>
                              <span style={badgeStyle}>{badgeText}</span>
                            </td>
                            <td style={styles.tdNote}>{currentStatus.note || '-'}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {canViewImage && currentStatus.log_id ? (
                                <button 
                                  onClick={() => onViewImage(currentStatus.log_id, asset.asset_name)} 
                                  style={styles.actionTableBtn}
                                >
                                  🖼️ Xem Ảnh
                                </button>
                              ) : (
                                <span style={styles.disabledText}>Không có file</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  <tr><td colSpan="4" style={styles.emptyTable}>Khu vực này hiện chưa được cấu hình danh mục vật tư tài sản.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  splitLayout: { display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' },
  roomSidebar: { width: '260px', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' },
  sidebarHeader: { fontSize: '14px', fontWeight: '700', color: '#475569', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' },
  roomList: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' },
  
  roomItem: { padding: '12px', borderRadius: '10px', border: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: '#FFFFFF', transition: 'all 0.2s' },
  roomItemActive: { padding: '12px', borderRadius: '10px', border: '1px solid #93C5FD', cursor: 'pointer', backgroundColor: '#EFF6FF', boxShadow: '0 2px 4px rgba(37,99,235,0.04)' },
  roomMainLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  roomNum: { fontSize: '14px', fontWeight: '600', color: '#334155' },
  roomNumActive: { fontSize: '14px', fontWeight: '700', color: '#1D4ED8' },
  roomDesc: { display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  roomContent: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', overflowY: 'auto' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '12px 16px', fontSize: '13px', color: '#475569', fontWeight: '700', borderBottom: '2px solid #E2E8F0' },
  
  elderGroupRow: { backgroundColor: '#F1F5F9' },
  elderGroupName: { padding: '10px 16px', fontSize: '13px', fontWeight: '700', color: '#1E293B' },
  elderIcon: { marginRight: '6px' },
  
  trRow: { borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' },
  tdAssetName: { padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#1F2937' },
  treeLine: { color: '#CBD5E1', marginRight: '4px' },
  td: { padding: '14px 16px', fontSize: '13px', color: '#334155' },
  tdNote: { padding: '14px 16px', fontSize: '13px', color: '#64748B', fontStyle: 'italic' },
  
  // Tinh chỉnh hệ thống Badge 5 mức sạch sẽ
  badgeUnchecked: { backgroundColor: '#FEF2F2', color: '#991B1B', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #FEE2E2' },
  badgeChecked: { backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #BBF7D0' },
  badgeMissing: { backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #FDE68A' },
  badgeProcessing: { backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #DBEAFE' },
  badgeError: { backgroundColor: '#FFF5F5', color: '#E53E3E', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #FED7D7' },

  actionTableBtn: { padding: '5px 12px', backgroundColor: '#FFFFFF', color: '#0284C7', border: '1px solid #BAE6FE', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' },
  disabledText: { color: '#CBD5E1', fontSize: '12px' },
  loadingWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' },
  emptyTable: { textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic', fontSize: '13px' }
};