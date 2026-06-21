import React from 'react';

export const SecurityLogsTab = ({ loginLogs, loadingLogs }) => {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.headerIcon}>🔒</span>
        <h3 style={styles.cardTitleInner}>Nhật Ký Xác Thực Hệ Thống & Giám Sát Thiết Bị Đầu Cuối</h3>
      </div>
      
      {loadingLogs ? (
        <div style={styles.loading}>Đang rà soát lịch sử bảo mật cổng mạng LAN...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ ...styles.th, width: '20%' }}>Thời Gian Ghi Nhận</th>
                <th style={{ ...styles.th, width: '15%' }}>Mã Tài Khoản</th>
                <th style={{ ...styles.th, width: '20%' }}>Họ Và Tên Nhân Sự</th>
                <th style={{ ...styles.th, width: '15%' }}>Địa Chỉ IP Client</th>
                <th style={{ ...styles.th, width: '30%' }}>Thông Số Thiết Bị / Cấu Hình Trình Duyệt (User-Agent)</th>
              </tr>
            </thead>
            <tbody>
              {loginLogs.length > 0 ? (
                loginLogs.map(log => (
                  <tr key={log.id} style={styles.trRow}>
                    <td style={styles.tdTime}><code>{log.login_time}</code></td>
                    <td style={styles.tdCode}><code>{log.username}</code></td>
                    <td style={styles.tdName}>{log.full_name}</td>
                    <td style={styles.td}><span style={styles.ipBadge}>{log.ip_address}</span></td>
                    <td style={styles.tdUA}>{log.user_agent || 'Không bóc tách được thông số'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={styles.emptyTable}>Hệ thống an toàn. Chưa ghi nhận phiên hoạt động đăng nhập nào mới.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' },
  headerIcon: { fontSize: '18px' },
  cardTitleInner: { margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: '700' },
  
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '12px 16px', color: '#475569', fontWeight: '700', borderBottom: '2px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' },
  
  tdTime: { padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' },
  tdCode: { padding: '14px 16px', color: '#0284C7', fontFamily: 'monospace' },
  tdName: { padding: '14px 16px', color: '#0F172A', fontWeight: '700' },
  td: { padding: '14px 16px', color: '#334155' },
  tdUA: { padding: '14px 16px', fontSize: '12px', color: '#64748B', lineHeight: '1.4' },
  
  ipBadge: { backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: '700', border: '1px solid #DBEAFE', display: 'inline-block' },
  loading: { padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' },
  emptyTable: { textAlign: 'center', padding: '32px', color: '#94A3B8', fontStyle: 'italic' }
};