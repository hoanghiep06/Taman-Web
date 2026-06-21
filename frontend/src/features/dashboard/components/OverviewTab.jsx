import React from 'react';
import { UI_COLORS } from '../../../utils/constants';

export const OverviewTab = ({ dashboardData }) => {
  if (!dashboardData) return null;

  const { current_shift, recent_incidents } = dashboardData;

  return (
    <div style={styles.container}>
      {/* KHỐI CHỈ SỐ TIẾN ĐỘ CA TRỰC */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div style={styles.titleBox}>
            <span style={styles.headerIcon}>⏱️</span>
            <h3 style={styles.cardTitle}>
              Ca Trực Hiện Tại: <span style={styles.shiftHighlight}>{current_shift.shift_type || 'Chưa mở ca'}</span>
            </h3>
          </div>
          {current_shift.status === "In Progress" && (
            <span style={styles.livePulse}>● ĐANG DIỄN RA</span>
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

      {/* BẢNG NHẬT KÝ SỰ CỐ KHẨN CẤP */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <div style={styles.titleBox}>
            <span style={styles.headerIcon}>🚨</span>
            <h3 style={styles.cardTitle}>Nhật Ký Cảnh Báo Thất Thoát Tài Sản (Đã bắn Gmail)</h3>
          </div>
        </div>
        
        {recent_incidents.length > 0 ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Ngày Ca Trực</th>
                  <th style={styles.th}>Phiên Ca</th>
                  <th style={styles.th}>Mức Độ Rủi Ro</th>
                  <th style={styles.th}>Danh Sách Vật Phẩm Cần Xử Lý Khẩn Cấp</th>
                </tr>
              </thead>
              <tbody>
                {recent_incidents.map((incident) => (
                  <tr key={incident.shift_id} style={styles.trRow}>
                    <td style={styles.tdDate}><strong>{incident.shift_date}</strong></td>
                    <td style={styles.td}>{incident.shift_type}</td>
                    <td style={styles.td}>
                      <span style={styles.alertBadge}>{incident.lost_count} vật phẩm mất</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.tagContainer}>
                        {incident.lost_assets_details.map(item => (
                          <span key={item.asset_id} style={styles.itemTag}>
                            📦 Phòng {item.room_number}: <b>{item.asset_name}</b>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>Tuyệt vời! Không ghi nhận sự cố thất thoát nào trong các ca trực gần đây.</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  mainCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' },
  titleBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerIcon: { fontSize: '20px' },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' },
  shiftHighlight: { color: '#E67E22', backgroundColor: '#FFF7ED', padding: '4px 10px', borderRadius: '8px', fontSize: '15px' },
  livePulse: { fontSize: '11px', fontWeight: '800', color: '#EF4444', backgroundColor: '#FEE2E2', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statBox: { backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #F1F5F9', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' },
  statLabel: { fontSize: '12px', color: '#64748B', fontWeight: '600' },
  statValue: { fontSize: '26px', fontWeight: '800', color: '#0F172A' },
  
  progressSection: { backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9' },
  progressInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  progressLabel: { fontSize: '13px', color: '#475569', fontWeight: '600' },
  progressValue: { fontSize: '15px', fontWeight: '700' },
  barBg: { width: '100%', height: '10px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '6px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
  
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '14px 16px', fontSize: '13px', color: '#475569', fontWeight: '700', borderBottom: '2px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' },
  td: { padding: '14px 16px', fontSize: '13px', color: '#334155', verticalAlign: 'middle' },
  tdDate: { padding: '14px 16px', fontSize: '13px', color: '#0F172A', verticalAlign: 'middle' },
  alertBadge: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'inline-block' },
  tagContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  itemTag: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#F1F5F9', color: '#1E293B', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid #E2E8F0' },
  emptyState: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', padding: '32px', fontSize: '14px' }
};