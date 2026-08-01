import { useState, useEffect } from 'react';
import { usersApi } from '../api/usersApi';
import { Modal } from '../../../components/Modal';
import { TabBar } from '../../../components/TabBar';
import styles from './UserHistoryModal.module.css';

const TABS = [
  { key: 'inspection', label: '📋 Lịch Trình Kiểm Kê' },
  { key: 'login', label: '🔐 Lịch Sử Đăng Nhập' },
  { key: 'audit', label: '⚙️ Vết Hệ Thống (Audit)' },
];

export const UserHistoryModal = ({ isOpen, onClose, user }) => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inspection');

  useEffect(() => {
    if (isOpen && user) {
      setActiveTab('inspection'); // Reset tab khi mở
      fetchComprehensiveHistory();
    } else {
      setHistoryData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchComprehensiveHistory = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getComprehensiveHistory(user.id);
      setHistoryData(data);
    } catch (err) {
      console.error('Lỗi tải lịch sử tổng hợp:', err);
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Hồ Sơ Hoạt Động Chi Tiết"
      subtitle={
        <>
          Nhân sự: <b className={styles.highlight}>{user.full_name}</b> (<code>{user.username}</code>)
          {historyData && ` - Đã tải ${historyData.statistics?.loaded_limit} bản ghi gần nhất`}
        </>
      }
    >
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} variant="underline" />

      <div className={styles.tabBody}>
        {loading ? (
          <div className={styles.loading}>Đang trích xuất dữ liệu toàn diện từ máy chủ...</div>
        ) : !historyData ? (
          <div className={styles.emptyState}>Không thể tải dữ liệu cho nhân sự này.</div>
        ) : (
          <div className={styles.tableWrapper}>
            {activeTab === 'inspection' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Thời Gian Quét</th>
                    <th className={styles.th}>Phiên Ca Trực</th>
                    <th className={styles.th}>Phòng - Đồ Vật</th>
                    <th className={styles.th}>Kết Quả</th>
                    <th className={styles.th}>Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.inspection_history?.length > 0 ? (
                    historyData.inspection_history.map((log) => {
                      let badgeClass = styles.badgeUnchecked,
                        badgeText = log.status;
                      if (log.status === 'Xanh') {
                        badgeClass = styles.badgeSuccess;
                        badgeText = 'Đã nộp ảnh';
                      } else if (log.status === 'Vang') {
                        badgeClass = styles.badgeWarning;
                        badgeText = 'Báo mất';
                      } else if (log.status === 'Loi_Upload') {
                        badgeClass = styles.badgeError;
                        badgeText = 'Lỗi Upload';
                      }

                      return (
                        <tr key={log.log_id} className={styles.trRow}>
                          <td className={styles.tdTime}>{log.inspected_at}</td>
                          <td className={styles.td}>
                            {log.shift_date} <br />
                            <span className={styles.shiftTag}>{log.shift_type}</span>
                          </td>
                          <td className={styles.td}>
                            <b>P.{log.room_number}</b> - {log.asset_name}
                          </td>
                          <td className={styles.td}>
                            <span className={badgeClass}>{badgeText}</span>
                          </td>
                          <td className={styles.tdNote}>{log.note || '-'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.emptyState}>
                        Chưa có lượt kiểm kê nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'login' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Thời Gian (VN)</th>
                    <th className={styles.th}>Địa chỉ IP</th>
                    <th className={styles.th}>Thiết bị / Trình duyệt (User Agent)</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.login_history?.length > 0 ? (
                    historyData.login_history.map((log) => (
                      <tr key={log.id} className={styles.trRow}>
                        <td className={styles.tdTime}>{log.login_at}</td>
                        <td className={styles.tdBold}>{log.ip_address}</td>
                        <td className={styles.tdNote}>{log.user_agent}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className={styles.emptyState}>
                        Chưa có lịch sử đăng nhập.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'audit' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Thời Điểm</th>
                    <th className={styles.th}>Hành Động Cốt Lõi</th>
                    <th className={styles.th}>Mã Mục Tiêu (Target)</th>
                    <th className={styles.th}>Chi tiết Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.audit_history?.length > 0 ? (
                    historyData.audit_history.map((log) => (
                      <tr key={log.id} className={styles.trRow}>
                        <td className={styles.tdTime}>{log.created_at}</td>
                        <td className={styles.tdBold}>
                          <span className={styles.actionTag}>{log.action}</span>
                        </td>
                        <td className={styles.td}>{log.target_id || '-'}</td>
                        <td className={styles.tdCode}>{log.payload ? JSON.stringify(log.payload) : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className={styles.emptyState}>
                        Chưa có vết thao tác hệ thống.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};