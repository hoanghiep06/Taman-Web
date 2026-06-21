import React from 'react';

export const GlobalHistoryTab = ({ 
  historyLogs, loadingHistory, historyPage, historyTotalPages, setHistoryPage,
  searchOperator, setSearchOperator, filterRoomNum, setFilterRoomNum, 
  filterStatus, setFilterStatus, onTriggerFilter, onViewImage 
}) => {
  return (
    <div style={styles.card}>
      {/* THANH CÔNG CỤ LỌC NÂNG CAO - ĐÃ FIX MÀU NỀN Ô SELECT */}
      <div style={styles.actionBar}>
        <div style={styles.inputWrapper}>
          <span style={styles.fieldIcon}>👤</span>
          <input type="text" placeholder="Tìm tên nhân viên..." value={searchOperator} onChange={(e) => setSearchOperator(e.target.value)} style={styles.inputField} />
        </div>
        <div style={styles.inputWrapperShort}>
          <span style={styles.fieldIcon}>📍</span>
          <input type="text" placeholder="Phòng..." value={filterRoomNum} onChange={(e) => setFilterRoomNum(e.target.value)} style={styles.inputFieldShort} />
        </div>
        <div style={styles.selectWrapper}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectField}>
            <option value="">Toàn bộ bộ lọc màu</option>
            <option value="Xanh">✓ Đã nộp ảnh (Xanh)</option>
            <option value="Vang">⚠️ Báo mất (Vàng)</option>
            <option value="Loi_Upload">❌ Lỗi tải ảnh (Đỏ)</option>
          </select>
        </div>
        <button onClick={onTriggerFilter} style={styles.queryBtn}>⚙️ Trích Xuất</button>
      </div>

      {loadingHistory ? (
        <div style={styles.loading}>Đang truy vấn dữ liệu từ bộ nhớ Drive...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Mốc Thời Gian Quét</th>
                <th style={styles.th}>Nhân Viên Ca Trực</th>
                <th style={styles.th}>Vị Trí</th>
                <th style={styles.th}>Vật Phẩm Vật Tư</th>
                <th style={styles.th}>Kết Quả Kiểm Kê</th>
                <th style={styles.th}>Ghi Chú Giải Trình</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>File Gốc</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.length > 0 ? (
                historyLogs.map(log => {
                  let badgeStyle = styles.badgeUnchecked, badgeText = log.status;
                  if (log.status === 'Xanh') { badgeStyle = styles.badgeSuccess; badgeText = "Đã nộp ảnh"; }
                  else if (log.status === 'Vang') { badgeStyle = styles.badgeWarning; badgeText = "Báo mất"; }
                  else if (log.status === 'Loi_Upload') { badgeStyle = styles.badgeError; badgeText = "Lỗi Upload"; }

                  return (
                    <tr key={log.log_id} style={styles.trRow}>
                      <td style={styles.tdTime}><code>{log.inspected_at}</code></td>
                      <td style={styles.td}><b>{log.operator_name}</b></td>
                      <td style={styles.td}>Phòng {log.room_number}</td>
                      <td style={styles.tdAssetName}>{log.asset_name}</td>
                      <td style={styles.td}>
                        <span style={badgeStyle}>{badgeText}</span>
                      </td>
                      <td style={styles.tdNote}>{log.note || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {log.status === 'Xanh' && log.log_id ? (
                          <button onClick={() => onViewImage(log.log_id, log.asset_name)} style={styles.actionTableBtn}>🔍 Xem file</button>
                        ) : <span style={styles.disabledText}>-</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" style={styles.emptyState}>Không tìm thấy dữ liệu tuần tra nào phù hợp với bộ lọc.</td></tr>
              )}
            </tbody>
          </table>

          {/* ĐÃ CHỈNH: Cụm phân trang thoáng đạt, chuẩn UI hiện đại */}
          <div style={styles.paginationRow}>
            <button 
              disabled={historyPage === 1} 
              onClick={() => setHistoryPage(historyPage - 1)} 
              style={historyPage === 1 ? styles.pageBtnDisabled : styles.pageBtn}
            >
              ❮ Trước
            </button>
            <span style={styles.pageIndicator}>Trang <b>{historyPage}</b> / {historyTotalPages}</span>
            <button 
              disabled={historyPage === historyTotalPages} 
              onClick={() => setHistoryPage(historyPage + 1)} 
              style={historyPage === historyTotalPages ? styles.pageBtnDisabled : styles.pageBtn}
            >
              Sau ❯
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  actionBar: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
  
  // Custom wrapper sửa lỗi giao diện thô của form
  inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', flex: 2, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' },
  inputWrapperShort: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', width: '120px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' },
  selectWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', flex: 1 },
  
  fieldIcon: { fontSize: '13px', marginRight: '6px', color: '#94A3B8' },
  inputField: { padding: '10px 0', border: 'none', fontSize: '13px', outline: 'none', color: '#1E293B', width: '100%', backgroundColor: 'transparent' },
  inputFieldShort: { padding: '10px 0', border: 'none', fontSize: '13px', outline: 'none', color: '#1E293B', width: '100%', backgroundColor: 'transparent' },
  selectField: { padding: '10px 12px', border: 'none', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#1E293B', backgroundColor: '#FFFFFF', width: '100%', cursor: 'pointer' },
  
  queryBtn: { padding: '10px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '14px 16px', color: '#475569', fontWeight: '700', borderBottom: '2px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' },
  tdTime: { padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' },
  td: { padding: '14px 16px', color: '#334155' },
  tdAssetName: { padding: '14px 16px', color: '#0F172A', fontWeight: '600' },
  tdNote: { padding: '14px 16px', color: '#64748B', fontStyle: 'italic' },
  
  badgeSuccess: { backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  badgeWarning: { backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  badgeError: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  
  actionTableBtn: { padding: '4px 10px', backgroundColor: '#FFFFFF', color: '#0284C7', border: '1px solid #BAE6FE', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  disabledText: { color: '#CBD5E1' },
  
  // Custom cụm phân trang cao cấp
  paginationRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', padding: '8px' },
  pageBtn: { padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#334155', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'all 0.15s' },
  pageBtnDisabled: { padding: '8px 16px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#94A3B8', fontSize: '13px', cursor: 'not-allowed' },
  pageIndicator: { fontSize: '13px', color: '#475569' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' },
  emptyState: { textAlign: 'center', padding: '32px', color: '#94A3B8', fontStyle: 'italic' }
};