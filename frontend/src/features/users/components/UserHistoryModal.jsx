import React, { useState, useEffect } from 'react';
import { usersApi } from '../api/usersApi';

export const UserHistoryModal = ({ isOpen, onClose, user }) => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inspection'); // 3 tabs: inspection | login | audit

  useEffect(() => {
    if (isOpen && user) {
      setActiveTab('inspection'); // Reset tab khi mở
      fetchComprehensiveHistory();
    } else {
      setHistoryData(null);
    }
  }, [isOpen, user]);

  const fetchComprehensiveHistory = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getComprehensiveHistory(user.id);
      setHistoryData(data);
    } catch (err) {
      console.error("Lỗi tải lịch sử tổng hợp:", err);
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Hồ Sơ Hoạt Động Chi Tiết</h3>
            <p style={styles.subtitle}>
              Nhân sự: <b style={{color: '#1D4ED8'}}>{user.full_name}</b> (<code>{user.username}</code>) 
              {historyData && ` - Đã tải ${historyData.statistics?.loaded_limit} bản ghi gần nhất`}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* TAB NAVIGATION */}
        <div style={styles.tabContainer}>
          <button 
            style={activeTab === 'inspection' ? styles.tabActive : styles.tabInactive} 
            onClick={() => setActiveTab('inspection')}
          >
            📋 Lịch Trình Kiểm Kê
          </button>
          <button 
            style={activeTab === 'login' ? styles.tabActive : styles.tabInactive} 
            onClick={() => setActiveTab('login')}
          >
            🔐 Lịch Sử Đăng Nhập
          </button>
          <button 
            style={activeTab === 'audit' ? styles.tabActive : styles.tabInactive} 
            onClick={() => setActiveTab('audit')}
          >
            ⚙️ Vết Hệ Thống (Audit)
          </button>
        </div>

        {/* BODY TƯƠNG ỨNG VỚI TỪNG TAB */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.loading}>Đang trích xuất dữ liệu toàn diện từ máy chủ...</div>
          ) : !historyData ? (
            <div style={styles.emptyState}>Không thể tải dữ liệu cho nhân sự này.</div>
          ) : (
            <div style={styles.tableWrapper}>
              
              {/* TAB 1: NHẬT KÝ ĐI TUẦN */}
              {activeTab === 'inspection' && (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Thời Gian Quét</th>
                      <th style={styles.th}>Phiên Ca Trực</th>
                      <th style={styles.th}>Phòng - Đồ Vật</th>
                      <th style={styles.th}>Kết Quả</th>
                      <th style={styles.th}>Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.inspection_history?.length > 0 ? (
                      historyData.inspection_history.map((log) => {
                        let badgeStyle = styles.badgeUnchecked, badgeText = log.status;
                        if (log.status === 'Xanh') { badgeStyle = styles.badgeSuccess; badgeText = "Đã nộp ảnh"; }
                        else if (log.status === 'Vang') { badgeStyle = styles.badgeWarning; badgeText = "Báo mất"; }
                        else if (log.status === 'Loi_Upload') { badgeStyle = styles.badgeError; badgeText = "Lỗi Upload"; }

                        return (
                          <tr key={log.log_id} style={styles.trRow}>
                            <td style={styles.tdTime}>{log.inspected_at}</td>
                            <td style={styles.td}>
                              {log.shift_date} <br/> 
                              <span style={styles.shiftTag}>{log.shift_type}</span>
                            </td>
                            <td style={styles.td}>
                              <b>P.{log.room_number}</b> - {log.asset_name}
                            </td>
                            <td style={styles.td}>
                              <span style={badgeStyle}>{badgeText}</span>
                            </td>
                            <td style={styles.tdNote}>{log.note || '-'}</td>
                          </tr>
                        );
                      })
                    ) : (<tr><td colSpan="5" style={styles.emptyState}>Chưa có lượt kiểm kê nào.</td></tr>)}
                  </tbody>
                </table>
              )}

              {/* TAB 2: LỊCH SỬ ĐĂNG NHẬP */}
              {activeTab === 'login' && (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Thời Gian (VN)</th>
                      <th style={styles.th}>Địa chỉ IP</th>
                      <th style={styles.th}>Thiết bị / Trình duyệt (User Agent)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.login_history?.length > 0 ? (
                      historyData.login_history.map((log) => (
                        <tr key={log.id} style={styles.trRow}>
                          <td style={styles.tdTime}>{log.login_at}</td>
                          <td style={styles.tdBold}>{log.ip_address}</td>
                          <td style={styles.tdNote}>{log.user_agent}</td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan="3" style={styles.emptyState}>Chưa có lịch sử đăng nhập.</td></tr>)}
                  </tbody>
                </table>
              )}

              {/* TAB 3: AUDIT LOGS (VẾT HỆ THỐNG) */}
              {activeTab === 'audit' && (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Thời Điểm</th>
                      <th style={styles.th}>Hành Động Cốt Lõi</th>
                      <th style={styles.th}>Mã Mục Tiêu (Target)</th>
                      <th style={styles.th}>Chi tiết Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.audit_history?.length > 0 ? (
                      historyData.audit_history.map((log) => (
                        <tr key={log.id} style={styles.trRow}>
                          <td style={styles.tdTime}>{log.created_at}</td>
                          <td style={styles.tdBold}>
                            <span style={styles.actionTag}>{log.action}</span>
                          </td>
                          <td style={styles.td}>{log.target_id || '-'}</td>
                          <td style={styles.tdCode}>{log.payload ? JSON.stringify(log.payload) : '-'}</td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan="4" style={styles.emptyState}>Chưa có vết thao tác hệ thống.</td></tr>)}
                  </tbody>
                </table>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: '950px', maxHeight: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: '#F8FAFC' },
  title: { margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' },
  subtitle: { margin: '6px 0 0 0', fontSize: '14px', color: '#64748B' },
  closeBtn: { background: 'none', border: 'none', fontSize: '22px', color: '#94A3B8', cursor: 'pointer', fontWeight: 'bold' },
  
  // Tabs Style
  tabContainer: { display: 'flex', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 24px', gap: '2px' },
  tabActive: { padding: '12px 20px', backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderBottom: 'none', borderRadius: '8px 8px 0 0', fontWeight: '700', fontSize: '14px', cursor: 'pointer', position: 'relative', top: '1px' },
  tabInactive: { padding: '12px 20px', backgroundColor: 'transparent', color: '#64748B', border: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' },
  
  body: { padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#FFFFFF' },
  
  tableWrapper: { overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#F1F5F9' },
  th: { padding: '14px 16px', color: '#475569', fontWeight: '700', borderBottom: '1px solid #E2E8F0' },
  trRow: { borderBottom: '1px solid #F1F5F9' },
  
  tdTime: { padding: '14px 16px', color: '#0F172A', fontWeight: '600', fontFamily: 'monospace' },
  td: { padding: '14px 16px', color: '#334155' },
  tdBold: { padding: '14px 16px', color: '#0F172A', fontWeight: '700' },
  tdNote: { padding: '14px 16px', color: '#64748B', fontStyle: 'italic', maxWidth: '300px' },
  tdCode: { padding: '14px 16px', color: '#0284C7', fontFamily: 'monospace', fontSize: '11px', maxWidth: '250px', wordWrap: 'break-word' },
  
  shiftTag: { backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  actionTag: { backgroundColor: '#FEFCE8', color: '#A16207', padding: '4px 8px', borderRadius: '4px', border: '1px solid #FEF08A', fontSize: '11px', fontWeight: 'bold' },
  
  badgeSuccess: { backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  badgeWarning: { backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  badgeError: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  badgeUnchecked: { backgroundColor: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  
  loading: { textAlign: 'center', padding: '60px', color: '#64748B', fontSize: '15px' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94A3B8', fontStyle: 'italic' }
};