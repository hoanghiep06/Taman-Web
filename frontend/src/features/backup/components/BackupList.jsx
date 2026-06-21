import React from 'react';

// Đổi prop `onRestoreDrive` thành `onOpenRestoreModalWithId`
export const BackupList = ({ backups, loading, onOpenRestoreModalWithId }) => {
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div style={styles.loading}>Đang kết nối với Google Drive...</div>;

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>☁️ Các Bản Sao Lưu Đám Mây (Google Drive)</h3>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>Tên Tệp Tin</th>
            <th style={styles.th}>Kích Thước</th>
            <th style={styles.th}>Google Drive ID</th>
            <th style={{...styles.th, textAlign: 'right'}}>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {backups.length > 0 ? (
            backups.map((bk, idx) => (
              <tr key={idx} style={styles.trRow}>
                <td style={styles.tdBold}>📄 {bk.name}</td>
                <td style={styles.tdSize}>{formatBytes(bk.size)}</td>
                <td style={styles.tdId}><code>{bk.id}</code></td>
                <td style={styles.tdActions}>
                  {/* Gọi hàm mở Modal thay vì gọi API khôi phục trực tiếp */}
                  <button style={styles.restoreBtn} onClick={() => onOpenRestoreModalWithId(bk.id)}>
                    ⚡ Chọn bản này
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4" style={styles.empty}>Không tìm thấy bản sao lưu nào trên hệ thống.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  wrapper: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  title: { margin: 0, padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#0F172A', fontSize: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  thRow: { backgroundColor: '#F8FAFC' },
  th: { padding: '12px 20px', color: '#475569', borderBottom: '1px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9' },
  tdBold: { padding: '14px 20px', color: '#0F172A', fontWeight: '600' },
  tdSize: { padding: '14px 20px', color: '#059669', fontWeight: 'bold' },
  tdId: { padding: '14px 20px', color: '#64748B', fontSize: '12px' },
  tdActions: { padding: '14px 20px', textAlign: 'right' },
  restoreBtn: { padding: '8px 16px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  empty: { textAlign: 'center', padding: '30px', color: '#94A3B8', fontStyle: 'italic' },
  loading: { textAlign: 'center', padding: '40px', color: '#64748B' }
};